/**
 * SHADVOID — базовые утилиты клиентских скриптов.
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Base-путь сайта (GitHub Pages: "/" или "/<repo>/"). */
export const base = () => window.__BASE__ || '/';

/** Путь к файлу: u('projects.json') */
export const u = (p) => base() + String(p).replace(/^\/+/, '');

/** Путь к странице (со слэшем): pg('about') */
export const pg = (p) => {
  const url = u(p);
  return url.endsWith('/') ? url : `${url}/`;
};

export const isFinePointer = () =>
  window.matchMedia('(pointer: fine)').matches;

export const isReducedMotion = () =>
  document.documentElement.classList.contains('reduced') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Безопасный URL для href: разрешаем только http(s), остальное отбрасываем. */
export function safeUrl(href) {
  const s = String(href || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

/** Экранирование пользовательского текста для вставки в HTML. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function formatDateRu(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso || '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const CATS = {
  mod: { label: 'Моды и плагины', short: 'Мод' },
  app: { label: 'Десктопные приложения', short: 'App' },
  'mobile-app': { label: 'Мобильные приложения', short: 'Mobile' },
  other: { label: 'Скрипты и прочее', short: 'Other' },
};

/** Всплывающее уведомление. type: 'ok' | 'err' | 'info'. */
export function toast(msg, type = 'ok') {
  const root = $('#toast-root');
  if (!root) return;
  while (root.children.length >= 4) root.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast${type === 'err' ? ' err' : ''}`;
  const icon = type === 'err' ? '✕' : type === 'info' ? '◈' : '✓';
  el.innerHTML = `<span class="${type === 'err' ? 'text-blood' : 'text-phos'} font-bold">${icon}</span><span>${esc(msg)}</span>`;
  el.addEventListener('click', () => dismiss());
  root.appendChild(el);
  const t = setTimeout(dismiss, 3600);
  function dismiss() {
    clearTimeout(t);
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }
}

/** Плавный скролл к элементу (через Lenis, если есть). */
export function scrollToTarget(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el && target !== 0) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(target === 0 ? 0 : el, { offset: -80, duration: 1.4 });
  } else if (target === 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}
