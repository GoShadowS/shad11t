/**
 * Shad11t — страница /project?id=… : рендер проекта, добавленного через админку
 * (у него нет статической страницы, т.к. он живёт только в localStorage-оверлее).
 */

import { $, esc, pg, safeUrl, formatDateRu, CATS } from './utils.js';
import { loadProjects, getOverlay } from './store.js';
import { hydrateCovers } from './covers.js';
import { refreshTriggers } from './reveal.js';

/**
 * Синхронизация статической детальной страницы с локальным оверлеем:
 * если проект отредактирован/удалён в админке — показываем актуальное.
 */
export function initStaticProject() {
  const root = $('[data-static-project]');
  if (!root) return () => {};
  let alive = true;
  const id = root.dataset.staticProject;

  loadProjects()
    .then(({ projects }) => {
      if (!alive) return;
      const note = $('#static-overlay-note');
      const p = projects.find((x) => String(x.id) === id);
      if (!p) {
        if (note) {
          note.innerHTML = `<p class="font-mono mb-6 border border-blood/40 bg-blood/5 p-4 text-[13px] text-blood">✕ Этот проект удалён локально (админка → опубликуй изменения, чтобы это увидели все).</p>`;
        }
        root.style.opacity = '0.55';
        return;
      }
      const ov = getOverlay();
      if (ov.edited[id] && note) {
        note.innerHTML = `<p class="font-mono mb-6 border border-gold/40 bg-gold/5 p-4 text-[13px] text-gold">◈ Показана локально отредактированная версия. Оригинал из репозитория обновится после публикации.</p>`;
        const title = root.querySelector('[data-static-title]');
        const desc = root.querySelector('[data-static-desc]');
        const tags = root.querySelector('[data-static-tags]');
        const date = root.querySelector('[data-static-date]');
        if (title) title.textContent = p.title;
        if (desc) {
          desc.innerHTML = String(p.description || '')
            .split(/\n{2,}|\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => `<p>${esc(s)}</p>`)
            .join('');
        }
        if (tags) {
          tags.innerHTML = (p.tags || [])
            .map((t) => `<span class="font-mono border border-white/15 px-3 py-1.5 text-[12px] text-bone/70">#${esc(t)}</span>`)
            .join('');
        }
        if (date) date.textContent = p.date ? formatDateRu(p.date) : '—';
        document.title = `${p.title} — Shad11t`;
      }
    })
    .catch(() => {});

  return () => {
    alive = false;
  };
}

function notFoundHTML(id) {
  return `
  <div class="mx-auto max-w-2xl py-24 text-center">
    <p class="font-mono text-[12px] tracking-[0.3em] text-ember uppercase">чанк не загружен</p>
    <h1 class="font-display mt-4 text-4xl font-black text-bone md:text-6xl">404<span class="text-phos">.</span>уплыло</h1>
    <p class="mt-4 text-sage">Проект «${esc(id || '???')}» не найден. Возможно, он уплыл (или его удалили).</p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <a href="${pg('projects')}" class="btn-void btn-solid clip-corners-sm px-6 py-3 text-[12px]" data-cursor="hover">← все проекты</a>
      <a href="${pg('')}" class="btn-void btn-ghost clip-corners-sm px-6 py-3 text-[12px]" data-cursor="hover">на главную</a>
    </div>
  </div>`;
}

function projectHTML(p) {
  const paras = String(p.description || 'Описания пока нет — аксолотль хранит молчание.')
    .split(/\n{2,}|\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `<p>${esc(s)}</p>`)
    .join('');
  const tags = (p.tags || []).map((t) => `<span class="font-mono border border-white/15 px-3 py-1.5 text-[12px] text-bone/70">#${esc(t)}</span>`).join('');
  const cover = p.image
    ? `<img src="${esc(p.image)}" alt="Обложка проекта ${esc(p.title)}" class="h-full w-full object-cover">`
    : `<img data-cover="${esc(p.id)}" data-cover-title="${esc(p.title)}" data-cover-cat="${esc(p.category || 'other')}" alt="Обложка проекта ${esc(p.title)}" class="h-full w-full object-cover">`;

  return `
  <article>
    <div class="clip-corners scanlines relative aspect-[21/9] overflow-hidden border border-white/10">
      ${cover}
      <div class="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent"></div>
      <span class="chip clip-tag absolute top-4 left-4 md:top-6 md:left-6">${esc(CATS[p.category]?.label || p.category || 'Other')}</span>
      ${p.featured ? '<span class="chip clip-tag absolute top-4 right-4 md:top-6 md:right-6 !border-ember/60 !bg-ember/15 !text-ember">★ топ проект</span>' : ''}
    </div>

    <div class="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <h1 class="font-display text-4xl leading-[1.05] font-black text-bone md:text-6xl">${esc(p.title)}</h1>
        <div class="prose-void mt-6 max-w-none text-[16px]">${paras}</div>
        ${tags ? `<div class="mt-6 flex flex-wrap gap-2">${tags}</div>` : ''}
      </div>
      <aside class="lg:pt-2">
        <div class="term-window scanlines p-5">
          <p class="lbl">Досье проекта</p>
          <dl class="font-mono space-y-3 text-[13px]">
            <div class="flex justify-between gap-4"><dt class="text-sage">id</dt><dd class="text-right text-bone">${esc(p.id)}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-sage">категория</dt><dd class="text-right text-phos">${esc(CATS[p.category]?.short || p.category || '—')}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-sage">дата</dt><dd class="text-right text-bone">${esc(p.date ? formatDateRu(p.date) : '—')}</dd></div>
            <div class="flex justify-between gap-4"><dt class="text-sage">статус</dt><dd class="text-right text-gold">локальный черновик</dd></div>
          </dl>
          <div class="mt-5 flex flex-col gap-2.5">
            ${safeUrl(p.link) ? `<a href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener" class="btn-void btn-solid clip-corners-sm justify-center px-5 py-3 text-[12px]" data-cursor="hover">Открыть проект ↗</a>` : ''}
            <a href="${pg('projects')}" class="btn-void btn-ghost clip-corners-sm justify-center px-5 py-3 text-[12px]" data-cursor="hover">← все проекты</a>
          </div>
        </div>
        <p class="font-mono mt-4 border border-gold/30 bg-gold/5 p-3 text-[12px] leading-relaxed text-gold/90">
          ◈ Этот проект существует только в твоём браузере. Опубликуй его через <a class="underline hover:text-gold" href="${pg('admin')}">/admin → «Публикация»</a>, чтобы он появился у всех.
        </p>
      </aside>
    </div>
  </article>`;
}

export function initProjectFallback() {
  const root = $('[data-project-fallback]');
  if (!root) return () => {};
  let alive = true;
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    root.innerHTML = notFoundHTML('');
  } else {
    loadProjects()
      .then(({ projects }) => {
        if (!alive) return;
        const p = projects.find((x) => String(x.id) === id);
        root.innerHTML = p ? projectHTML(p) : notFoundHTML(id);
        if (p) document.title = `${p.title} — Shad11t`;
        hydrateCovers(root);
        refreshTriggers();
      })
      .catch(() => {
        if (!alive) return;
        root.innerHTML = notFoundHTML(id);
      });
  }

  return () => {
    alive = false;
  };
}
