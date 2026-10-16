/**
 * Shad11t — кастомный курсор: точка + кольцо + текстовая лупа.
 * [data-cursor="hover"] — кольцо растёт; [data-cursor="Текст"] — показывает лупу с текстом.
 * Только для точных указателей (мышь/тачпад).
 */

import { $, isFinePointer, isReducedMotion } from './utils.js';

export function initCursor() {
  const dot = $('#cursor-dot');
  const ring = $('#cursor-ring');
  const label = $('#cursor-label');
  // persist-элементы переживают навигацию — сбрасываем залипшее состояние
  label.classList.remove('show');
  dot.classList.add('hidden-cursor');
  ring.classList.add('hidden-cursor');
  ring.classList.remove('is-hover');
  if (!dot || !ring || !label || !isFinePointer() || isReducedMotion()) return () => {};

  document.documentElement.classList.add('has-cursor');

  let mx = -100, my = -100, rx = -100, ry = -100;
  let raf = 0;
  let visible = false;

  const show = () => {
    if (visible) return;
    visible = true;
    dot.classList.remove('hidden-cursor');
    ring.classList.remove('hidden-cursor');
  };
  const hide = () => {
    visible = false;
    dot.classList.add('hidden-cursor');
    ring.classList.add('hidden-cursor');
    label.classList.remove('show');
    ring.classList.remove('is-hover');
  };

  const onMove = (e) => {
    mx = e.clientX;
    my = e.clientY;
    show();
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    label.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
  };

  const loop = () => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const onOver = (e) => {
    const t = e.target.closest('[data-cursor], a, button, input, textarea, select, label, summary');
    if (!t) {
      label.classList.remove('show');
      ring.classList.remove('is-hover');
      return;
    }
    const mode = t.closest('[data-cursor]')?.dataset.cursor;
    if (mode && mode !== 'hover') {
      label.textContent = mode;
      label.classList.add('show');
      ring.classList.add('hidden-cursor');
      dot.classList.add('hidden-cursor');
    } else {
      label.classList.remove('show');
      ring.classList.remove('hidden-cursor');
      dot.classList.remove('hidden-cursor');
      ring.classList.add('is-hover');
    }
  };

  const onDown = () => ring.classList.add('is-down');
  const onUp = () => ring.classList.remove('is-down');
  const onLeave = () => hide();
  const onEnter = () => show();

  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseover', onOver, { passive: true });
  document.addEventListener('mousedown', onDown);
  document.addEventListener('mouseup', onUp);
  document.documentElement.addEventListener('mouseleave', onLeave);
  document.documentElement.addEventListener('mouseenter', onEnter);

  return () => {
    cancelAnimationFrame(raf);
    label.classList.remove('show');
    dot.classList.add('hidden-cursor');
    ring.classList.add('hidden-cursor');
    ring.classList.remove('is-hover');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mousedown', onDown);
    document.removeEventListener('mouseup', onUp);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    document.documentElement.removeEventListener('mouseenter', onEnter);
  };
}
