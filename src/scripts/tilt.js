/**
 * Shad11t — 3D-tilt карточек + позиция блика (--gx/--gy).
 * Можно вызывать повторно для динамически добавленных карточек (initTilt(root)).
 */

import { $$, isFinePointer, isReducedMotion } from './utils.js';

const MAX = 7; // градусов

export function initTilt(root = document) {
  if (!isFinePointer() || isReducedMotion()) return () => {};
  const els = $$('[data-tilt]:not([data-tilt-bound])', root);
  const cleanups = els.map((el) => {
    el.dataset.tiltBound = '1';
    let raf = 0;
    let target = null;

    const apply = () => {
      raf = 0;
      if (!target) {
        el.style.transform = '';
        return;
      }
      const r = el.getBoundingClientRect();
      const px = (target.x - r.left) / r.width;
      const py = (target.y - r.top) / r.height;
      const rx = (0.5 - py) * MAX * 2;
      const ry = (px - 0.5) * MAX * 2;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    };

    const onMove = (e) => {
      target = { x: e.clientX, y: e.clientY };
      el.style.transition = 'transform 0.08s linear';
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      target = null;
      el.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      if (!raf) raf = requestAnimationFrame(apply);
    };

    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.style.transform = '';
      delete el.dataset.tiltBound;
    };
  });
  return () => cleanups.forEach((fn) => fn());
}
