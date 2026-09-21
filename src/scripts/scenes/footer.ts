/**
 * The footer (src/components/Footer.astro). One scrubbed progress over its pinned stage:
 *   0.00 → 0.70  the full-bleed photograph draws inward into the arch (--c 0 → 1, ease inOut)
 *   0.35 → 0.85  the footer's content arrives, scaling up from 0.92 (--show)
 */
import { $, clamp } from '../core/env';
import { ScrollTrigger, EASE } from '../core/motion';

export function initFooter() {
  const root = $('[data-ft]');
  if (!root || !document.documentElement.classList.contains('motion') || innerWidth < 900) return;
  const photo = $('[data-ft-photo]', root)!;
  const render = (q: number) => {
    photo.style.setProperty('--c', EASE.inOut(clamp(q / 0.7)).toFixed(4));
    root.style.setProperty('--show', EASE.out(clamp((q - 0.35) / 0.5)).toFixed(4));
  };
  render(0);
  ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (s) => render(s.progress), onRefresh: (s) => render(s.progress) });
}
