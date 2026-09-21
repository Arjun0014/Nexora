/**
 * Scene 1 — the portal (see src/components/scenes/Portal.astro).
 *
 * One scrubbed progress p over `.opening` drives everything, in two phases taken from ERA's hero:
 *   0 → 0.45 the dome rises from below the fold to 20% from the top, widening a little   (ease: inOut)
 *   0.45→0.9 it dives outward until it covers every corner and becomes the next ground   (ease: dive)
 * Meanwhile the title card lifts away faster than the film behind it, and the film pushes in.
 * The rim text turns continuously; scrolling speeds it up and it eases back when the page settles.
 */
import { $, $$, clamp, lerp } from '../core/env';
import { gsap, ScrollTrigger, EASE } from '../core/motion';
import { lenis } from '../core/scroll';

export function initPortal() {
  const opening = $('[data-opening]');
  const portal = $('[data-portal]');
  if (!opening || !portal || !document.documentElement.classList.contains('cinema')) return;

  const dome = $('[data-dome]', portal)!;
  const pin = $('.portal__pin', portal)!;
  const mark = $('[data-dome-mark]', portal)!;
  const clouds = $$<HTMLImageElement>('[data-cloud]', portal);
  const stage = $('[data-hero] [data-media]');
  const title = $('[data-hero] .hero__ui');
  const easeA = EASE.inOut;
  const easeB = EASE.dive;

  let p = 0;
  const render = () => {
    const vw = innerWidth, vh = innerHeight;
    const a = easeA(clamp(p / 0.45));
    const b = easeB(clamp((p - 0.45) / 0.45));
    const dA = lerp(Math.max(vw * 0.62, vh * 0.8), Math.max(vw * 1.08, vh * 1.25), a);
    const yA = lerp(vh * 1.04, vh * 0.2, a);
    const dEnd = Math.hypot(vw, vh) * 2.4;
    const d = lerp(dA, dEnd, b);
    const cy = lerp(yA + dA / 2, vh * 0.56 + dEnd * 0.05, b);
    pin.style.setProperty('--d', `${d.toFixed(1)}px`);
    pin.style.setProperty('--y', `${(cy - d / 2).toFixed(1)}px`);

    // Tell the header when the dome is behind it.
    const light = cy - d / 2 < 44 ? 'light' : '';
    if (portal.dataset.bg !== light) { portal.dataset.bg = light; dispatchEvent(new Event('nx:ground')); }
    mark.style.opacity = String(clamp(a * 1.6 - 0.4) * (1 - clamp(b * 3)));
    clouds.forEach((c) => {
      const k = parseFloat(c.dataset.cloud || '1');
      c.style.transform = `translate3d(0, ${(-p * k * vh * 1.1).toFixed(1)}px, 0)`;
    });
    if (stage) stage.style.transform = `scale(${(1 + 0.22 * easeA(p)).toFixed(4)})`;
    if (title) {
      const t = clamp(p / 0.55);
      title.style.transform = `translate3d(0, ${(-vh * 0.42 * EASE.in(t)).toFixed(1)}px, 0)`;
      title.style.opacity = String(1 - clamp(p / 0.4));
    }
  };

  ScrollTrigger.create({
    trigger: opening, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => { p = self.progress; render(); },
    onRefresh: (self) => { p = self.progress; render(); },
  });

  // The rim turns forever; scroll speed winds it up (ERA's logo: 30°/s + 10 × velocity).
  let angle = 0, speed = 9, dir = 1;
  lenis?.on('scroll', ({ velocity }: { velocity: number }) => {
    if (velocity) dir = velocity > 0 ? 1 : -1;
    speed = 9 + Math.min(120, Math.abs(velocity) * 6);
  });
  gsap.ticker.add((_t, dtMs) => {
    if (p <= 0 || p >= 1) return;
    const dt = Math.min(dtMs, 100) / 1000;
    speed += (9 - speed) * (1 - Math.exp(-dt / 0.6));
    angle += dir * speed * dt;
    dome.style.setProperty('--spin', `${angle.toFixed(2)}deg`);
  });
  render();
}
