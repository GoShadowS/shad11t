/**
 * SHADVOID — процедурный генератор обложек (canvas, seeded).
 * У каждого проекта/видео без своей картинки — уникальная обложка в стиле сайта.
 * Детерминировано: один и тот же seed всегда даёт одну и ту же картинку.
 */

const CAT_STYLE = {
  mod: { c1: '#c6ff3d', c2: '#4ade80', label: 'MOD // MINECRAFT' },
  app: { c1: '#ff5a1f', c2: '#ffc53d', label: 'APP // DESKTOP' },
  'mobile-app': { c1: '#5eead4', c2: '#c6ff3d', label: 'APP // MOBILE' },
  other: { c1: '#ece9df', c2: '#93a092', label: 'MISC // BUILD' },
  video: { c1: '#ff3d3d', c2: '#ff5a1f', label: 'VIDEO // YT' },
};

const cache = new Map();

function hashSeed(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function coverURL(seed, title = '', cat = 'other') {
  const key = `${seed}◈${title}◈${cat}`;
  if (cache.has(key)) return cache.get(key);

  const style = CAT_STYLE[cat] || CAT_STYLE.other;
  const rnd = mulberry32(hashSeed(key));
  const W = 800;
  const H = 450;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const x = cv.getContext('2d');

  // 1. фон + свечение
  x.fillStyle = '#070a08';
  x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * 0.82, H * 0.18, 20, W * 0.82, H * 0.18, W * 0.7);
  glow.addColorStop(0, `${style.c1}2e`);
  glow.addColorStop(1, 'transparent');
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);

  // 2. сетка
  x.strokeStyle = 'rgba(255,255,255,0.045)';
  x.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 40) {
    x.beginPath(); x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, H); x.stroke();
  }
  for (let gy = 0; gy <= H; gy += 40) {
    x.beginPath(); x.moveTo(0, gy + 0.5); x.lineTo(W, gy + 0.5); x.stroke();
  }

  // 3. фигуры
  const shapes = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < shapes; i++) {
    const col = rnd() > 0.45 ? style.c1 : style.c2;
    x.globalAlpha = 0.10 + rnd() * 0.22;
    x.strokeStyle = col;
    x.fillStyle = col;
    x.lineWidth = 2;
    const kind = rnd();
    const px = rnd() * W;
    const py = rnd() * H;
    if (kind < 0.34) {
      const s = 30 + rnd() * 130;
      x.strokeRect(px, py, s, s * (0.4 + rnd() * 0.8));
    } else if (kind < 0.55) {
      x.beginPath();
      x.arc(px, py, 14 + rnd() * 70, 0, Math.PI * 2);
      x.stroke();
    } else if (kind < 0.75) {
      const s = 8 + rnd() * 26;
      x.fillRect(px, py, s, s);
    } else {
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + 60 + rnd() * 220, py - 40 - rnd() * 120);
      x.stroke();
      x.fillRect(px - 3, py - 3, 6, 6);
    }
  }
  x.globalAlpha = 1;

  // 4. пиксельный кластер (кивок в сторону Minecraft)
  const cells = 4;
  const cell = 16;
  const ox = 40 + rnd() * (W - 260);
  const oy = 40 + rnd() * (H - 220);
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      if (rnd() > 0.42) {
        x.fillStyle = rnd() > 0.25 ? style.c1 : style.c2;
        x.globalAlpha = 0.55 + rnd() * 0.4;
        x.fillRect(ox + cx * cell, oy + cy * cell, cell - 2, cell - 2);
      }
    }
  }
  x.globalAlpha = 1;

  // 5. плюсики-прицелы
  x.fillStyle = style.c1;
  for (let i = 0; i < 7; i++) {
    const px = rnd() * W;
    const py = rnd() * H;
    x.globalAlpha = 0.25 + rnd() * 0.4;
    x.fillRect(px - 6, py - 1, 12, 2);
    x.fillRect(px - 1, py - 6, 2, 12);
  }
  x.globalAlpha = 1;

  // 6. гигантская буква-призрак
  const letter = (title.trim()[0] || '#').toUpperCase();
  const lx = W - 300 + rnd() * 60;
  x.save();
  x.font = '900 300px Unbounded, "Arial Black", sans-serif';
  x.textBaseline = 'middle';
  x.lineWidth = 3;
  x.strokeStyle = `${style.c1}55`;
  x.strokeText(letter, lx, H / 2 + 10);
  x.fillStyle = 'rgba(6,8,7,0.35)';
  x.fillText(letter, lx, H / 2 + 10);
  x.restore();

  // 7. hazard-полоса
  x.save();
  x.beginPath();
  x.rect(W - 190, H - 26, 190, 26);
  x.clip();
  x.fillStyle = '#060807';
  x.fillRect(W - 190, H - 26, 190, 26);
  x.strokeStyle = `${style.c1}88`;
  x.lineWidth = 7;
  for (let hx = W - 220; hx < W + 40; hx += 22) {
    x.beginPath();
    x.moveTo(hx, H + 6);
    x.lineTo(hx + 26, H - 32);
    x.stroke();
  }
  x.restore();

  // 8. сканлайны
  x.fillStyle = 'rgba(0,0,0,0.16)';
  for (let sy = 0; sy < H; sy += 4) x.fillRect(0, sy, W, 1);

  // 9. шум
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.25)';
    x.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }

  // 10. виньетка
  const vig = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  x.fillStyle = vig;
  x.fillRect(0, 0, W, H);

  // 11. подписи
  x.font = '700 21px "JetBrains Mono", monospace';
  x.fillStyle = style.c1;
  x.fillText(`> ${style.label}`, 26, H - 30);
  x.textAlign = 'right';
  x.fillStyle = 'rgba(236,233,223,0.5)';
  x.font = '500 17px "JetBrains Mono", monospace';
  x.fillText(`#${hashSeed(key).toString(16).padStart(8, '0')}`, W - 210, H - 32);
  x.textAlign = 'left';

  const url = cv.toDataURL('image/jpeg', 0.88);
  cache.set(key, url);
  return url;
}

/** Заполнить все <img data-cover> на странице. */
export function hydrateCovers(root = document) {
  root.querySelectorAll('img[data-cover]:not([data-cover-done])').forEach((img) => {
    img.dataset.coverDone = '1';
    try {
      img.src = coverURL(img.dataset.cover || 'void', img.dataset.coverTitle || '', img.dataset.coverCat || 'other');
    } catch {
      /* canvas недоступен — остаёмся без картинки, вёрстка не ломается */
    }
  });
}
