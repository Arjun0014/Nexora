/**
 * Scene 10 — for candidates (src/components/scenes/Candidates.astro).
 * While the section overlaps the end of the playbook, its pin scrolls up and the dome (fixed inside it at 20%
 * from the top) RISES by itself. Once pinned, the dome dives outward until it covers every corner (the portal's
 * second phase, same ease), then the content arrives. The rim turns; scrolling winds it up.
 */
import { $, clamp, lerp } from '../core/env';
import { gsap, ScrollTrigger, EASE } from '../core/motion';
import { lenis } from '../core/scroll';

export function initCandidates() {
  const root = $('[data-cnd]');
  if (!root || !document.documentElement.classList.contains('motion')) return;
  const dome = $('[data-cnd-dome]', root)!;
  const body = $('[data-cnd-body]', root)!;

  let pp = 0;
  const render = () => {
    const vw = innerWidth, vh = innerHeight;
    const d0 = Math.max(vw * 1.05, vh * 1.25), y0 = vh * 0.2;
    const b = EASE.dive(clamp(pp / 0.6));
    const dEnd = Math.hypot(vw, vh) * 2.4;
    const d = lerp(d0, dEnd, b), cy = lerp(y0 + d0 / 2, vh * 0.56 + dEnd * 0.05, b);
    dome.style.setProperty('--d', `${d.toFixed(1)}px`);
    dome.style.setProperty('--y', `${(cy - d / 2).toFixed(1)}px`);
    body.style.setProperty('--show', clamp((pp - 0.38) / 0.2).toFixed(3));
    root.toggleAttribute('data-live', pp > 0.4);
  };
  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => { pp = self.progress; render(); },
    onRefresh: (self) => { pp = self.progress; render(); },
  });
  render();

  let angle = 0, speed = 9, dir = 1, visible = false;
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
  lenis?.on('scroll', ({ velocity }: { velocity: number }) => { if (velocity) dir = velocity > 0 ? 1 : -1; speed = 9 + Math.min(120, Math.abs(velocity) * 6); });
  gsap.ticker.add((_t, dtMs) => {
    if (!visible) return;
    const dt = Math.min(dtMs, 100) / 1000;
    speed += (9 - speed) * (1 - Math.exp(-dt / 0.6));
    angle += dir * speed * dt;
    dome.style.setProperty('--spin', `${angle.toFixed(2)}deg`);
  });
}
