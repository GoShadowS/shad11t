/**
 * SHADVOID — магнитные элементы (.magnetic): тянутся за курсором.
 * Сила — через data-magnetic="0.35" (по умолчанию 0.3).
 */

import { $$, isFinePointer, isReducedMotion } from './utils.js';

export function initMagnetic() {
  if (!isFinePointer() || isReducedMotion()) return () => {};
  const els = $$('.magnetic:not([data-mag-bound])');
  const cleanups = els.map((el) => {
    el.dataset.magBound = '1';
    const strength = parseFloat(el.dataset.magnetic || '0.3');
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const tick = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        if (tx === 0 && ty === 0) el.style.transform = '';
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };

    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.style.transform = '';
      delete el.dataset.magBound;
    };
  });
  return () => cleanups.forEach((fn) => fn());
}
