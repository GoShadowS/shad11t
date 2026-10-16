/**
 * SHADVOID — админ-панель (/admin).
 * Вход для единственного администратора, CRUD проектов в localStorage-оверлей,
 * публикация в репозиторий через GitHub API, смена пароля.
 */

import { $, $$, esc, toast, copyText } from './utils.js';
import { loadProjects, getOverlay, saveOverlay, clearOverlay, mergedForPublish } from './store.js';
import { coverURL } from './covers.js';
import { hashPassword, safeEqual, randomSalt } from './hash-client.js';
import { publishToGitHub } from './github.js';
import { sfx } from './audio.js';

const SESSION_KEY = 'shadvoid_admin_session';
const LOCAL_AUTH_KEY = 'shadvoid_admin_local';
const GH_KEY = 'shadvoid_gh';
const GH_TOKEN_KEY = 'shadvoid_gh_token';
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

  /* ---------- auth ---------- */
  let baked = { user: 'shad11t', salt: '', iterations: 25000, hash: '' };
  try {
    baked = { ...baked, ...JSON.parse($('#admin-auth-data')?.textContent || '{}') };
  } catch { /* ignore */ }

  function expectedAuth() {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_AUTH_KEY) || 'null');
      if (local?.hash && local?.salt) return { user: local.user || baked.user, salt: local.salt, iterations: local.iterations || 25000, hash: local.hash, local: true };
    } catch { /* ignore */ }
    return { ...baked, local: false };
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

  function showPanel() {
    loginBox?.classList.add('hidden');
    panel?.classList.remove('hidden');
    bootPanel();
  }

  const loginForm = $('#login-form');
  on(loginForm, 'submit', (e) => {
    e.preventDefault();
    const user = $('#login-user')?.value.trim() || '';
    const pass = $('#login-pass')?.value || '';
    const err = $('#login-error');
    const exp = expectedAuth();
    let ok = false;
    try {
      ok = user === exp.user && safeEqual(hashPassword(pass, exp.salt, exp.iterations), exp.hash);
    } catch {
      ok = false;
    }
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
      if (err) err.textContent = '';
      try { sfx('success'); } catch { /* ignore */ }
      toast('Доступ разрешён. Тень узнала тебя.');
      showPanel();
    } else {
      try { sfx('error'); } catch { /* ignore */ }
      if (err) err.textContent = 'Неверный логин или пароль. Тень насторожилась.';
      loginBox?.classList.remove('shake');
      void loginBox?.offsetWidth;
      loginBox?.classList.add('shake');
    }
  });

  on($('#btn-logout'), 'click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  });

  /* ---------- panel ---------- */
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
      <span class="chip chip-bone">в репозитории: <b class="text-bone">${data.baseIds.size}</b></span>
      <span class="chip">+ новых: <b>${a}</b></span>
      <span class="chip">~ изменено: <b>${e}</b></span>
      <span class="chip !border-blood/50 !bg-blood/10 !text-blood">− удалено: <b>${d}</b></span>
      ${expectedAuth().local ? '<span class="chip !border-gold/50 !bg-gold/10 !text-gold">пароль: локальный</span>' : ''}`;
  }

  function overlayMark(id) {
    const ov = data.overlay;
    if (ov.added.some((p) => String(p.id) === id)) return '<span class="chip ml-2 !py-0.5 !text-[10px]">new</span>';
    if (ov.edited[id]) return '<span class="chip chip-bone ml-2 !py-0.5 !text-[10px]">edited</span>';
    return '';
  }

  function renderList() {
    const list = $('#admin-list');
    if (!list) return;
    if (!data.projects.length) {
      list.innerHTML = '<p class="font-mono border border-dashed border-white/15 p-8 text-center text-[13px] text-sage">проектов нет. создай первый — тени ждут.</p>';
      return;
    }
    list.innerHTML = data.projects.map((p) => {
      const thumb = p.image ? esc(p.image) : coverURL(p.id, p.title, p.category);
      return `
      <div class="flex items-center gap-4 border border-white/10 bg-abyss p-3 transition-colors hover:border-phos/40" data-row="${esc(p.id)}">
        <img src="${thumb}" alt="" class="h-14 w-24 shrink-0 object-cover" loading="lazy">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-bold text-bone">${esc(p.title)}${overlayMark(String(p.id))}</p>
          <p class="font-mono mt-0.5 truncate text-[11px] text-sage">${esc(p.id)} · ${esc(p.category)} · ${esc(p.date || '—')}</p>
        </div>
        <button type="button" data-act="feat" title="В топ / убрать из топа" class="flex h-9 w-9 shrink-0 items-center justify-center border transition-colors ${p.featured ? 'border-gold/60 text-gold' : 'border-white/15 text-sage hover:text-gold'}">★</button>
        <button type="button" data-act="edit" class="font-mono hidden shrink-0 border border-white/15 px-3 py-2 text-[11px] tracking-widest uppercase hover:border-phos hover:text-phos sm:block">edit</button>
        <button type="button" data-act="del" title="Удалить" class="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 text-sage transition-colors hover:border-blood hover:text-blood">✕</button>
      </div>`;
    }).join('');
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
    if (!window.confirm(`Удалить проект «${p.title}»?\n\nИз репозитория он пропадёт только после публикации.`)) return;
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
    toast('Проект удалён (локально)');
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
    box.innerHTML = `<img src="${esc(src)}" alt="Превью обложки">`;
  }
  ['f-title', 'f-id', 'f-category', 'f-image'].forEach((fid) => on(document.getElementById(fid), 'input', updatePreview));

  function collectForm() {
    const title = $('#f-title')?.value.trim() || '';
    let id = $('#f-id')?.value.trim() || slugify(title);
    id = slugify(id);
    return {
      id,
      title,
      description: $('#f-description')?.value.trim() || '',
      category: $('#f-category')?.value || 'other',
      image: $('#f-image')?.value.trim() || '',
      link: $('#f-link')?.value.trim() || '',
      tags: ($('#f-tags')?.value || '').split(',').map((t) => t.trim()).filter(Boolean),
      date: $('#f-date')?.value || todayISO(),
      featured: Boolean($('#f-featured')?.checked),
    };
  }

  /** Сохранить объект в оверлей (новая или существующая запись). */
  function applySave(obj, silent = false) {
    const ov = getOverlay();
    const id = String(obj.id);
    if (data.baseIds.has(id)) {
      ov.edited[id] = { ...obj, id };
      ov.deleted = ov.deleted.filter((x) => String(x) !== id);
    } else {
      const i = ov.added.findIndex((x) => String(x.id) === id);
      if (i >= 0) ov.added[i] = { ...obj, id };
      else {
        ov.added.push({ ...obj, id });
        if (ov.order.length) ov.order.push(id);
      }
    }
    saveOverlay(ov);
    if (!silent) {
      refresh();
      toast('Сохранено локально');
      try { sfx('success'); } catch { /* ignore */ }
    } else {
      refresh();
    }
  }

  on($('#project-form'), 'submit', (e) => {
    e.preventDefault();
    const obj = collectForm();
    if (!obj.title) {
      toast('Укажи название проекта', 'err');
      return;
    }
    if (!editingId) {
      // уникальность id для нового
      const taken = new Set(data.projects.map((p) => String(p.id)));
      let id = obj.id;
      let n = 2;
      while (taken.has(id)) id = `${obj.id}-${n++}`;
      obj.id = id;
    } else {
      obj.id = editingId;
    }
    applySave(obj);
    switchTab('projects');
  });

  /* ---------- order ---------- */
  function renderOrder() {
    const list = $('#order-list');
    if (!list) return;
    if (!data.projects.length) {
      list.innerHTML = '<p class="font-mono border border-dashed border-white/15 p-8 text-center text-[13px] text-sage">нечего упорядочивать</p>';
      return;
    }
    list.innerHTML = data.projects.map((p, i) => `
      <div class="flex items-center gap-3 border border-white/10 bg-abyss p-3" data-row="${esc(p.id)}">
        <span class="font-mono w-8 shrink-0 text-[12px] text-phos">${String(i + 1).padStart(2, '0')}</span>
        <span class="min-w-0 flex-1 truncate text-[14px] font-bold text-bone">${esc(p.title)}</span>
        ${p.featured ? '<span class="text-[12px] text-gold">★</span>' : ''}
        <button type="button" data-act="up" class="font-mono h-8 w-8 shrink-0 border border-white/15 hover:border-phos hover:text-phos" ${i === 0 ? 'disabled style="opacity:.25"' : ''}>↑</button>
        <button type="button" data-act="down" class="font-mono h-8 w-8 shrink-0 border border-white/15 hover:border-phos hover:text-phos" ${i === data.projects.length - 1 ? 'disabled style="opacity:.25"' : ''}>↓</button>
      </div>`).join('');
  }

  on($('#order-list'), 'click', (e) => {
    const btn = e.target.closest('[data-act]');
    const row = e.target.closest('[data-row]');
    if (!btn || !row || btn.disabled) return;
    const ids = data.projects.map((p) => String(p.id));
    const i = ids.indexOf(row.dataset.row);
    const j = btn.dataset.act === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const ov = getOverlay();
    ov.order = ids;
    saveOverlay(ov);
    refresh();
  });

  on($('#btn-order-reset'), 'click', () => {
    const ov = getOverlay();
    ov.order = [];
    saveOverlay(ov);
    refresh();
    toast('Порядок сброшен к исходному', 'info');
  });

  /* ---------- publish / import / export ---------- */
  function ghSettings() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(GH_KEY) || '{}');
    } catch { /* ignore */ }
    return {
      owner: $('#gh-owner')?.value.trim() || saved.owner || '',
      repo: $('#gh-repo')?.value.trim() || saved.repo || '',
      branch: $('#gh-branch')?.value.trim() || saved.branch || 'main',
      path: $('#gh-path')?.value.trim() || saved.path || 'src/data/projects.json',
      message: $('#gh-message')?.value.trim() || '',
    };
  }

  function fillGh() {
    try {
      const saved = JSON.parse(localStorage.getItem(GH_KEY) || '{}');
      if ($('#gh-owner') && saved.owner) $('#gh-owner').value = saved.owner;
      if ($('#gh-repo') && saved.repo) $('#gh-repo').value = saved.repo;
      if ($('#gh-branch') && saved.branch) $('#gh-branch').value = saved.branch;
      if ($('#gh-path') && saved.path) $('#gh-path').value = saved.path;
      const tok = sessionStorage.getItem(GH_TOKEN_KEY);
      if ($('#gh-token') && tok) $('#gh-token').value = tok;
    } catch { /* ignore */ }
  }

  function setPublishStatus(html) {
    const el = $('#publish-status');
    if (el) el.innerHTML = html;
  }

  on($('#btn-publish'), 'click', async () => {
    const btn = $('#btn-publish');
    const s = ghSettings();
    const token = $('#gh-token')?.value.trim() || '';
    if (!s.owner || !s.repo) {
      toast('Укажи owner и repo', 'err');
      return;
    }
    if (!token) {
      toast('Вставь Personal Access Token', 'err');
      return;
    }
    localStorage.setItem(GH_KEY, JSON.stringify({ owner: s.owner, repo: s.repo, branch: s.branch, path: s.path }));
    sessionStorage.setItem(GH_TOKEN_KEY, token);
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = 'публикую…';
    setPublishStatus('<span class="text-sage">⌛ коммичу в репозиторий…</span>');
    try {
      const res = await publishToGitHub({ ...s, token });
      const url = res?.commit?.html_url || res?.content?.html_url || '';
      setPublishStatus(`<span class="text-phos">✓ опубликовано!</span> ${url ? `<a class="underline" href="${esc(url)}" target="_blank" rel="noopener">смотреть коммит ↗</a>` : ''}<br><span class="text-sage">GitHub Actions пересоберёт сайт за ~1–2 минуты.</span>`);
      toast('Опубликовано в GitHub!');
      try { sfx('success'); } catch { /* ignore */ }
    } catch (err) {
      setPublishStatus(`<span class="text-blood">✕ ${esc(err.message || 'ошибка публикации')}</span>`);
      toast(`Ошибка: ${err.message}`, 'err');
      try { sfx('error'); } catch { /* ignore */ }
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  });

  on($('#btn-download'), 'click', async () => {
    const arr = await mergedForPublish();
    const blob = new Blob([`${JSON.stringify(arr, null, 2)}\n`], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'projects.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('projects.json скачан');
  });

  on($('#btn-copy-json'), 'click', async () => {
    try {
      const arr = await mergedForPublish();
      await copyText(JSON.stringify(arr, null, 2));
      toast('JSON скопирован в буфер');
    } catch {
      toast('Не удалось скопировать', 'err');
    }
  });

  on($('#btn-import'), 'click', async () => {
    const text = $('#import-text')?.value.trim() || '';
    if (!text) {
      toast('Вставь JSON для импорта', 'err');
      return;
    }
    let arr;
    try {
      arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('not array');
    } catch {
      toast('Некорректный JSON (нужен массив проектов)', 'err');
      return;
    }
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
    if (!clean.length) {
      toast('В JSON нет валидных проектов', 'err');
      return;
    }
    const ov = getOverlay();
    const baseIds = data.baseIds;
    clean.forEach((p) => {
      if (baseIds.has(p.id)) {
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
    toast(`Импортировано: ${clean.length}`);
  });

  on($('#file-import'), 'change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if ($('#import-text')) $('#import-text').value = String(reader.result || '');
      toast('Файл загружен в поле импорта', 'info');
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  on($('#btn-overlay-reset'), 'click', () => {
    if (!window.confirm('Удалить ВСЕ локальные правки и вернуться к версии из репозитория?')) return;
    clearOverlay();
    refresh();
    toast('Локальные правки очищены', 'info');
  });

  /* ---------- security ---------- */
  on($('#pass-form'), 'submit', (e) => {
    e.preventDefault();
    const cur = $('#pw-current')?.value || '';
    const nw = $('#pw-new')?.value || '';
    const cf = $('#pw-confirm')?.value || '';
    const exp = expectedAuth();
    if (!safeEqual(hashPassword(cur, exp.salt, exp.iterations), exp.hash)) {
      toast('Текущий пароль неверный', 'err');
      return;
    }
    if (nw.length < 8) {
      toast('Новый пароль — минимум 8 символов', 'err');
      return;
    }
    if (nw !== cf) {
      toast('Пароли не совпадают', 'err');
      return;
    }
    const salt = randomSalt();
    const hash = hashPassword(nw, salt, 25000);
    const record = { user: exp.user, salt, iterations: 25000, hash };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(record));
    const box = $('#pw-result');
    if (box) {
      box.classList.remove('hidden');
      box.querySelector('[data-hash] code').textContent = JSON.stringify(record, null, 2);
    }
    $('#pw-current').value = '';
    $('#pw-new').value = '';
    $('#pw-confirm').value = '';
    renderSummary();
    toast('Пароль сменён (в этом браузере)');
    try { sfx('success'); } catch { /* ignore */ }
  });

  on($('#btn-hash-copy'), 'click', async () => {
    const code = $('#pw-result [data-hash] code')?.textContent || '';
    if (!code) return;
    try {
      await copyText(code);
      toast('Хеш скопирован');
    } catch {
      toast('Не удалось скопировать', 'err');
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
