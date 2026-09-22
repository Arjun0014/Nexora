/**
 * Smooth scrolling for the page (Lenis, ERA's settings) driven from GSAP's ticker so ScrollTrigger and Lenis
 * read the same frame.
 *
 * The hero owns wheel gestures while the film is playing: its listener is registered first and calls
 * preventDefault on every event of a gesture it claims. Lenis is told to ignore any event that has already been
 * cancelled, so the two can never both act on one gesture. Touch stays native (Lenis' default).
 */
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './motion';

export let lenis: Lenis | null = null;

export function initScroll() {
  const html = document.documentElement;
  if (!html.classList.contains('motion')) return;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 2,
    virtualScroll: (data) => !data.event.defaultPrevented,
    anchors: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Nothing scrolls under the intro; the page starts at the top every time.
  if (html.dataset.intro) {
    lenis.stop();
    addEventListener('nx:intro-done', () => lenis!.start(), { once: true });
  }
  if (!location.hash) lenis.scrollTo(0, { immediate: true });

  // A phone's address bar sliding away changes only the height, a little. The pins are sized in svh, so nothing
  // needs measuring again — and a refresh mid-scroll is what makes a pinned scene jump. Real resizes and turning the
  // phone still refresh.
  ScrollTrigger.config({ ignoreMobileResize: true });
  let t = 0, lastW = innerWidth, lastH = innerHeight;
  const coarse = matchMedia('(pointer: coarse)');
  addEventListener('resize', () => {
    const w = innerWidth, h = innerHeight;
    if (coarse.matches && w === lastW && Math.abs(h - lastH) < 160) return;
    lastW = w; lastH = h;
    clearTimeout(t); t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
  });
}

/** Scroll to an element or offset with the site's easing (anchors, index buttons). */
export function scrollToTarget(target: number | string | HTMLElement, offset = 0) {
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
  else {
    const y = typeof target === 'number' ? target : (typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target)?.getBoundingClientRect().top ?? 0;
    window.scrollTo({ top: (typeof target === 'number' ? y : y + scrollY) + offset });
  }
}
