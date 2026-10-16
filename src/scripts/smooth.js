/**
 * SHADVOID — Lenis smooth scroll + связка с GSAP ScrollTrigger.
 * Хранит инстанс в window.__lenis для scrollTo из других модулей.
 */

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, isReducedMotion } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

export function initSmooth() {
  if (isReducedMotion()) {
    window.__lenis = null;
    return () => {};
  }

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  });
  window.__lenis = lenis;

  const onScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onScroll);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // якоря через lenis
  const onClick = (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -70, duration: 1.4 });
    history.replaceState(null, '', id);
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    gsap.ticker.remove(raf);
    lenis.off('scroll', onScroll);
    lenis.destroy();
    if (window.__lenis === lenis) window.__lenis = null;
  };
}
