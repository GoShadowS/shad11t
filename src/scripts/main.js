/**
 * SHADVOID — точка входа клиентских скриптов.
 * boot() выполняется при первой загрузке и при каждом переходе (astro:page-load),
 * перед переходом (astro:before-swap) все подписки аккуратно снимаются.
 */

import { $, $$, scrollToTarget, toast } from './utils.js';
import { hydrateCovers } from './covers.js';
import { initAudio, sfx } from './audio.js';
import { initPreloader } from './preloader.js';
import { initCursor } from './cursor.js';
import { initTrail } from './trail.js';
import { initSmooth } from './smooth.js';
import { initTilt } from './tilt.js';
import { initMagnetic } from './magnetic.js';
import { initReveal, refreshTriggers } from './reveal.js';
import { initTerminal } from './terminal.js';
import { initKonami } from './konami.js';
import { initProjectsPage } from './projects-page.js';
import { initProjectFallback, initStaticProject } from './project-fallback.js';
import { initHomeSync } from './home-sync.js';
import { initContact } from './contact.js';
import { initAdmin } from './admin.js';

/* ---------- шапка, прогресс, «наверх», бургер ---------- */
function initNav() {
  const cleanups = [];
  const inner = $('#header-inner');
  const progress = $('#scroll-progress');
  const toTop = $('#to-top');
  const burger = $('#burger');
  const menu = $('#mobile-menu');

  const onScroll = () => {
    const y = window.scrollY || 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
    if (inner) {
      const scrolled = y > 24;
      inner.classList.toggle('bg-void/85', scrolled);
      inner.classList.toggle('backdrop-blur-xl', scrolled);
      inner.classList.toggle('border-b', scrolled);
      inner.classList.toggle('border-white/10', scrolled);
    }
    toTop?.classList.toggle('show', y > 700);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', onScroll));

  if (toTop) {
    const goTop = () => scrollToTarget(0);
    toTop.addEventListener('click', goTop);
    cleanups.push(() => toTop.removeEventListener('click', goTop));
  }

  // активная ссылка
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const base = (window.__BASE__ || '/').replace(/\/+$/, '');
  const rel = base && path.startsWith(base) ? path.slice(base.length) || '/' : path;
  const seg = rel.split('/').filter(Boolean)[0] || 'home';
  const id = seg === 'project' || seg === 'projects' ? 'projects' : seg === '' ? 'home' : seg;
  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === id || (id === 'home' && a.dataset.nav === 'home' && (rel === '/' || rel === ''));
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // бургер
  if (burger && menu) {
    const lines = $$('.burger-l', burger);
    const setOpen = (open) => {
      menu.classList.toggle('open', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      document.documentElement.style.overflow = open ? 'hidden' : '';
      window.__lenis?.[open ? 'stop' : 'start']?.();
      if (lines.length === 3) {
        lines[0].style.transform = open ? 'translateY(9px) rotate(45deg)' : '';
        lines[1].style.opacity = open ? '0' : '1';
        lines[2].style.transform = open ? 'translateY(-9px) rotate(-45deg)' : '';
      }
      menu.querySelectorAll('.m-link').forEach((l, i) => {
        l.style.transition = 'opacity .4s ease, transform .4s ease';
        l.style.transitionDelay = open ? `${0.08 + i * 0.06}s` : '0s';
        l.style.opacity = open ? '1' : '';
        l.style.transform = open ? '' : 'translateY(14px)';
        if (open) requestAnimationFrame(() => { l.style.opacity = '1'; });
      });
    };
    const toggle = () => setOpen(!menu.classList.contains('open'));
    const close = () => setOpen(false);
    const onMenuClick = (e) => {
      if (e.target.closest('a')) close();
    };
    burger.addEventListener('click', toggle);
    menu.addEventListener('click', onMenuClick);
    cleanups.push(() => {
      burger.removeEventListener('click', toggle);
      menu.removeEventListener('click', onMenuClick);
      document.documentElement.style.overflow = '';
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

/* ---------- логотип ×5 = party mode ---------- */
function initLogoEgg() {
  const logo = $('#site-logo');
  if (!logo || logo.dataset.eggBound) return () => {};
  logo.dataset.eggBound = '1';
  let clicks = 0;
  let timer = 0;
  const onClick = (e) => {
    clicks += 1;
    clearTimeout(timer);
    timer = setTimeout(() => { clicks = 0; }, 900);
    if (clicks === 5) {
      e.preventDefault();
      clicks = 0;
      document.body.style.filter = 'hue-rotate(140deg) saturate(1.4)';
      toast('PARTY MODE: тени танцуют 5 секунд', 'info');
      try { sfx('success'); } catch { /* ignore */ }
      setTimeout(() => { document.body.style.filter = ''; }, 5000);
    }
  };
  logo.addEventListener('click', onClick);
  return () => {
    logo.removeEventListener('click', onClick);
    delete logo.dataset.eggBound;
  };
}

/* ---------- секрет в консоли ---------- */
let consoleEggDone = false;
function initConsoleEgg() {
  if (consoleEggDone) return () => {};
  consoleEggDone = true;
  try {
    console.log(
      '%c SHADVOID %c тень видит, что ты открыл консоль. уважаю. ',
      'background:#c6ff3d;color:#060807;font-weight:bold;padding:4px 8px',
      'background:#0a0d0b;color:#c6ff3d;padding:4px 8px',
    );
    console.log('%cподсказка: ↑ ↑ ↓ ↓ ← → ← → B A', 'color:#ff5a1f;font-family:monospace');
    console.log('%cа ещё кликни по логотипу 5 раз. никому не рассказывай.', 'color:#93a092;font-family:monospace');
  } catch { /* ignore */ }
  return () => {};
}

/* ---------- случайный глитч заголовков ---------- */
function initGlitch() {
  const els = $$('[data-glitch-auto]');
  if (!els.length || isReducedMotion()) return () => {};
  let off = 0;
  const t = setInterval(() => {
    const el = els[(Math.random() * els.length) | 0];
    el.classList.add('glitching');
    clearTimeout(off);
    off = setTimeout(() => el.classList.remove('glitching'), 320 + Math.random() * 300);
  }, 2600);
  return () => {
    clearInterval(t);
    clearTimeout(off);
  };
}

/* ---------- boot ---------- */
let cleanups = [];
function cleanupAll() {
  const fns = cleanups;
  cleanups = [];
  fns.forEach((fn) => {
    try { fn(); } catch (err) { console.warn('[shadvoid] cleanup:', err); }
  });
}

/** Один упавший модуль не должен ронять весь boot (иначе контент останется невидимым). */
function safe(fn, name) {
  try {
    return fn();
  } catch (err) {
    console.error(`[shadvoid] ${name} failed:`, err);
    return () => {};
  }
}

// При первой загрузке boot() может вызваться дважды на одном документе
// (сразу + astro:page-load): второй вызов пропускаем, иначе задвоятся
// Lenis, rAF-циклы и ScrollTrigger'ы, а прелоадер оборвётся на старте.
let bootedDoc = false;
// Токен от гонки при быстрых переходах: пока boot ждёт dynamic import,
// может стартовать следующий — тогда текущий сворачивается сам.
let bootToken = 0;

async function boot() {
  if (bootedDoc) return;
  bootedDoc = true;
  const myToken = ++bootToken;
  cleanupAll();
  hydrateCovers(document);

  const c = [];
  c.push(safe(initAudio, 'audio'));
  c.push(safe(initPreloader, 'preloader'));
  c.push(safe(initCursor, 'cursor'));
  c.push(safe(initTrail, 'trail'));
  c.push(safe(initSmooth, 'smooth'));
  c.push(safe(() => initTilt(document), 'tilt'));
  c.push(safe(initMagnetic, 'magnetic'));
  c.push(safe(initReveal, 'reveal'));
  c.push(safe(initNav, 'nav'));
  c.push(safe(initTerminal, 'terminal'));
  c.push(safe(initKonami, 'konami'));
  c.push(safe(initLogoEgg, 'logo-egg'));
  c.push(safe(initConsoleEgg, 'console-egg'));
  c.push(safe(initGlitch, 'glitch'));
  c.push(safe(initContact, 'contact'));
  c.push(safe(initProjectsPage, 'projects-page'));
  c.push(safe(initProjectFallback, 'project-fallback'));
  c.push(safe(initStaticProject, 'static-project'));
  c.push(safe(initHomeSync, 'home-sync'));
  c.push(safe(initAdmin, 'admin'));

  const stale = () => myToken !== bootToken;
  const rollback = () => {
    c.forEach((fn) => {
      try { fn?.(); } catch { /* ignore */ }
    });
  };

  // тяжёлые штуки — лениво и только где нужно
  if (document.querySelector('[data-hero-3d]')) {
    try {
      const m = await import('./hero.js');
      if (stale()) { rollback(); return; }
      c.push(safe(m.initHero, 'hero'));
    } catch (err) {
      console.warn('[shadvoid] hero 3d off:', err);
    }
  }
  if (document.querySelector('[data-orbit]')) {
    try {
      const m = await import('./orbit.js');
      if (stale()) { rollback(); return; }
      c.push(safe(m.initOrbit, 'orbit'));
    } catch (err) {
      console.warn('[shadvoid] orbit off:', err);
    }
  }

  if (stale()) { rollback(); return; }
  cleanups = c.filter(Boolean);
  requestAnimationFrame(() => refreshTriggers());
  window.dispatchEvent(new CustomEvent('shadvoid:booted'));
}

document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => {
  bootedDoc = false;
  cleanupAll();
});
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
