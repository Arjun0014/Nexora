/**
 * Scene 2 — the world, held (src/components/scenes/Held.astro).
 *
 * Scroll: the arch arrives by a uniform scale (0.34 → 1) so the disc is always whole, then the scene holds still
 * for a while, then leaves the way ERA's amenities section does (content scales up and fades over the ground).
 *
 * Hold: `charge` rises while the pointer (or Space/Enter on the button) is held and falls when released.
 *   rate    video.playbackRate = 1 + 6 · charge²              the disc winds up, not linearly
 *   time    0.12 → 0.42  the sky runs through dusk to night    the page's day cycle, sped up
 *   lines   one per world at 0.46, 0.56, 0.66, 0.76, 0.86     with hysteresis so they do not flicker
 *   answer  at 0.97, and it stays: it is the scene's takeaway
 * Releasing runs time back to day over ~1.4 s.
 */
import { $, $$, clamp, smoothstep } from '../core/env';
import { gsap, ScrollTrigger, EASE } from '../core/motion';

const HOLD_S = 2.9;
const RELEASE_S = 1.4;
const THRESH = [0.46, 0.56, 0.66, 0.76, 0.86];
const ANSWER = 0.97;
const DAY = [0xc4, 0xd4, 0xdb], DUSK = [0xc2, 0x9a, 0x80], NIGHT = [0x17, 0x18, 0x26];

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

export function initHeld() {
  const root = $('[data-held]');
  if (!root) return;
  const video = $<HTMLVideoElement>('[data-held-video]', root)!;
  const motion = document.documentElement.classList.contains('motion');

  // Load the loop only when the scene is near; play only while it is on screen.
  let inView = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !video.src) { video.src = video.dataset.src!; video.preload = 'auto'; }
    inView = e.isIntersecting;
    if (inView && motion) video.play().catch(() => {}); else video.pause();
  }, { rootMargin: '60% 0px' }).observe(root);

  if (!motion) return;

  const stage = $('[data-held-stage]', root)!;
  const arch = $('[data-held-arch]', root)!;
  const lines = $$('[data-held-lines] > li', root);
  const answer = $('[data-held-answer]', root)!;
  const hint = $('[data-held-hint]', root)!;
  const button = $('[data-held-button]', root)!;
  const windowEl = $('.held__window', root)!;
  const clouds = $$('[data-held-cloud]', root);

  // ── scroll choreography ─────────────────────────────────────────────────────────────────
  gsap.timeline({ scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } })
    .fromTo(arch, { scale: 0.3 }, { scale: 1, ease: EASE.inOut, duration: 0.42 }, 0)
    .fromTo(clouds, { y: (i) => (i ? 180 : 120) }, { y: (i) => (i ? -260 : -180), ease: 'none', duration: 1 }, 0)
    .to(stage, { scale: 1.1, opacity: 0, ease: EASE.in, duration: 0.14 }, 0.86);

  // ── hold ────────────────────────────────────────────────────────────────────────────────
  let holding = false, charge = 0, shownRate = 1, done = false;
  const on = new Array(lines.length).fill(false);

  const start = (e?: Event) => { if (e?.cancelable) e.preventDefault(); holding = true; root.dataset.holding = ''; if (video.paused) video.play().catch(() => {}); wake(); };
  const stop = () => { holding = false; delete root.dataset.holding; };

  for (const el of [windowEl, button]) {
    el.addEventListener('pointerdown', (e) => { if ((e as PointerEvent).button === 0) { (el as HTMLElement).setPointerCapture?.((e as PointerEvent).pointerId); start(e); } });
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('lostpointercapture', stop);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  button.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); e.stopPropagation(); start(); } else if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
  button.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
  button.addEventListener('blur', stop);
  addEventListener('blur', stop);

  let running = false;
  const wake = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
  const tick = (_t: number, dtMs: number) => {
    const dt = Math.min(dtMs, 100) / 1000;
    charge = clamp(charge + (holding ? dt / HOLD_S : -dt / RELEASE_S));

    const rate = 1 + 6 * charge * charge;
    if (Math.abs(rate - shownRate) > 0.04 || (charge === 0 && shownRate !== 1)) { shownRate = charge === 0 ? 1 : rate; video.playbackRate = shownRate; }

    const t = smoothstep(0.12, 0.42, charge);
    const c = t < 0.5 ? mix(DAY, DUSK, t * 2) : mix(DUSK, NIGHT, (t - 0.5) * 2);
    root.style.setProperty('--bg', `rgb(${c[0]} ${c[1]} ${c[2]})`);
    root.style.setProperty('--charge', charge.toFixed(3));
    const night = t > 0.55;
    if (night !== root.hasAttribute('data-night')) { root.toggleAttribute('data-night', night); root.dataset.bg = night ? 'dark' : 'light'; dispatchEvent(new Event('nx:ground')); }

    lines.forEach((li, i) => {
      const want = on[i] ? charge > THRESH[i] - 0.06 : charge >= THRESH[i];
      if (want !== on[i]) { on[i] = want; li.toggleAttribute('data-on', want); }
    });
    if (!done && charge >= ANSWER) { done = true; answer.dataset.on = ''; hint.textContent = hint.dataset.again || hint.textContent; }

    if (!holding && charge === 0) { running = false; gsap.ticker.remove(tick); }
  };

  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onLeave: stop, onLeaveBack: stop });
  // The ground switches on at the moment the portal's dome has covered the screen (held's top reaches the top).
  ScrollTrigger.create({ trigger: root, start: 'top top', onEnter: () => { root.dataset.ground = ''; }, onLeaveBack: () => { delete root.dataset.ground; } });
}
