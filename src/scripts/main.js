/**
 * Shad11t — точка входа клиентских скриптов.
 * boot() выполняется при первой загрузке и при каждом переходе (astro:page-load).
 */

import { $, $$, scrollToTarget, toast, isReducedMotion } from './utils.js';
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
import { initI18n } from './i18n.js';

/* ---------- защита от открытия кода элемента / DevTools (разрешено для вошедшего админа) ---------- */
function initInspectGuard() {
  const isDevToolsAllowed = () => {
    try {
      const s = JSON.parse(sessionStorage.getItem('shad11t_admin_session_v2') || 'null');
      if (s && Date.now() - (s.ts || 0) < 12 * 3600 * 1000) return true;
    } catch { /* ignore */ }
    return false;
  };

  // Если пользователь авторизован в админ-панели — блокировку полностью снимаем
  if (isDevToolsAllowed()) {
    return () => {};
  }

  // 1. Отключение контекстного меню (ПКМ) для гостей
  const onContext = (e) => {
    if (isDevToolsAllowed()) return;
    // Разрешаем контекстное меню только внутри полей ввода
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
    return false;
  };

  // 2. Блокировка клавиш DevTools для гостей (F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Option+I/J/C, Cmd+Option+U)
  const onKeyDown = (e) => {
    if (isDevToolsAllowed()) return;
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      toast('Исходный код защищён. Войдите в /admin для доступа к DevTools.');
      return false;
    }
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
    const shiftOrAlt = e.shiftKey || e.altKey;
    const k = e.key?.toLowerCase();

    if ((ctrlOrCmd && shiftOrAlt && (k === 'i' || k === 'j' || k === 'c')) || (ctrlOrCmd && (k === 'u' || k === 's'))) {
      e.preventDefault();
      e.stopPropagation();
      toast('Просмотр кода заблокирован (доступен в режиме администратора)');
      return false;
    }
  };

  document.addEventListener('contextmenu', onContext);
  document.addEventListener('keydown', onKeyDown, true);

  return () => {
    document.removeEventListener('contextmenu', onContext);
    document.removeEventListener('keydown', onKeyDown, true);
  };
}

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
    try { fn(); } catch (err) { console.warn('[shad11t] cleanup:', err); }
  });
}

function safe(fn, name) {
  try {
    return fn();
  } catch (err) {
    console.error(`[shad11t] ${name} failed:`, err);
    return () => {};
  }
}

let bootedDoc = false;
let bootToken = 0;

async function boot() {
  if (bootedDoc) return;
  bootedDoc = true;
  const myToken = ++bootToken;
  cleanupAll();
  hydrateCovers(document);

  const c = [];
  c.push(safe(initInspectGuard, 'inspect-guard'));
  c.push(safe(initI18n, 'i18n'));
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

  // 3D / Orbit — лениво
  if (document.querySelector('[data-hero-3d]')) {
    try {
      const m = await import('./hero.js');
      if (stale()) { rollback(); return; }
      c.push(safe(m.initHero, 'hero'));
    } catch (err) {
      console.warn('[shad11t] hero 3d off:', err);
    }
  }
  if (document.querySelector('[data-orbit]')) {
    try {
      const m = await import('./orbit.js');
      if (stale()) { rollback(); return; }
      c.push(safe(m.initOrbit, 'orbit'));
    } catch (err) {
      console.warn('[shad11t] orbit off:', err);
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
