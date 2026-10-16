/**
 * Shad11t — пиксельный шлейф за курсором (canvas).
 * Лаймово-эмберные пиксели затухают и осыпаются вниз.
 */

import { $, isFinePointer, isReducedMotion } from './utils.js';

const COLORS = ['#c6ff3d', '#c6ff3d', '#c6ff3d', '#ff5a1f', '#ece9df'];
const MAX = 130;

export function initTrail() {
  const cv = $('#trail-canvas');
  if (!cv || !isFinePointer() || isReducedMotion()) return () => {};
  const ctx = cv.getContext('2d');
  if (!ctx) return () => {};

  let W = 0, H = 0, raf = 0;
  const parts = [];
  let lastX = -999, lastY = -999;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const onMove = (e) => {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;
    if (dist < 7) return;
    const n = Math.min(3, Math.floor(dist / 12) + 1);
    for (let i = 0; i < n; i++) {
      if (parts.length >= MAX) parts.shift();
      const speed = Math.min(dist / 14, 4);
      parts.push({
        x: e.clientX + (Math.random() - 0.5) * 10,
        y: e.clientY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * speed - dx * 0.02,
        vy: (Math.random() - 0.5) * speed - dy * 0.02 + 0.4,
        life: 1,
        decay: 0.02 + Math.random() * 0.035,
        size: 2 + Math.random() * 4,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      });
    }
  };

  const loop = () => {
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.vx *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(p.life, 0) * 0.9;
      ctx.fillStyle = p.color;
      const s = p.size * (0.4 + p.life * 0.6);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  document.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('resize', resize);

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('mousemove', onMove);
    window.removeEventListener('resize', resize);
    ctx.clearRect(0, 0, W, H);
  };
}
