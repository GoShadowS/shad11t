/**
 * SHADVOID — GSAP-слой: hero-интро, scroll-reveal'ы, счётчики,
 * параллакс, горизонтальная секция, xp-бары.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isReducedMotion } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

export function refreshTriggers() {
  try {
    ScrollTrigger.refresh();
  } catch { /* ignore */ }
}

/** Разбить текстовые узлы элемента на .char-спаны. */
function splitChars(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    for (const ch of node.textContent) {
      const s = document.createElement('span');
      if (ch === ' ' || ch === '\n' || ch === '\u00a0') {
        s.className = 'char-space';
        s.innerHTML = '&nbsp;';
      } else {
        s.className = 'char';
        s.textContent = ch;
      }
      frag.appendChild(s);
    }
    node.parentNode.replaceChild(frag, node);
  });
  return el.querySelectorAll('.char');
}

function splitWords(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(' '));
      } else {
        const s = document.createElement('span');
        s.className = 'w-word';
        s.textContent = part;
        frag.appendChild(s);
      }
    });
    node.parentNode.replaceChild(frag, node);
  });
  return el.querySelectorAll('.w-word');
}

export function initReveal() {
  if (isReducedMotion()) return () => {};

  // <details> (FAQ) меняют высоту страницы — пересчитываем триггеры
  const onToggle = () => {
    setTimeout(refreshTriggers, 60);
  };
  document.addEventListener('toggle', onToggle, true);

  const ctx = gsap.context(() => {
    /* ---------- hero-интро ---------- */
    const hero = document.querySelector('[data-hero]');
    if (hero) {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.1 });
      hero.querySelectorAll('[data-hero-line]').forEach((line, li) => {
        const chars = splitChars(line);
        gsap.set(chars, { yPercent: 115, rotate: 3 });
        tl.to(chars, { yPercent: 0, rotate: 0, duration: 0.85, stagger: 0.02 }, li * 0.12);
      });
      tl.fromTo(
        '[data-hero-fade]',
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 },
        '-=0.6',
      );
      const canvas = hero.querySelector('[data-hero-3d]');
      if (canvas) tl.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0);
    }

    /* ---------- обычные reveal'ы ---------- */
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      const kind = el.dataset.reveal || 'up';
      const delay = parseFloat(el.dataset.delay || '0');

      if (kind === 'chars') {
        const chars = splitChars(el);
        gsap.set(chars, { opacity: 0, y: 16 });
        gsap.set(el, { opacity: 1 });
        gsap.to(chars, {
          opacity: 1, y: 0, duration: 0.55, stagger: 0.014, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
        return;
      }

      if (kind === 'words') {
        const words = splitWords(el);
        gsap.set(el, { opacity: 1 });
        gsap.set(words, { opacity: 0.14 });
        gsap.to(words, {
          opacity: 1, stagger: 0.05, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 },
        });
        return;
      }

      const from = { up: { y: 46 }, left: { x: -60 }, right: { x: 60 }, scale: { scale: 0.92, y: 24 } }[kind] || { y: 46 };
      gsap.fromTo(
        el,
        { opacity: 0, ...from },
        {
          opacity: 1, x: 0, y: 0, scale: 1,
          duration: 1.05, ease: 'power3.out', delay,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        },
      );
    });

    /* ---------- счётчики ---------- */
    gsap.utils.toArray('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count || '0');
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            v: end,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = prefix + obj.v.toFixed(dec) + suffix;
            },
          });
        },
      });
    });

    /* ---------- параллакс ---------- */
    gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax || '0.15');
      gsap.to(el, {
        yPercent: speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('[data-parallax-wrap]') || el.parentElement || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    /* ---------- горизонтальная секция (десктоп) ---------- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px)', () => {
      gsap.utils.toArray('[data-h]').forEach((section) => {
        const track = section.querySelector('[data-h-track]');
        if (!track) return;
        const dist = () => Math.max(0, track.scrollWidth - section.clientWidth + 48);
        gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top+=70',
            end: () => `+=${dist()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      });
    });

    /* ---------- xp-бары ---------- */
    gsap.utils.toArray('[data-xp]').forEach((el) => {
      const v = Math.min(100, Math.max(0, parseFloat(el.dataset.xp || '0')));
      gsap.fromTo(
        el,
        { width: '0%' },
        {
          width: `${v}%`,
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 94%', once: true },
        },
      );
    });
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => refreshTriggers()).catch(() => {});
  }

  return () => {
    document.removeEventListener('toggle', onToggle, true);
    ctx.revert();
  };
}
