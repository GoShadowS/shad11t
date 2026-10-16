/**
 * SHADVOID — страница /projects: фильтры, поиск, сортировка, живой рендер.
 * Рендерит объединённые данные (base JSON + локальный оверлей админки).
 */

import { $, $$, esc, pg, formatDateRu, CATS } from './utils.js';
import { loadProjects } from './store.js';
import { hydrateCovers } from './covers.js';
import { initTilt } from './tilt.js';
import { refreshTriggers } from './reveal.js';

function cardHTML(p, i, baseIds) {
  const num = String(i + 1).padStart(2, '0');
  const href = baseIds.has(String(p.id))
    ? pg(`projects/${encodeURIComponent(p.id)}`)
    : `${pg('project')}?id=${encodeURIComponent(p.id)}`;
  const wide = i === 0 && p.featured;
  const offset = !wide && i % 3 === 1 ? 'md:mt-12' : '';
  const firstLine = String(p.description || '').split('\n')[0];
  const cover = p.image
    ? `<img src="${esc(p.image)}" alt="${esc(`Обложка проекта ${p.title}`)}" loading="lazy" class="p-cover absolute inset-0 h-full w-full object-cover">`
    : `<img data-cover="${esc(p.id)}" data-cover-title="${esc(p.title)}" data-cover-cat="${esc(p.category || 'other')}" alt="${esc(`Обложка проекта ${p.title}`)}" loading="lazy" class="p-cover absolute inset-0 h-full w-full object-cover">`;
  const tags = (p.tags || []).slice(0, 4).map((t) => `<span class="font-mono border border-white/10 px-2 py-0.5 text-[11px] text-bone/60">#${esc(t)}</span>`).join('');

  return `
  <article class="p-card group flex flex-col ${wide ? 'md:col-span-2 md:flex-row' : ''} ${offset}" data-tilt>
    <div class="p-glow"></div>
    <a href="${href}" class="absolute inset-0 z-10" aria-label="Открыть проект: ${esc(p.title)}" data-cursor="Открыть"><span class="sr-only">${esc(p.title)}</span></a>
    <div class="relative overflow-hidden ${wide ? 'min-h-[240px] md:w-[46%]' : 'aspect-[16/10]'}">
      ${cover}
      <div class="p-veil"></div>
      <span class="p-index pointer-events-none absolute top-3 right-4 text-5xl font-black md:text-6xl">${num}</span>
      ${p.featured ? '<span class="chip clip-tag absolute top-3 left-3 !border-ember/60 !bg-ember/15 !text-ember">★ топ</span>' : ''}
    </div>
    <div class="relative flex flex-1 flex-col p-5 md:p-6">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="chip clip-tag">${esc(CATS[p.category]?.short || p.category || 'Other')}</span>
        ${p.date ? `<span class="font-mono text-[11px] tracking-[0.14em] text-sage/80 uppercase">${esc(formatDateRu(p.date))}</span>` : ''}
      </div>
      <h3 class="font-display text-xl leading-tight font-bold text-bone transition-colors duration-300 group-hover:text-phos md:text-2xl">${esc(p.title)}</h3>
      <p class="p-desc mt-2 text-[14px] leading-relaxed text-sage">${esc(firstLine)}</p>
      ${tags ? `<div class="mt-3 flex flex-wrap gap-1.5">${tags}</div>` : ''}
      <div class="mt-auto flex items-center justify-between pt-5">
        <span class="p-cta font-mono inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.18em] text-phos uppercase">Открыть кейс →</span>
        ${p.link ? '<span class="font-mono pointer-events-none text-[11px] text-sage/70">↗ ссылка</span>' : ''}
      </div>
    </div>
    <span class="pointer-events-none absolute top-0 left-0 h-5 w-5 border-t-2 border-l-2 border-phos opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
    <span class="pointer-events-none absolute right-0 bottom-0 h-5 w-5 border-r-2 border-b-2 border-phos opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
  </article>`;
}

export function initProjectsPage() {
  const app = $('[data-projects-app]');
  if (!app) return () => {};

  const grid = $('[data-projects-grid]', app);
  const countEl = $('[data-projects-count]', app);
  const emptyEl = $('[data-projects-empty]', app);
  const search = $('[data-projects-search]', app);
  const sort = $('[data-projects-sort]', app);
  const filterBtns = $$('[data-filter]', app);
  if (!grid) return () => {};

  const state = { cat: 'all', q: '', sort: 'featured' };
  let data = { projects: [], baseIds: new Set(), overlay: null };
  let alive = true;
  let tiltCleanup = () => {};

  function overlayBadge() {
    const ov = data.overlay;
    if (!ov) return '';
    const n = (ov.added?.length || 0) + Object.keys(ov.edited || {}).length + (ov.deleted?.length || 0);
    if (!n) return '';
    return ` <span class="chip clip-tag ml-2 !border-gold/50 !bg-gold/10 !text-gold">локально: ${n}</span>`;
  }

  function render() {
    const q = state.q.trim().toLowerCase();
    let list = data.projects.filter((p) => {
      if (state.cat !== 'all' && p.category !== state.cat) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
    if (state.sort === 'new') list = [...list].sort(byDate);
    else if (state.sort === 'old') list = [...list].sort((a, b) => -byDate(a, b));
    else if (state.sort === 'az') list = [...list].sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru'));
    else list = [...list].sort((a, b) => Number(b.featured || false) - Number(a.featured || false) || byDate(a, b));

    tiltCleanup();
    grid.innerHTML = list.map((p, i) => cardHTML(p, i, data.baseIds)).join('');
    hydrateCovers(grid);
    tiltCleanup = initTilt(grid);

    if (countEl) {
      countEl.innerHTML = `найдено: <span class="text-phos font-bold">${list.length}</span>${overlayBadge()}`;
    }
    if (emptyEl) emptyEl.classList.toggle('hidden', list.length > 0);
    grid.classList.toggle('hidden', list.length === 0);
    refreshTriggers();
  }

  async function reload() {
    try {
      data = await loadProjects();
      if (!alive) return;
      render();
    } catch {
      if (!alive) return;
      grid.innerHTML = `<div class="col-span-full border border-blood/40 bg-blood/5 p-8 text-center">
        <p class="font-mono text-[14px] text-blood">не удалось загрузить projects.json</p>
        <p class="font-mono mt-2 text-[12px] text-sage">проверь соединение и обнови страницу</p>
      </div>`;
    }
  }

  const cleanups = [];
  filterBtns.forEach((btn) => {
    const onClick = () => {
      state.cat = btn.dataset.filter;
      // 'on' — только табам (кнопка «Показать всё» в пустом состоянии — не таб)
      filterBtns.forEach((b) => b.classList.toggle('on', b.dataset.filter === state.cat && b.classList.contains('tab-btn')));
      render();
    };
    btn.addEventListener('click', onClick);
    cleanups.push(() => btn.removeEventListener('click', onClick));
  });

  let searchT = 0;
  if (search) {
    const onInput = () => {
      clearTimeout(searchT);
      searchT = setTimeout(() => {
        state.q = search.value;
        render();
      }, 160);
    };
    search.addEventListener('input', onInput);
    cleanups.push(() => {
      search.removeEventListener('input', onInput);
      clearTimeout(searchT);
    });
  }
  if (sort) {
    const onChange = () => {
      state.sort = sort.value;
      render();
    };
    sort.addEventListener('change', onChange);
    cleanups.push(() => sort.removeEventListener('change', onChange));
  }

  const onStore = () => reload();
  window.addEventListener('shadvoid:projects', onStore);
  cleanups.push(() => window.removeEventListener('shadvoid:projects', onStore));

  reload();

  return () => {
    alive = false;
    tiltCleanup();
    cleanups.forEach((fn) => fn());
  };
}
