/**
 * Shad11t — слой данных проектов.
 *
 * Источник истины: /projects.json (генерируется при сборке из src/data/projects.json).
 * Локальные правки админки: localStorage-оверлей { added, edited, deleted, order }.
 * loadProjects() возвращает объединённый список + множество id из базового JSON
 * (нужно, чтобы отличать «настоящие» статические страницы от черновиков).
 */

import { u, GIST_FILE } from './utils.js';
import site from '../data/site.json';

const OVERLAY_KEY = 'shadvoid_overlay_v1';
let baseCache = null;
let basePromise = null;
let runtimeCache; // undefined = не пробовали, null = нет gist или ошибка, array = данные

export function emptyOverlay() {
  return { added: [], edited: {}, deleted: [], order: [] };
}

export function getOverlay() {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return emptyOverlay();
    const ov = JSON.parse(raw);
    return {
      added: Array.isArray(ov.added) ? ov.added : [],
      edited: ov.edited && typeof ov.edited === 'object' ? ov.edited : {},
      deleted: Array.isArray(ov.deleted) ? ov.deleted : [],
      order: Array.isArray(ov.order) ? ov.order : [],
    };
  } catch {
    return emptyOverlay();
  }
}

export function saveOverlay(ov) {
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(ov));
  window.dispatchEvent(new CustomEvent('shadvoid:projects'));
}

export function clearOverlay() {
  localStorage.removeItem(OVERLAY_KEY);
  window.dispatchEvent(new CustomEvent('shadvoid:projects'));
}

async function getBase() {
  if (baseCache) return baseCache;
  if (!basePromise) {
    basePromise = fetch(u('projects.json'), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`projects.json: HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data.filter((p) => p && p.id) : [];
        baseCache = list;
        return list;
      })
      .catch((err) => {
        basePromise = null;
        throw err;
      });
  }
  return basePromise;
}

/** URL сырого файла gist (читает весь сайт). null — мгновенная публикация не настроена. */
export function gistURL() {
  const g = site?.runtimeData;
  if (!g?.gistUser || !g?.gistId) return null;
  return `https://gist.githubusercontent.com/${encodeURIComponent(g.gistUser)}/${encodeURIComponent(g.gistId)}/raw/${GIST_FILE}`;
}

/** Данные из gist (один запрос за сессию). null — нет gist или не загрузился. */
async function getRuntime() {
  if (runtimeCache !== undefined) return runtimeCache;
  const url = gistURL();
  if (!url) {
    runtimeCache = null;
    return null;
  }
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`gist: HTTP ${res.status}`);
    const data = await res.json();
    runtimeCache = Array.isArray(data) ? data.filter((p) => p && p.id) : null;
  } catch {
    runtimeCache = null;
  }
  return runtimeCache;
}

/**
 * @returns {Promise<{projects: object[], baseIds: Set<string>, overlay: object}>}
 */
export async function loadProjects() {
  const [baseRes, runtimeList] = await Promise.all([
    getBase().then((v) => ({ ok: true, v }), () => ({ ok: false, v: [] })),
    getRuntime(),
  ]);
  const baseList = baseRes.v;
  if (!baseRes.ok && !runtimeList) {
    throw new Error('данные недоступны: ни projects.json из сборки, ни gist не загрузились');
  }
  // свежий список — из gist (мгновенная публикация), иначе из сборки;
  // baseIds всегда из сборки: только у этих проектов есть статические страницы
  const list0 = runtimeList || baseList;
  const ov = getOverlay();
  const map = new Map(list0.map((p) => [String(p.id), { ...p }]));
  const baseIds = new Set(baseList.map((p) => String(p.id)));

  for (const id of ov.deleted) map.delete(String(id));
  for (const [id, patch] of Object.entries(ov.edited)) {
    const key = String(id);
    if (map.has(key) && patch && typeof patch === 'object') {
      map.set(key, { ...map.get(key), ...patch, id: key });
    }
  }
  for (const p of ov.added) {
    if (p && p.id && !map.has(String(p.id))) map.set(String(p.id), { ...p, id: String(p.id) });
  }

  let list = [...map.values()];
  if (ov.order.length > 0) {
    const pos = new Map(ov.order.map((id, i) => [String(id), i]));
    list = list
      .map((p, i) => [pos.get(String(p.id)) ?? 1e9 + i, p])
      .sort((a, b) => a[0] - b[0])
      .map(([, p]) => p);
  }
  return { projects: list, baseIds, overlay: ov };
}

/** Итоговый массив для публикации в репозиторий (без служебных полей). */
export async function mergedForPublish() {
  const { projects } = await loadProjects();
  return projects.map((p) => {
    const { _note, ...rest } = p;
    return {
      id: String(rest.id),
      title: String(rest.title ?? ''),
      description: String(rest.description ?? ''),
      category: String(rest.category ?? 'other'),
      image: String(rest.image ?? ''),
      link: String(rest.link ?? ''),
      tags: Array.isArray(rest.tags) ? rest.tags.map(String) : [],
      date: String(rest.date ?? ''),
      featured: Boolean(rest.featured),
    };
  });
}
