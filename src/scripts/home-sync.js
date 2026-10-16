/**
 * SHADVOID — синхронизация статичных SSR-карточек ([data-project-card])
 * с локальным оверлеем админки: прячем удалённые, подменяем заголовки,
 * описания и обложки у отредактированных.
 * Если оверлей пуст — ничего не делаем (ноль нагрузки для обычных посетителей).
 */

import { $$ } from './utils.js';
import { loadProjects, getOverlay } from './store.js';
import { hydrateCovers } from './covers.js';
import { refreshTriggers } from './reveal.js';

function overlayEmpty(ov) {
  return (
    !ov.added.length &&
    !ov.deleted.length &&
    !Object.keys(ov.edited).length &&
    !ov.order.length
  );
}

export function initHomeSync() {
  const cards = $$('[data-project-card]');
  if (!cards.length) return () => {};
  if (overlayEmpty(getOverlay())) return () => {};
  let alive = true;

  loadProjects()
    .then(({ projects }) => {
      if (!alive) return;
      const ov = getOverlay();
      const byId = new Map(projects.map((p) => [String(p.id), p]));
      let changed = false;

      cards.forEach((card) => {
        const id = String(card.dataset.projectCard || '');
        if (!id) return;
        const p = byId.get(id);
        if (!p) {
          // удалён локально (или пропал из base) — прячем карточку целиком
          const wrap = card.closest('[data-project-wrap]') || card;
          wrap.classList.add('hidden');
          changed = true;
          return;
        }
        if (!ov.edited[id]) return;
        // отредактирован — подменяем видимые поля
        const title = card.querySelector('h3');
        if (title) title.textContent = p.title;
        const desc = card.querySelector('.p-desc');
        if (desc) desc.textContent = String(p.description || '').split('\n')[0];
        const img = card.querySelector('img.p-cover');
        if (img) {
          if (p.image) {
            if (img.getAttribute('src') !== p.image) {
              delete img.dataset.cover;
              delete img.dataset.coverDone;
              img.setAttribute('src', p.image);
            }
          } else {
            img.dataset.cover = id;
            img.dataset.coverTitle = p.title;
            img.dataset.coverCat = p.category || 'other';
            delete img.dataset.coverDone;
            img.removeAttribute('src');
          }
        }
        changed = true;
      });

      if (changed) {
        hydrateCovers(document);
        refreshTriggers();
      }
    })
    .catch(() => {});

  return () => {
    alive = false;
  };
}
