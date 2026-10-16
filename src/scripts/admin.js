/**
 * Shad11t — админ-панель (/admin).
 * Безопасная аутентификация без хранения паролей в GitHub.
 * Управление проектами (CRUD), публикация в репозиторий через GitHub API / Gist.
 */

import { $, $$, esc, toast, copyText } from './utils.js';
import { loadProjects, getOverlay, saveOverlay, clearOverlay, mergedForPublish, gistURL } from './store.js';
import { coverURL } from './covers.js';
import { hashPassword, safeEqual, randomSalt } from './hash-client.js';
import { publishToGitHub, createGist, updateGist, readRepoFile, writeRepoFile } from './github.js';
import site from '../data/site.json';
import { sfx } from './audio.js';

const SESSION_KEY = 'shad11t_admin_session_v2';
const MASTER_AUTH_KEY = 'shad11t_admin_master_v2';
const GH_KEY = 'shad11t_gh_cfg';
const GH_TOKEN_KEY = 'shad11t_gh_token';
const GH_TOKEN_LOCAL = 'shad11t_gh_token_local';
const GIST_PENDING_KEY = 'shad11t_gist_pending';
const SESSION_TTL = 12 * 3600 * 1000;

function slugify(s) {
  return (
    String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9а-яё-]/gi, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `project-${Date.now().toString(36)}`
  );
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function initAdmin() {
  const root = $('#admin-root');
  if (!root) return () => {};
  const cleanups = [];
  const on = (el, ev, fn) => {
    if (!el) return;
    el.addEventListener(ev, fn);
    cleanups.push(() => el.removeEventListener(ev, fn));
  };

  /* ---------- auth state ---------- */
  function getMasterAuth() {
    try {
      const raw = localStorage.getItem(MASTER_AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.hash && parsed?.salt) return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function saveMasterAuth(user, pass) {
    const salt = randomSalt();
    const hash = hashPassword(pass, salt, 100000);
    const data = { user: user || 'shad11t', salt, iterations: 100000, hash };
    localStorage.setItem(MASTER_AUTH_KEY, JSON.stringify(data));
    return data;
  }

  function isAuthed() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return s && Date.now() - s.ts < SESSION_TTL;
    } catch {
      return false;
    }
  }

  const loginBox = $('#admin-login');
  const panel = $('#admin-panel');
  const setupGroup = $('#setup-pass-group');
  const regularGroup = $('#regular-pass-group');
  const loginTitle = $('#login-title');
  const loginDesc = $('#login-desc');
  const loginSubmitLabel = $('#btn-login-label');

  let currentAuth = getMasterAuth();

  function updateLoginUI() {
    currentAuth = getMasterAuth();
    if (!currentAuth) {
      if (setupGroup) setupGroup.classList.remove('hidden');
      if (regularGroup) regularGroup.classList.add('hidden');
      if (loginTitle) loginTitle.textContent = 'Первоначальная настройка';
      if (loginDesc) loginDesc.textContent = 'Установите мастер-пароль. Он сохранится только в этом браузере и никогда не попадет на GitHub.';
      if (loginSubmitLabel) loginSubmitLabel.textContent = 'Установить пароль и войти';
    } else {
      if (setupGroup) setupGroup.classList.add('hidden');
      if (regularGroup) regularGroup.classList.remove('hidden');
      if (loginTitle) loginTitle.textContent = 'Вход в панель';
      if (loginDesc) loginDesc.textContent = 'Введите пароль администратора или GitHub Token';
      if (loginSubmitLabel) loginSubmitLabel.textContent = 'Войти';
    }
  }

  updateLoginUI();

  function showPanel() {
    loginBox?.classList.add('hidden');
    panel?.classList.remove('hidden');
    bootPanel();
  }

  const loginForm = $('#login-form');
  on(loginForm, 'submit', (e) => {
    e.preventDefault();
    const user = $('#login-user')?.value.trim() || 'shad11t';
    const err = $('#login-error');

    if (!currentAuth) {
      // Режим первой настройки
      const p1 = $('#setup-pass')?.value || '';
      const p2 = $('#setup-pass-confirm')?.value || '';
      if (p1.length < 6) {
        if (err) err.textContent = 'Пароль должен содержать минимум 6 символов';
        return;
      }
      if (p1 !== p2) {
        if (err) err.textContent = 'Пароли не совпадают';
        return;
      }
      saveMasterAuth(user, p1);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
      if (err) err.textContent = '';
      try { sfx('success'); } catch { /* ignore */ }
      toast('Мастер-пароль успешно установлен локально');
      showPanel();
      return;
    }

    // Режим входа
    const pass = $('#login-pass')?.value || '';
    let ok = false;

    // 1. Проверка по локальному мастер-паролю
    try {
      ok = (user === currentAuth.user || user === 'shad11t') && safeEqual(hashPassword(pass, currentAuth.salt, currentAuth.iterations), currentAuth.hash);
    } catch {
      ok = false;
    }

    // 2. Альтернативный вход по GitHub PAT
    if (!ok && pass.startsWith('ghp_') || pass.startsWith('github_pat_')) {
      ok = true;
      sessionStorage.setItem(GH_TOKEN_KEY, pass);
    }

    if (ok) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
      if (err) err.textContent = '';
      try { sfx('success'); } catch { /* ignore */ }
      toast('Вход выполнен');
      showPanel();
    } else {
      try { sfx('error'); } catch { /* ignore */ }
      if (err) err.textContent = 'Неверный пароль. Попробуйте снова.';
      loginBox?.classList.remove('shake');
      void loginBox?.offsetWidth;
      loginBox?.classList.add('shake');
    }
  });

  on($('#btn-logout'), 'click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  });

  /* ---------- panel logic ---------- */
  let booted = false;
  let data = { projects: [], baseIds: new Set(), overlay: getOverlay() };
  let editingId = null;

  async function refresh() {
    try {
      data = await loadProjects();
    } catch {
      toast('Не удалось загрузить projects.json', 'err');
      data = { projects: [], baseIds: new Set(), overlay: getOverlay() };
    }
    renderSummary();
    renderList();
    renderOrder();
  }

  function renderSummary() {
    const el = $('#ov-summary');
    if (!el) return;
    const ov = data.overlay;
    const a = ov.added.length;
    const e = Object.keys(ov.edited).length;
    const d = ov.deleted.length;
    el.innerHTML = `
      <span class="chip chip-bone">В репозитории: <b class="text-bone">${data.baseIds.size}</b></span>
      <span class="chip">+ Новых: <b>${a}</b></span>
      <span class="chip">~ Изменено: <b>${e}</b></span>
      ${d ? `<span class="chip !border-blood/50 !bg-blood/10 !text-blood">− Удалено: <b>${d}</b></span>` : ''}
    `;
  }

  function overlayMark(id) {
    const ov = data.overlay;
    if (ov.added.some((p) => String(p.id) === id)) return '<span class="chip ml-2 !py-0.5 !text-[10px]">новый</span>';
    if (ov.edited[id]) return '<span class="chip chip-bone ml-2 !py-0.5 !text-[10px]">изменён</span>';
    return '';
  }

  function renderList() {
    const list = $('#admin-list');
    if (!list) return;
    if (!data.projects.length) {
      list.innerHTML = '<p class="font-mono border border-dashed border-white/15 p-8 text-center text-[13px] text-sage">Проектов нет. Нажмите «Новый проект», чтобы добавить.</p>';
      return;
    }
    list.innerHTML = data.projects
      .map((p) => {
        const thumb = p.image ? esc(p.image) : coverURL(p.id, p.title, p.category);
        return `
      <div class="flex items-center gap-4 border border-white/10 bg-abyss p-3 transition-colors hover:border-phos/40" data-row="${esc(p.id)}">
        <img src="${thumb}" alt="" class="h-14 w-24 shrink-0 object-cover" loading="lazy">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-bold text-bone">${esc(p.title)}${overlayMark(String(p.id))}</p>
          <p class="font-mono mt-0.5 truncate text-[11px] text-sage">${esc(p.id)} · ${esc(p.category)} · ${esc(p.date || '—')}</p>
        </div>
        <button type="button" data-act="feat" title="В топ / убрать" class="flex h-9 w-9 shrink-0 items-center justify-center border transition-colors ${p.featured ? 'border-gold/60 text-gold' : 'border-white/15 text-sage hover:text-gold'}">★</button>
        <button type="button" data-act="edit" class="font-mono hidden shrink-0 border border-white/15 px-3 py-2 text-[11px] tracking-widest uppercase hover:border-phos hover:text-phos sm:block">Редактировать</button>
        <button type="button" data-act="del" title="Удалить" class="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 text-sage transition-colors hover:border-blood hover:text-blood">✕</button>
      </div>`;
      })
      .join('');
  }

  on($('#admin-list'), 'click', (e) => {
    const btn = e.target.closest('[data-act]');
    const row = e.target.closest('[data-row]');
    if (!btn || !row) return;
    const id = row.dataset.row;
    const act = btn.dataset.act;
    if (act === 'edit') startEdit(id);
    else if (act === 'del') removeProject(id);
    else if (act === 'feat') toggleFeatured(id);
  });

  function toggleFeatured(id) {
    const p = data.projects.find((x) => String(x.id) === id);
    if (!p) return;
    applySave({ ...p, featured: !p.featured }, true);
    toast(p.featured ? 'Убран из топа' : 'Добавлен в топ', 'info');
  }

  function removeProject(id) {
    const p = data.projects.find((x) => String(x.id) === id);
    if (!p) return;
    if (!window.confirm(`Удалить проект «${p.title}»?`)) return;
    const ov = getOverlay();
    if (data.baseIds.has(id)) {
      if (!ov.deleted.includes(id)) ov.deleted.push(id);
      delete ov.edited[id];
    } else {
      ov.added = ov.added.filter((x) => String(x.id) !== id);
    }
    ov.order = ov.order.filter((x) => String(x) !== id);
    saveOverlay(ov);
    refresh();
    toast('Проект удалён');
  }

  /* ---------- editor ---------- */
  function switchTab(name) {
    $$('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== name));
  }
  on(root, 'click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) switchTab(b.dataset.tab);
  });

  function fillForm(p) {
    $('#f-title').value = p?.title || '';
    $('#f-id').value = p?.id || '';
    $('#f-category').value = p?.category || 'other';
    $('#f-date').value = p?.date || todayISO();
    $('#f-featured').checked = Boolean(p?.featured);
    $('#f-image').value = p?.image || '';
    $('#f-link').value = p?.link || '';
    $('#f-tags').value = (p?.tags || []).join(', ');
    $('#f-description').value = p?.description || '';
    updatePreview();
  }

  function startEdit(id) {
    const p = data.projects.find((x) => String(x.id) === id);
    if (!p) return;
    editingId = id;
    $('#editor-title').textContent = `Редактирование: ${p.title}`;
    $('#f-id').readOnly = true;
    fillForm(p);
    switchTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startNew() {
    editingId = null;
    $('#editor-title').textContent = 'Новый проект';
    $('#f-id').readOnly = false;
    fillForm(null);
    switchTab('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('#f-title')?.focus();
  }

  on($('#btn-new'), 'click', startNew);
  on($('#btn-cancel'), 'click', () => switchTab('projects'));

  function updatePreview() {
    const box = $('#cover-preview-box');
    if (!box) return;
    const img = $('#f-image')?.value.trim();
    const title = $('#f-title')?.value.trim() || 'Без названия';
    const cat = $('#f-category')?.value || 'other';
    const id = $('#f-id')?.value.trim() || slugify(title);
    const src = img || coverURL(id, title, cat);
    box.innerHTML = `<img src="${esc(src)}" alt="" class="h-32 w-full object-cover">`;
  }

  ['#f-title', '#f-category', '#f-image', '#f-id'].forEach((sel) => {
    on($(sel), 'input', updatePreview);
    on($(sel), 'change', updatePreview);
  });

  function applySave(project, silent = false) {
    const ov = getOverlay();
    const isBase = data.baseIds.has(project.id);
    if (isBase) {
      ov.edited[project.id] = project;
      ov.deleted = ov.deleted.filter((x) => String(x) !== project.id);
    } else {
      const idx = ov.added.findIndex((x) => String(x.id) === project.id);
      if (idx >= 0) ov.added[idx] = project;
      else ov.added.push(project);
    }
    if (!ov.order.includes(project.id)) ov.order.push(project.id);
    saveOverlay(ov);
    refresh();
    if (!silent) toast('Сохранено локально');
  }

  on($('#project-form'), 'submit', (e) => {
    e.preventDefault();
    const title = $('#f-title')?.value.trim();
    if (!title) {
      toast('Укажите название проекта', 'err');
      return;
    }
    const id = editingId || $('#f-id')?.value.trim() || slugify(title);
    const category = $('#f-category')?.value || 'other';
    const date = $('#f-date')?.value || todayISO();
    const featured = Boolean($('#f-featured')?.checked);
    const image = $('#f-image')?.value.trim() || '';
    const link = $('#f-link')?.value.trim() || '';
    const tags = ($('#f-tags')?.value || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const description = $('#f-description')?.value.trim() || '';

    const p = { id, title, category, date, featured, image, link, tags, description };
    applySave(p);
    switchTab('projects');
  });

  /* ---------- order ---------- */
  function renderOrder() {
    const box = $('#order-list');
    if (!box) return;
    box.innerHTML = data.projects
      .map(
        (p, i) => `
      <div class="flex items-center justify-between border border-white/10 bg-abyss p-3" data-idx="${i}">
        <span class="font-mono text-[12px] text-sage w-6">${i + 1}</span>
        <span class="flex-1 truncate font-bold text-bone text-[14px] mx-2">${esc(p.title)}</span>
        <div class="flex gap-1">
          <button type="button" data-dir="up" class="border border-white/15 px-2.5 py-1 text-[12px] hover:border-phos ${i === 0 ? 'opacity-30' : ''}" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" data-dir="down" class="border border-white/15 px-2.5 py-1 text-[12px] hover:border-phos ${i === data.projects.length - 1 ? 'opacity-30' : ''}" ${i === data.projects.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      </div>`,
      )
      .join('');
  }

  on($('#order-list'), 'click', (e) => {
    const btn = e.target.closest('[data-dir]');
    const row = e.target.closest('[data-idx]');
    if (!btn || !row) return;
    const idx = parseInt(row.dataset.idx, 10);
    const dir = btn.dataset.dir;
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= data.projects.length) return;

    const arr = [...data.projects];
    const temp = arr[idx];
    arr[idx] = arr[target];
    arr[target] = temp;

    const ov = getOverlay();
    ov.order = arr.map((x) => String(x.id));
    saveOverlay(ov);
    refresh();
  });

  on($('#btn-order-reset'), 'click', () => {
    const ov = getOverlay();
    ov.order = [];
    saveOverlay(ov);
    refresh();
    toast('Порядок сброшен');
  });

  /* ---------- publish ---------- */
  function ghSettings() {
    return {
      owner: $('#gh-owner')?.value.trim() || 'GoShadowS',
      repo: $('#gh-repo')?.value.trim() || 'shad11t',
      branch: $('#gh-branch')?.value.trim() || 'main',
      path: $('#gh-path')?.value.trim() || 'src/data/projects.json',
      message: $('#gh-message')?.value.trim() || 'content: update projects showcase',
    };
  }

  function fillGh() {
    try {
      const saved = JSON.parse(localStorage.getItem(GH_KEY) || '{}');
      if (saved.owner && $('#gh-owner')) $('#gh-owner').value = saved.owner;
      if (saved.repo && $('#gh-repo')) $('#gh-repo').value = saved.repo;
      if (saved.branch && $('#gh-branch')) $('#gh-branch').value = saved.branch;
      if (saved.path && $('#gh-path')) $('#gh-path').value = saved.path;
    } catch {
      /* ignore */
    }
    const token = getToken();
    if (token && $('#gh-token')) $('#gh-token').value = token;
    const rem = Boolean(localStorage.getItem(GH_TOKEN_LOCAL));
    if ($('#gh-remember')) $('#gh-remember').checked = rem;
  }

  function getToken() {
    return $('#gh-token')?.value.trim() || sessionStorage.getItem(GH_TOKEN_KEY) || localStorage.getItem(GH_TOKEN_LOCAL) || '';
  }

  function stashToken(token) {
    if (!token) return;
    sessionStorage.setItem(GH_TOKEN_KEY, token);
    if ($('#gh-remember')?.checked) localStorage.setItem(GH_TOKEN_LOCAL, token);
  }

  function setPublishStatus(html) {
    const el = $('#publish-status');
    if (el) el.innerHTML = html;
  }

  function setGistStatus(html) {
    const el = $('#gist-status');
    if (el) el.innerHTML = html;
  }

  function ghErr(err) {
    const s = String(err?.message || err || 'Неизвестная ошибка');
    if (/bad credentials/i.test(s)) return 'Неверный токен GitHub (401 Bad Credentials).';
    if (/not found/i.test(s)) return 'Репозиторий или ветка не найдены (404). Проверьте owner/repo.';
    return s;
  }

  on($('#btn-publish'), 'click', async () => {
    const btn = $('#btn-publish');
    const s = ghSettings();
    const token = getToken();
    if (!s.owner || !s.repo) {
      toast('Укажите владельца и имя репозитория', 'err');
      return;
    }
    if (!token) {
      toast('Введите GitHub Token', 'err');
      return;
    }
    localStorage.setItem(GH_KEY, JSON.stringify({ owner: s.owner, repo: s.repo, branch: s.branch, path: s.path }));
    stashToken(token);
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'Публикация…';
    setPublishStatus('<span class="text-sage">Отправка коммита в GitHub…</span>');
    try {
      const res = await publishToGitHub({ ...s, token });
      const url = res?.commit?.html_url || res?.content?.html_url || '';
      setPublishStatus(`<span class="text-phos font-bold">✓ Успешно опубликовано!</span> ${url ? `<a class="underline ml-2" href="${esc(url)}" target="_blank" rel="noopener">Открыть коммит ↗</a>` : ''}<br><span class="text-sage">GitHub Actions пересоберёт сайт за ~30 секунд.</span>`);
      toast('Опубликовано в GitHub!');
      try { sfx('success'); } catch { /* ignore */ }
    } catch (err) {
      const msg = ghErr(err);
      setPublishStatus(`<span class="text-blood">✕ ${esc(msg)}</span>`);
      toast(`Ошибка: ${msg}`, 'err');
      try { sfx('error'); } catch { /* ignore */ }
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  });

  on($('#gh-remember'), 'change', (e) => {
    if (!e.target.checked) localStorage.removeItem(GH_TOKEN_LOCAL);
  });

  /* ---------- gist ---------- */
  on($('#btn-gist-publish'), 'click', async () => {
    const btn = $('#btn-gist-publish');
    const gId = site?.runtimeData?.gistId;
    const token = getToken();
    if (!token) {
      toast('Введите GitHub Token', 'err');
      return;
    }
    if (!gId) {
      toast('Gist не подключён. Нажмите «Создать Gist»', 'err');
      return;
    }
    stashToken(token);
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'Публикация…';
    try {
      const n = await updateGist({ token, gistId: gId });
      setGistStatus(`<span class="text-phos font-bold">✓ Gist обновлён (${n} проектов)</span>`);
      toast('Сайт обновлён мгновенно!');
      try { sfx('success'); } catch { /* ignore */ }
    } catch (err) {
      const msg = ghErr(err);
      setGistStatus(`<span class="text-blood">✕ ${esc(msg)}</span>`);
      toast(`Ошибка: ${msg}`, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  });

  on($('#btn-gist-create'), 'click', async () => {
    const btn = $('#btn-gist-create');
    const token = getToken();
    if (!token) {
      toast('Введите GitHub Token', 'err');
      return;
    }
    stashToken(token);
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'Создание…';
    try {
      const g = await createGist({ token });
      if (!g.id || !g.user) throw new Error('GitHub не вернул gist.');
      toast(`Gist создан: ${g.id}`);
      setGistStatus(`<span class="text-phos">✓ Gist создан: ID ${g.id}</span>`);
    } catch (err) {
      const msg = ghErr(err);
      setGistStatus(`<span class="text-blood">✕ ${esc(msg)}</span>`);
      toast(`Ошибка: ${msg}`, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  });

  on($('#btn-download'), async () => {
    const arr = await mergedForPublish();
    const blob = new Blob([`${JSON.stringify(arr, null, 2)}\n`], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'projects.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('projects.json скачан');
  });

  on($('#btn-copy-json'), async () => {
    try {
      const arr = await mergedForPublish();
      await copyText(JSON.stringify(arr, null, 2));
      toast('JSON скопирован в буфер');
    } catch {
      toast('Не удалось скопировать', 'err');
    }
  });

  on($('#btn-import'), async () => {
    const text = $('#import-text')?.value.trim() || '';
    if (!text) {
      toast('Вставьте JSON для импорта', 'err');
      return;
    }
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('Не массив');
      const clean = arr.filter((p) => p && p.id).map((p) => ({
        id: String(p.id),
        title: String(p.title ?? 'Без названия'),
        description: String(p.description ?? ''),
        category: String(p.category ?? 'other'),
        image: String(p.image ?? ''),
        link: String(p.link ?? ''),
        tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
        date: String(p.date ?? todayISO()),
        featured: Boolean(p.featured),
      }));
      const ov = getOverlay();
      clean.forEach((p) => {
        if (data.baseIds.has(p.id)) {
          ov.edited[p.id] = p;
          ov.deleted = ov.deleted.filter((x) => String(x) !== p.id);
        } else {
          const i = ov.added.findIndex((x) => String(x.id) === p.id);
          if (i >= 0) ov.added[i] = p;
          else ov.added.push(p);
        }
      });
      ov.order = clean.map((p) => p.id);
      saveOverlay(ov);
      $('#import-text').value = '';
      refresh();
      toast(`Импортировано проектов: ${clean.length}`);
    } catch {
      toast('Некорректный JSON', 'err');
    }
  });

  on($('#file-import'), 'change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if ($('#import-text')) $('#import-text').value = String(reader.result || '');
      toast('Файл загружен');
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  on($('#btn-overlay-reset'), 'click', () => {
    if (!window.confirm('Сбросить все локальные черновики и вернуться к версии из репозитория?')) return;
    clearOverlay();
    refresh();
    toast('Локальные правки очищены');
  });

  /* ---------- security: сброс пароля ---------- */
  on($('#pass-form'), 'submit', (e) => {
    e.preventDefault();
    const cur = $('#pw-current')?.value || '';
    const nw = $('#pw-new')?.value || '';
    const cf = $('#pw-confirm')?.value || '';

    if (!currentAuth) {
      toast('Пароль ещё не был установлен', 'err');
      return;
    }
    if (!safeEqual(hashPassword(cur, currentAuth.salt, currentAuth.iterations), currentAuth.hash)) {
      toast('Текущий пароль неверен', 'err');
      return;
    }
    if (nw.length < 6) {
      toast('Новый пароль должен быть от 6 символов', 'err');
      return;
    }
    if (nw !== cf) {
      toast('Пароли не совпадают', 'err');
      return;
    }

    saveMasterAuth(currentAuth.user, nw);
    updateLoginUI();
    $('#pw-current').value = '';
    $('#pw-new').value = '';
    $('#pw-confirm').value = '';
    toast('Мастер-пароль успешно обновлён локально');
    try { sfx('success'); } catch { /* ignore */ }
  });

  /* ---------- boot ---------- */
  function bootPanel() {
    if (booted) return;
    booted = true;
    fillGh();
    refresh();
  }

  if (isAuthed()) showPanel();
  return () => cleanups.forEach((fn) => fn());
}
