/**
 * Subpage heads (src/components/ui/PageHead.astro): the arch opens to full bleed as the photograph rises from
 * the bottom of the viewport to a fifth from the top (ERA's window), and the clouds drift on their own parallax.
 */
import { $, $$, clamp } from './core/env';
import { gsap, ScrollTrigger, EASE } from './core/motion';

export function initPageHead() {
  const plate = $('[data-ph-plate]');
  if (!document.documentElement.classList.contains('motion')) return;
  if (plate) {
    const set = (p: number) => plate.style.setProperty('--o', EASE.inOut(clamp(p)).toFixed(4));
    set(0);
    ScrollTrigger.create({ trigger: plate, start: 'top 95%', end: 'top 15%', scrub: true, onUpdate: (s) => set(s.progress), onRefresh: (s) => set(s.progress) });
  }
  $$<HTMLElement>('[data-ph-cloud]').forEach((c) => {
    gsap.fromTo(c, { y: 0 }, { y: `${c.dataset.phCloud}vh`, ease: 'none', scrollTrigger: { trigger: c.parentElement!, start: 'top top', end: 'bottom top', scrub: 0.5 } });
  });
}
