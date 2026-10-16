/**
 * Shad11t — Konami Code: ↑↑↓↓←→←→BA.
 * Награда: аксолотль + тост «Achievement Get!» в духе Minecraft.
 */

import { $ } from './utils.js';
import { sfx } from './audio.js';

const SEQ = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

const AXOLOTL = `
<svg viewBox="0 0 8 8" class="h-40 w-40 md:h-52 md:w-52" shape-rendering="crispEdges" aria-hidden="true" style="image-rendering:pixelated">
  <rect width="8" height="8" fill="#f2a9c4"/>
  <rect x="3" y="0" width="2" height="1" fill="#ffd7e6"/><rect x="0" y="5" width="1" height="2" fill="#ffd7e6"/><rect x="7" y="6" width="1" height="1" fill="#ffd7e6"/>
  <rect x="1" y="1" width="1" height="1" fill="#d9759b"/><rect x="6" y="1" width="1" height="1" fill="#d9759b"/>
  <rect x="0" y="2" width="1" height="3" fill="#e05260"/><rect x="7" y="2" width="1" height="3" fill="#e05260"/>
  <rect x="2" y="3" width="1" height="1" fill="#14100e"/><rect x="5" y="3" width="1" height="1" fill="#14100e"/>
  <rect x="2" y="4" width="1" height="1" fill="#7a2f45"/><rect x="5" y="4" width="1" height="1" fill="#7a2f45"/><rect x="3" y="5" width="2" height="1" fill="#7a2f45"/>
</svg>`;

export function initKonami() {
  let pos = 0;
  let shown = false;

  function show() {
    if (shown) return;
    shown = true;
    const root = $('#konami-root');
    if (!root) return;
    try { sfx('bubbles'); } catch { /* ignore */ }
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 450);

    root.innerHTML = `
      <div class="fixed inset-0 z-[280] flex flex-col items-center justify-center gap-6 bg-black/85 p-6 backdrop-blur-sm" data-konami-veil role="dialog" aria-modal="true" aria-label="Пасхалка: аксолотль">
        <div class="mc-toast flex items-center gap-4 p-4 pr-8">
          <div class="shrink-0 border-2 border-black bg-[#1a1a1a] p-1">${AXOLOTL.replace('h-40 w-40 md:h-52 md:w-52', 'h-12 w-12')}</div>
          <div>
            <p class="font-mono text-[13px] font-bold text-[#ffff54]">Achievement Get!</p>
            <p class="font-mono text-[15px] text-white">Свой среди своих</p>
          </div>
        </div>
        <div class="float-slow border-4 border-black shadow-[0_0_80px_-10px_rgba(198,255,61,0.5)]">${AXOLOTL}</div>
        <p class="font-mono max-w-md text-center text-[13px] leading-relaxed text-bone/80">
          Ты нашёл аксолотля.<br>Он одобряет твои скиллы. <span class="text-phos">Бульк.</span>
        </p>
        <button type="button" data-konami-close class="btn-void btn-solid clip-corners-sm px-6 py-3 text-[12px]">бульк… закрыть</button>
      </div>`;

    const veil = root.querySelector('[data-konami-veil]');
    const close = () => {
      root.innerHTML = '';
      shown = false;
      document.removeEventListener('keydown', onEsc);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') close();
    };
    veil?.addEventListener('click', (e) => {
      if (e.target === veil || e.target.closest('[data-konami-close]')) close();
    });
    document.addEventListener('keydown', onEsc);
  }

  const onKey = (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const key = e.key.toLowerCase();
    pos = key === SEQ[pos] ? pos + 1 : key === SEQ[0] ? 1 : 0;
    if (pos === SEQ.length) {
      pos = 0;
      show();
    }
  };

  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('keydown', onKey);
    // корень persist'ится между страницами — не тащим открытую пасхалку дальше
    const root = $('#konami-root');
    if (root) root.innerHTML = '';
  };
}
