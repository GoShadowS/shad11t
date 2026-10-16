/**
 * SHADVOID — микро-звуки на WebAudio (без аудиофайлов).
 * Контекст создаётся один раз при первом жесте пользователя.
 * Переключатель #sound-toggle есть в шапке; состояние — в localStorage.
 */

import { $, $$, isReducedMotion } from './utils.js';

const KEY = 'shadvoid_sound';
let ctx = null;
let master = null;

export function isSoundOn() {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch { /* ignore */ }
  syncToggle();
}

function ensureCtx() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.045;
  master.connect(ctx.destination);
  return ctx;
}

function blip(freq, dur = 0.05, type = 'square', when = 0, slideTo = null) {
  if (!isSoundOn() || isReducedMotion()) return;
  const ac = ensureCtx();
  if (!ac || !master) return;
  try {
    const t = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch { /* ignore */ }
}

/** Именованные эффекты: hover | click | open | success | error | key | boot | bubbles */
export function sfx(name) {
  switch (name) {
    case 'hover': blip(1150, 0.035, 'square'); break;
    case 'click': blip(620, 0.06, 'square', 0, 340); break;
    case 'open': blip(440, 0.07, 'sawtooth', 0, 880); break;
    case 'key': blip(980, 0.03, 'square'); break;
    case 'success': blip(660, 0.08, 'square'); blip(990, 0.1, 'square', 0.08); break;
    case 'error': blip(180, 0.16, 'sawtooth', 0, 110); break;
    case 'boot': blip(330, 0.07, 'square'); blip(495, 0.07, 'square', 0.08); blip(660, 0.12, 'square', 0.16); break;
    case 'creeper': blip(220, 0.3, 'sawtooth', 0, 60); blip(90, 0.4, 'sine', 0.1, 40); break;
    case 'bubbles': blip(520, 0.07, 'sine'); blip(720, 0.07, 'sine', 0.07); blip(980, 0.1, 'sine', 0.14); break;
    default: break;
  }
}

function syncToggle() {
  const btn = $('#sound-toggle');
  if (!btn) return;
  const on = isSoundOn();
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  $('#sound-icon-on')?.classList.toggle('hidden', !on);
  $('#sound-icon-off')?.classList.toggle('hidden', on);
}

export function initAudio() {
  const cleanups = [];
  syncToggle();

  const unlock = () => ensureCtx();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  cleanups.push(() => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  });

  const btn = $('#sound-toggle');
  if (btn) {
    const onToggle = () => {
      setSoundOn(!isSoundOn());
      if (isSoundOn()) sfx('open');
    };
    btn.addEventListener('click', onToggle);
    cleanups.push(() => btn.removeEventListener('click', onToggle));
  }

  // тихие ховеры по интерактиву (делегирование, без спама)
  let lastHover = 0;
  const onOver = (e) => {
    const t = e.target.closest('a, button, [data-cursor]');
    if (!t) return;
    const now = performance.now();
    if (now - lastHover < 90) return;
    lastHover = now;
    sfx('hover');
  };
  const onClick = (e) => {
    if (e.target.closest('a, button')) sfx('click');
  };
  document.addEventListener('mouseover', onOver);
  document.addEventListener('click', onClick);
  cleanups.push(() => {
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('click', onClick);
  });

  return () => cleanups.forEach((fn) => fn());
}
