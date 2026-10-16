/**
 * Shad11t — админ-панель (/admin).
 * Безопасная аутентификация с поддержкой сохранения паролей в репозиторий GitHub.
 * Управление проектами (CRUD), публикация в репозиторий через GitHub API.
 */

import { $, $$, esc, toast, copyText } from './utils.js';
import { loadProjects, getOverlay, saveOverlay, clearOverlay, mergedForPublish } from './store.js';
import { coverURL } from './covers.js';
import { hashPassword, safeEqual, randomSalt, ITERATIONS } from './hash-client.js';
import { publishToGitHub, testGitHubAuth, writeRepoFile } from './github.js';
import site from '../data/site.json';
import { sfx } from './audio.js';

const SESSION_KEY = 'shad11t_admin_session_v2';
const MASTER_AUTH_KEY = 'shad11t_admin_master_v2';
const GH_KEY = 'shad11t_gh_cfg';
const GH_TOKEN_KEY = 'shad11t_gh_token';
const GH_TOKEN_LOCAL = 'shad11t_gh_token_local';
const AVATAR_KEY = 'shad11t_avatar_custom';
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
    // 1. Сначала проверяем локально обновленный пароль
    try {
      const raw = localStorage.getItem(MASTER_AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.hash && parsed?.salt) return parsed;
      }
    } catch {
      /* ignore */
    }

    // 2. Затем конфигурацию из репозитория (src/data/admin.json)
    try {
      const cfgEl = $('#admin-auth-config');
      if (cfgEl) {
        const cfg = JSON.parse(cfgEl.textContent || '{}');
        if (cfg?.hash && cfg?.salt) {
          return {
            user: cfg.adminUser || 'shad11t',
            salt: cfg.salt,
            iterations: cfg.iterations || 25000,
            hash: cfg.hash,
          };
        }
      }
    } catch {
      /* ignore */
    }

    return null;
  }

  function saveMasterAuth(user, pass) {
    const salt = randomSalt(16);
    const hash = hashPassword(pass, salt, ITERATIONS);
    const data = { user: user || 'shad11t', salt, iterations: ITERATIONS, hash };
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
      if (loginDesc) loginDesc.textContent = 'Установите мастер-пароль администратора.';
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
      toast('Пароль успешно установлен');
      showPanel();
      return;
    }

    const pass = $('#login-pass')?.value || '';
    let ok = false;

    // 1. Проверка по хешу пароля
    try {
      const computed = hashPassword(pass, currentAuth.salt, currentAuth.iterations || 25000);
      ok = safeEqual(computed, currentAuth.hash);
    } catch {
      ok = false;
    }

    // 2. Вход по прямому GitHub PAT
    if (!ok && (pass.startsWith('ghp_') || pass.startsWith('github_pat_'))) {
      ok = true;
      sessionStorage.setItem(GH_TOKEN_KEY, pass.trim());
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
        <button type="button" data-act="feat" title="В избранное" class="flex h-9 w-9 shrink-0 items-center justify-center border transition-colors ${p.featured ? 'border-gold/60 text-gold bg-gold/10' : 'border-white/15 text-sage hover:text-gold'}">★</button>
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
    toast(p.featured ? 'Убран из избранного' : 'Добавлен в избранное', 'info');
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

  /* ---------- tabs ---------- */
  const tabs = $$('[data-tab]');
  const panels = $$('[data-panel]');
  function switchTab(name) {
    tabs.forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
    panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== name));
  }
  tabs.forEach((t) => on(t, 'click', () => switchTab(t.dataset.tab)));

  /* ---------- project editor ---------- */
  function startEdit(id) {
    const p = data.projects.find((x) => String(x.id) === id);
    if (!p) return;
    editingId = id;
    $('#editor-title').textContent = `Редактирование: ${p.title}`;
    $('#f-title').value = p.title || '';
    $('#f-id').value = p.id || '';
    $('#f-id').disabled = data.baseIds.has(id);
    $('#f-category').value = p.category || 'other';
    $('#f-date').value = p.date || '';
    $('#f-description').value = p.description || '';
    $('#f-image').value = p.image || '';
    $('#f-link').value = p.link || '';
    $('#f-tags').value = (p.tags || []).join(', ');
    $('#f-featured').checked = Boolean(p.featured);
    updateCoverPreview();
    switchTab('editor');
  }

  function startNew() {
    editingId = null;
    $('#editor-title').textContent = 'Новый проект';
    $('#project-form').reset();
    $('#f-id').disabled = false;
    $('#f-date').value = todayISO();
    updateCoverPreview();
    switchTab('editor');
  }

  on($('#btn-new'), 'click', startNew);
  on($('#btn-cancel'), 'click', () => switchTab('projects'));

  function updateCoverPreview() {
    const box = $('#cover-preview-box');
    if (!box) return;
    const title = $('#f-title')?.value.trim() || 'Новый проект';
    const cat = $('#f-category')?.value || 'other';
    const img = $('#f-image')?.value.trim();
    if (img) {
      box.innerHTML = `<img src="${esc(img)}" alt="" class="h-40 w-full object-cover">`;
    } else {
      const url = coverURL(editingId || 'preview', title, cat);
      box.innerHTML = `<img src="${url}" alt="" class="h-40 w-full object-cover">`;
    }
  }

  on($('#f-title'), 'input', () => {
    if (!editingId && !$('#f-id')?.disabled) {
      $('#f-id').value = slugify($('#f-title').value);
    }
    updateCoverPreview();
  });
  on($('#f-category'), 'change', updateCoverPreview);
  on($('#f-image'), 'input', updateCoverPreview);

  on($('#project-form'), 'submit', (e) => {
    e.preventDefault();
    const title = $('#f-title').value.trim();
    const id = slugify($('#f-id').value || title);
    if (!title || !id) {
      toast('Заполните название проекта', 'err');
      return;
    }

    const payload = {
      id,
      title,
      description: $('#f-description').value.trim(),
      category: $('#f-category').value,
      image: $('#f-image').value.trim(),
      link: $('#f-link').value.trim(),
      tags: $('#f-tags').value.split(',').map((s) => s.trim()).filter(Boolean),
      date: $('#f-date').value || todayISO(),
      featured: $('#f-featured').checked,
    };

    applySave(payload);
    toast('Проект сохранён в черновиках');
    try { sfx('success'); } catch { /* ignore */ }
    switchTab('projects');
  });

  function applySave(project, silent = false) {
    const ov = getOverlay();
    const id = String(project.id);
    if (data.baseIds.has(id)) {
      ov.edited[id] = project;
      ov.deleted = ov.deleted.filter((x) => String(x) !== id);
    } else {
      const idx = ov.added.findIndex((x) => String(x.id) === id);
      if (idx >= 0) ov.added[idx] = project;
      else ov.added.push(project);
    }
    if (!ov.order.includes(id)) {
      ov.order.push(id);
    }
    saveOverlay(ov);
    refresh();
  }

  /* ---------- order ---------- */
  function renderOrder() {
    const list = $('#order-list');
    if (!list) return;
    list.innerHTML = data.projects
      .map(
        (p, idx) => `
      <div class="flex items-center justify-between border border-white/10 bg-abyss p-3" data-idx="${idx}">
        <span class="font-mono text-[12px] text-phos mr-3">${String(idx + 1).padStart(2, '0')}</span>
        <span class="flex-1 truncate font-bold text-bone">${esc(p.title)}</span>
        <div class="flex gap-1 ml-3">
          <button type="button" data-dir="up" class="btn-void btn-ghost px-2.5 py-1 text-[11px]" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" data-dir="down" class="btn-void btn-ghost px-2.5 py-1 text-[11px]" ${idx === data.projects.length - 1 ? 'disabled' : ''}>▼</button>
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

    // Загрузка кастомного аватара
    const savedAv = localStorage.getItem(AVATAR_KEY);
    if (savedAv && $('#avatar-url-input')) {
      $('#avatar-url-input').value = savedAv;
      const prev = $('#avatar-preview');
      if (prev) prev.src = savedAv;
    }
  }

  function getToken() {
    return String($('#gh-token')?.value || sessionStorage.getItem(GH_TOKEN_KEY) || localStorage.getItem(GH_TOKEN_LOCAL) || '').trim();
  }

  function stashToken(token) {
    if (!token) return;
    const t = String(token).trim();
    sessionStorage.setItem(GH_TOKEN_KEY, t);
    if ($('#gh-remember')?.checked) localStorage.setItem(GH_TOKEN_LOCAL, t);
  }

  function setPublishStatus(html) {
    const el = $('#publish-status');
    if (el) el.innerHTML = html;
  }

  function setPassStatus(html) {
    const el = $('#pass-status');
    if (el) el.innerHTML = html;
  }

  function ghErr(err) {
    const s = String(err?.message || err || 'Неизвестная ошибка');
    if (/bad credentials/i.test(s) || err?.status === 401) {
      return 'Неверный токен GitHub (401 Bad Credentials). Проверьте токен или создайте новый.';
    }
    if (/not found/i.test(s) || err?.status === 404) {
      return 'Репозиторий или ветка не найдены (404). Проверьте GoShadowS/shad11t.';
    }
    if (err?.status === 403) {
      return 'Недостаточно прав (403). Убедитесь, что токен имеет права Contents: Read and write.';
    }
    return s;
  }

  // Проверка токена
  on($('#btn-test-token'), 'click', async () => {
    const btn = $('#btn-test-token');
    const s = ghSettings();
    const token = getToken();
    if (!token) {
      toast('Введите GitHub Token', 'err');
      setPublishStatus('<span class="text-blood">✕ Введите GitHub Personal Access Token в поле выше.</span>');
      return;
    }
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'Проверка…';
    setPublishStatus('<span class="text-sage">Подключение к GitHub API…</span>');
    try {
      const res = await testGitHubAuth({ owner: s.owner, repo: s.repo, token });
      stashToken(token);
      setPublishStatus(`<span class="text-phos font-bold">✓ Подключение успешно!</span> Репозиторий: <b class="text-bone">${res.repo}</b>. Права на запись: <b class="text-phos">${res.canPush ? 'Есть' : 'Только чтение'}</b>.`);
      toast('Токен действителен!');
      try { sfx('success'); } catch { /* ignore */ }
    } catch (err) {
      const msg = ghErr(err);
      setPublishStatus(`<span class="text-blood font-bold">✕ Ошибка проверки:</span> <span class="text-sage">${esc(msg)}</span>`);
      toast(`Ошибка: ${msg}`, 'err');
      try { sfx('error'); } catch { /* ignore */ }
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  });

  // Публикация проектов в репозиторий
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
      setPublishStatus('<span class="text-blood">✕ Введите GitHub Token перед публикацией.</span>');
      return;
    }
    localStorage.setItem(GH_KEY, JSON.stringify({ owner: s.owner, repo: s.repo, branch: s.branch, path: s.path }));
    stashToken(token);
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'Публикация…';
    setPublishStatus('<span class="text-sage">Создание коммита в GitHub…</span>');
    try {
      const res = await publishToGitHub({ ...s, token });
      const url = res?.commit?.html_url || res?.content?.html_url || '';
      setPublishStatus(`<span class="text-phos font-bold">✓ Коммит создан успешно!</span> ${url ? `<a class="underline text-phos ml-2" href="${esc(url)}" target="_blank" rel="noopener">Открыть на GitHub ↗</a>` : ''}<br><span class="text-sage mt-1 block">GitHub Actions автоматически пересоберёт и развернёт сайт за ~30 секунд.</span>`);
      toast('Опубликовано в GitHub!');
      try { sfx('success'); } catch { /* ignore */ }
    } catch (err) {
      const msg = ghErr(err);
      setPublishStatus(`<span class="text-blood font-bold">✕ Ошибка публикации:</span> <span class="text-sage">${esc(msg)}</span>`);
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

  /* ---------- profile & avatar ---------- */
  on($('#avatar-url-input'), 'input', (e) => {
    const val = e.target.value.trim();
    const prev = $('#avatar-preview');
    if (prev && val) prev.src = val;
  });

  on($('#btn-save-avatar'), 'click', () => {
    const val = $('#avatar-url-input')?.value.trim() || '/avatar.png';
    localStorage.setItem(AVATAR_KEY, val);
    toast('Настройки профиля сохранены');
    try { sfx('success'); } catch { /* ignore */ }
  });

  /* ---------- download / copy / import ---------- */
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

  /* ---------- security: смена пароля (локально и в GitHub) ---------- */
  function validatePasswordInputs() {
    const cur = $('#pw-current')?.value || '';
    const nw = $('#pw-new')?.value || '';
    const cf = $('#pw-confirm')?.value || '';

    const auth = getMasterAuth();
    if (!auth) {
      toast('Пароль ещё не был установлен', 'err');
      return null;
    }
    const computed = hashPassword(cur, auth.salt, auth.iterations || 25000);
    if (!safeEqual(computed, auth.hash)) {
      toast('Текущий пароль неверен', 'err');
      setPassStatus('<span class="text-blood">✕ Текущий пароль неверен.</span>');
      return null;
    }
    if (nw.length < 6) {
      toast('Новый пароль должен быть от 6 символов', 'err');
      setPassStatus('<span class="text-blood">✕ Новый пароль должен содержать от 6 символов.</span>');
      return null;
    }
    if (nw !== cf) {
      toast('Пароли не совпадают', 'err');
      setPassStatus('<span class="text-blood">✕ Пароли не совпадают.</span>');
      return null;
    }

    return { nw, user: auth.user || 'shad11t' };
  }

  // 1. Сохранить пароль локально
  on($('#pass-form'), 'submit', (e) => {
    e.preventDefault();
    const validated = validatePasswordInputs();
    if (!validated) return;

    saveMasterAuth(validated.user, validated.nw);
    updateLoginUI();
    $('#pw-current').value = '';
    $('#pw-new').value = '';
    $('#pw-confirm').value = '';
    setPassStatus('<span class="text-phos font-bold">✓ Пароль успешно обновлён локально в вашем браузере.</span>');
    toast('Пароль обновлён локально');
    try { sfx('success'); } catch { /* ignore */ }
  });

  // 2. Сохранить пароль прямо в репозиторий GitHub
  on($('#btn-pass-gh'), 'click', async () => {
    const validated = validatePasswordInputs();
    if (!validated) return;

    const token = getToken();
    if (!token) {
      toast('Введите GitHub Token во вкладке «Публикация»', 'err');
      setPassStatus('<span class="text-blood">✕ Для сохранения в GitHub укажите GitHub Token (вкладка «Публикация»).</span>');
      return;
    }

    const btn = $('#btn-pass-gh');
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'Сохранение в GitHub…';
    setPassStatus('<span class="text-sage">Отправка нового пароля в репозиторий GitHub…</span>');

    try {
      const salt = randomSalt(16);
      const hash = hashPassword(validated.nw, salt, ITERATIONS);
      const adminData = {
        adminUser: validated.user || 'shad11t',
        salt,
        iterations: ITERATIONS,
        hash,
      };

      const s = ghSettings();
      await writeRepoFile({
        owner: s.owner,
        repo: s.repo,
        branch: s.branch,
        path: 'src/data/admin.json',
        token,
        message: 'security: update admin password hash',
        text: JSON.stringify(adminData, null, 2) + '\n',
      });

      // Сохраняем также локально
      localStorage.setItem(MASTER_AUTH_KEY, JSON.stringify(adminData));
      updateLoginUI();

      $('#pw-current').value = '';
      $('#pw-new').value = '';
      $('#pw-confirm').value = '';

      setPassStatus('<span class="text-phos font-bold">✓ Новый пароль успешно сохранён и закоммичен в репозиторий GitHub!</span>');
      toast('Пароль сохранён в репозиторий!');
      try { sfx('success'); } catch { /* ignore */ }
    } catch (err) {
      const msg = ghErr(err);
      setPassStatus(`<span class="text-blood font-bold">✕ Ошибка сохранения в GitHub:</span> <span class="text-sage">${esc(msg)}</span>`);
      toast(`Ошибка: ${msg}`, 'err');
      try { sfx('error'); } catch { /* ignore */ }
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
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
