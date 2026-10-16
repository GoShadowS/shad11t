/**
 * Shad11t — кастомный курсор: точка + кольцо + текстовая лупа.
 * [data-cursor="hover"] — кольцо растёт; [data-cursor="Текст"] — показывает лупу с текстом.
 * Только для точных указателей (мышь/тачпад).
 * Автоматически скрывается при бездействии, в полях ввода, при потере фокуса окна и на тач-устройствах.
 */

import { $, isFinePointer, isReducedMotion } from './utils.js';

export function initCursor() {
  const dot = $('#cursor-dot');
  const ring = $('#cursor-ring');
  const label = $('#cursor-label');

  if (!dot || !ring || !label) return () => {};

  // persist-элементы переживают навигацию — сбрасываем залипшее состояние
  label.classList.remove('show');
  dot.classList.add('hidden-cursor');
  ring.classList.add('hidden-cursor');
  ring.classList.remove('is-hover');
  ring.classList.remove('is-down');

  // Если нет мыши (тач-экран) или включен reduced motion — отключаем кастомный курсор
  if (!isFinePointer() || isReducedMotion()) {
    document.documentElement.classList.remove('has-cursor');
    return () => {};
  }

  document.documentElement.classList.add('has-cursor');

  let mx = -200, my = -200, rx = -200, ry = -200;
  let raf = 0;
  let visible = false;
  let idleTimer = null;

  const show = () => {
    if (!visible) {
      visible = true;
      if (!label.classList.contains('show')) {
        dot.classList.remove('hidden-cursor');
        ring.classList.remove('hidden-cursor');
      }
    }
  };

  const hide = () => {
    visible = false;
    dot.classList.add('hidden-cursor');
    ring.classList.add('hidden-cursor');
    label.classList.remove('show');
    ring.classList.remove('is-hover');
    ring.classList.remove('is-down');
  };

  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      hide();
    }, 3000);
  };

  const onMove = (e) => {
    // В полях ввода скрываем кастомный курсор, давая работать нативному текстовому курсору
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) {
      hide();
      return;
    }
    mx = e.clientX;
    my = e.clientY;
    if (!visible) show();
    resetIdle();
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    label.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
  };

  const loop = () => {
    if (visible) {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const onOver = (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) {
      hide();
      return;
    }
    const t = e.target.closest('[data-cursor], a, button, label, summary');
    if (!t) {
      label.classList.remove('show');
      ring.classList.remove('is-hover');
      if (visible) {
        dot.classList.remove('hidden-cursor');
        ring.classList.remove('hidden-cursor');
      }
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
      if (visible) {
        ring.classList.remove('hidden-cursor');
        dot.classList.remove('hidden-cursor');
      }
      ring.classList.add('is-hover');
    }
  };

  const onDown = () => ring.classList.add('is-down');
  const onUp = () => ring.classList.remove('is-down');
  const onLeave = () => hide();
  const onBlur = () => hide();
  const onTouch = () => {
    // При тач-событиях сразу отключаем кастомный курсор
    hide();
    document.documentElement.classList.remove('has-cursor');
  };

  document.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseover', onOver, { passive: true });
  document.addEventListener('mousedown', onDown);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchstart', onTouch, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);
  window.addEventListener('blur', onBlur);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(idleTimer);
    hide();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mousedown', onDown);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchstart', onTouch);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    window.removeEventListener('blur', onBlur);
  };
}
