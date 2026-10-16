/**
 * SHADVOID — прелоадер «загрузка теневой ОС».
 * Работает один раз за полную загрузку документа (элемент persist'ится между переходами).
 */

import { $, $$, isReducedMotion } from './utils.js';
import { sfx } from './audio.js';

const LINES = [
  ['> shadvoid_os v1.1 — init…', 't-bone'],
  ['> монтирую /dev/shadow … <span class="t-phos">OK</span>', 't-dim'],
  ['> подгружаю чанки … <span class="t-phos">16/16</span>', 't-dim'],
  ['> калибрую фосфор … <span class="t-phos">100%</span>', 't-dim'],
  ['> тени пробуждены. добро пожаловать.', 't-ember'],
];

export function initPreloader() {
  const pre = $('#preloader');
  if (!pre || window.__shadvoid_booted) {
    pre?.classList.add('done');
    return () => {};
  }
  window.__shadvoid_booted = true;

  const log = $('#boot-log');
  const bar = $$('#boot-bar span');
  const pct = $('#boot-pct');
  const reduced = isReducedMotion();
  let timers = [];
  let finished = false;

  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  };

  function finish() {
    if (finished) return;
    finished = true;
    if (pct) pct.textContent = '100%';
    bar.forEach((s) => s.classList.add('on'));
    later(() => {
      pre.classList.add('done');
      try { sfx('boot'); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('shadvoid:ready'));
    }, reduced ? 0 : 250);
  }

  if (reduced) {
    finish();
  } else {
    const step = Math.max(90, Math.min(180, 1100 / (LINES.length + 1)));
    LINES.forEach(([html, cls], i) => {
      later(() => {
        if (!log) return;
        const div = document.createElement('div');
        div.className = cls;
        div.innerHTML = html;
        log.appendChild(div);
        const p = Math.round(((i + 1) / (LINES.length + 1)) * 100);
        if (pct) pct.textContent = `${p}%`;
        bar.forEach((s, si) => s.classList.toggle('on', si / bar.length < (i + 1) / (LINES.length + 1)));
      }, 120 + i * step);
    });
    // ждём window.load, но не дольше ~2.4с
    let loaded = document.readyState === 'complete';
    const onLoad = () => { loaded = true; };
    window.addEventListener('load', onLoad, { once: true });
    const t0 = performance.now();
    const tick = () => {
      if (finished) return;
      const elapsed = performance.now() - t0;
      if ((loaded && elapsed > 900) || elapsed > 2400) finish();
      else later(tick, 120);
    };
    tick();
  }

  // страховка: никогда не висеть дольше 5с
  const force = setTimeout(() => {
    pre.classList.add('done');
    window.dispatchEvent(new CustomEvent('shadvoid:ready'));
  }, 5000);

  return () => {
    timers.forEach(clearTimeout);
    clearTimeout(force);
  };
}
