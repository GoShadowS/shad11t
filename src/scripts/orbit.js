/**
 * SHADVOID — орбитальная карта навыков (canvas 2D).
 * Узлы кружат вокруг ядра, hover показывает подсказку, клик — детали.
 */

import { $, esc, isReducedMotion } from './utils.js';

const CAT_STYLE = {
  lang: { color: '#c6ff3d', ring: 0.3, label: 'Языки' },
  mc: { color: '#4ade80', ring: 0.44, label: 'Minecraft' },
  app: { color: '#ff5a1f', ring: 0.58, label: 'Приложения' },
  tools: { color: '#ece9df', ring: 0.71, label: 'Инструменты' },
  media: { color: '#ffc53d', ring: 0.83, label: 'Медиа' },
};

export function initOrbit() {
  const wrap = $('[data-orbit]');
  const cv = $('#orbit-canvas');
  const tip = $('#orbit-tip');
  const detail = $('#skill-detail');
  const dataEl = $('#skills-data');
  if (!wrap || !cv || !dataEl) return () => {};
  const ctx = cv.getContext('2d');
  if (!ctx) return () => {};

  let skills = [];
  try {
    skills = JSON.parse(dataEl.textContent || '[]');
  } catch {
    return () => {};
  }
  if (!skills.length) return () => {};

  const reduced = isReducedMotion();
  const nodes = skills.map((s, i) => {
    const st = CAT_STYLE[s.cat] || CAT_STYLE.tools;
    return {
      ...s,
      color: st.color,
      ring: st.ring,
      angle: (i / skills.length) * Math.PI * 2 + (i % 3) * 0.35,
      speed: (0.34 - st.ring * 0.16) * (i % 2 === 0 ? 1 : -1) * 0.55,
      wobble: Math.random() * Math.PI * 2,
    };
  });

  let W = 0, H = 0, R = 0, raf = 0, running = true;
  let t = 0;
  let timeScale = 1, timeTarget = 1;
  let hovered = null;
  let selected = nodes[Math.max(0, nodes.findIndex((n) => n.name.includes('Forge')))] || nodes[0];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    W = Math.max(300, rect.width);
    H = Math.max(300, Math.min(rect.height || 560, 640));
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) / 2 - 44;
    if (reduced) render(0);
  };

  const posOf = (n, time) => {
    const wob = Math.sin(time * 0.7 + n.wobble) * 6;
    const r = n.ring * R + wob;
    const a = n.angle + time * n.speed;
    return { x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, r, a };
  };

  function render(time) {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    // орбиты
    Object.values(CAT_STYLE).forEach((st) => {
      ctx.beginPath();
      ctx.arc(cx, cy, st.ring * R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(236,233,223,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // связи с ядром
    nodes.forEach((n) => {
      const p = posOf(n, time);
      const hot = n === hovered || n === selected;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = hot ? `${n.color}55` : 'rgba(236,233,223,0.06)';
      ctx.lineWidth = hot ? 1.5 : 1;
      ctx.stroke();
    });

    // ядро
    const pulse = reduced ? 0 : Math.sin(time * 2.2) * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 26 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0d0b';
    ctx.fill();
    ctx.strokeStyle = '#c6ff3d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 34 + pulse * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,90,31,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#c6ff3d';
    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHD11T', cx, cy);

    // узлы
    nodes.forEach((n) => {
      const p = posOf(n, time);
      const hot = n === hovered || n === selected;
      const size = 5 + (n.level / 100) * 8 + (hot ? 2.5 : 0);
      ctx.save();
      ctx.shadowColor = n.color;
      ctx.shadowBlur = hot ? 22 : 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0d0b';
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = hot ? 2.5 : 1.8;
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();

      // подпись
      ctx.font = `${hot ? '800' : '500'} 11px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = n.name;
      const lx = p.x + size + 7;
      const tw = ctx.measureText(label).width;
      let tx = lx;
      if (lx + tw > W - 8) tx = p.x - size - 7 - tw;
      ctx.fillStyle = 'rgba(6,8,7,0.72)';
      ctx.fillRect(tx - 4, p.y - 10, tw + 8, 20);
      ctx.fillStyle = hot ? '#ffffff' : 'rgba(236,233,223,0.82)';
      ctx.fillText(label, tx, p.y + 0.5);
    });
  }

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    timeScale += (timeTarget - timeScale) * 0.06;
    t += 0.016 * timeScale;
    render(t);
  };

  const pick = (e) => {
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let best = null;
    let bestD = 30;
    nodes.forEach((n) => {
      const p = posOf(n, t);
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    });
    return best;
  };

  function showDetail(n) {
    if (!detail || !n) return;
    detail.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-mono text-[11px] uppercase tracking-[0.25em]" style="color:${n.color}">${esc((CAT_STYLE[n.cat] || {}).label || n.cat)}</p>
          <h3 class="font-display mt-1 text-2xl font-bold text-bone">${esc(n.name)}</h3>
        </div>
        <span class="font-display text-3xl font-black" style="color:${n.color}">${Number(n.level) || 0}</span>
      </div>
      <div class="xp-track mt-3"><div class="xp-fill" style="width:${Number(n.level) || 0}%; transition: width .6s cubic-bezier(.22,1,.36,1)"></div></div>
      <p class="mt-3 text-[14px] leading-relaxed text-sage">${esc(n.desc || '')}</p>`;
  }

  const onMove = (e) => {
    hovered = pick(e);
    timeTarget = hovered ? 0.12 : 1;
    cv.style.cursor = hovered ? 'pointer' : 'default';
    // без rAF-цикла (reduced motion) перерисовываем вручную, иначе ховер не виден
    if (reduced) render(t);
    if (tip) {
      if (hovered) {
        const r = wrap.getBoundingClientRect();
        tip.style.opacity = '1';
        tip.style.left = `${e.clientX - r.left + 16}px`;
        tip.style.top = `${e.clientY - r.top - 10}px`;
        tip.innerHTML = `<span class="font-mono border px-2 py-1 text-[11px] font-bold whitespace-nowrap" style="border-color:${hovered.color}; color:${hovered.color}; background:rgba(6,8,7,.9)">${esc(hovered.name)} · ${Number(hovered.level) || 0}</span>`;
      } else {
        tip.style.opacity = '0';
      }
    }
  };
  const onLeave = () => {
    hovered = null;
    timeTarget = 1;
    if (tip) tip.style.opacity = '0';
  };
  const onClick = (e) => {
    const n = pick(e);
    if (n) {
      selected = n;
      showDetail(n);
      if (reduced) render(t);
    }
  };

  resize();
  showDetail(selected);
  if (!reduced) {
    raf = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver((entries) => {
    running = entries[0]?.isIntersecting ?? true;
  });
  io.observe(wrap);

  window.addEventListener('resize', resize);
  let ro = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
  }
  cv.addEventListener('mousemove', onMove, { passive: true });
  cv.addEventListener('mouseleave', onLeave, { passive: true });
  cv.addEventListener('click', onClick);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro?.disconnect();
    window.removeEventListener('resize', resize);
    cv.removeEventListener('mousemove', onMove);
    cv.removeEventListener('mouseleave', onLeave);
    cv.removeEventListener('click', onClick);
  };
}
