/**
 * Scene 2 — the world, held (src/components/scenes/Held.astro).
 *
 * The moon is a circle clip on a full-stage layer (`.hx`). Everything is drawn from one proxy `P` by `render()`:
 *   P.open   0 → 1   the circle's radius, from the moon to beyond every corner
 *   P.zoom           the camera on the disc (1 = the disc whole inside the moon)
 *   P.rate           the loop's playbackRate
 *   P.dim            the page drawing back (headline, clouds, copy recede and blur)
 *   P.streak         the amber light rushing past from the centre
 *   W[k].r / W[k].z  each world's iris (0 → covering) and its push-in
 *   P.ret            the disc irising back over the last world
 *
 * HOLDING plays one timeline (seconds):
 *   0.0 – 1.2  open      the moon becomes the screen; the camera starts to fall into the disc
 *   1.2 – 2.1  plunge    zoom 1.7 → 3.4, the disc winds up to 6x, the streaks at full rush
 *   1.9 → 8.0  worlds    five irises, each shorter than the last (1.5 … 1.0 s): burst open from the centre with
 *                        a lit rim, push in, the world's line set large, its colour in the light
 *   8.0 → 9.0  return    the disc irises back on top and pulls all the way out: all five at full spin
 *   8.9        answer    "Behind all five, people. We supply them." It stays while you hold.
 * LETTING GO plays a collapse from wherever you are: the circle closes back to the moon (0.95 s), the page returns.
 * Pressing again mid-collapse re-opens from the current size (the timeline is invalidated, not restarted cold).
 */
import { $, $$, clamp, lerp } from '../core/env';
import { gsap, ScrollTrigger, SplitText, EASE } from '../core/motion';

const STARTS = [1.9, 3.4, 4.75, 5.95, 7.05];
const DURS = [1.5, 1.35, 1.2, 1.1, 1.0];
const FIN = STARTS[4] + DURS[4]; // 8.05
const ANSWER_AT = FIN + 0.9;

export function initHeld() {
  const root = $('[data-held]');
  if (!root) return;
  const video = $<HTMLVideoElement>('[data-held-video]', root)!;
  const motion = document.documentElement.classList.contains('motion');

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !video.src) { video.src = video.dataset.src!; video.preload = 'auto'; }
    if (e.isIntersecting && motion) video.play().catch(() => {}); else video.pause();
  }, { rootMargin: '60% 0px' }).observe(root);
  if (!motion) return;

  const pin = $('[data-held-pin]', root)!;
  const stage = $('[data-held-stage]', root)!;
  const hx = $('[data-hx]', root)!;
  const disc = $('[data-hx-disc]', root)!;
  const worldEls = $$('[data-hx-world]', root);
  const ret = $('[data-hx-return]', root)!;
  const texts = $$('[data-hx-text]', root);
  const ticks = $$('[data-hx-tick]', root);
  const canvas = $<HTMLCanvasElement>('[data-hx-streaks]', root)!;
  const target = $('[data-hx-target]', root)!;
  const button = $('[data-held-button]', root)!;
  const hint = $('[data-held-hint]', root)!;
  const rim = $('.hx__rim', root)!;
  const answer = $('.held__answer', root)!;
  const clouds = $$('[data-held-cloud]', root);
  const header = $('[data-header]');
  $$<HTMLImageElement>('img', hx).forEach((i) => { i.loading = 'eager'; });

  // ── state ────────────────────────────────────────────────────────────────────────────────
  const P = { open: 0, zoom: 1, rate: 1, dim: 0, streak: 0, ret: 0 };
  const W = worldEls.map(() => ({ r: 0, z: 1.3 }));
  const T = ticks.map(() => ({ f: 0 }));
  let s = 0.3, exit = 0; // from scroll: the moon's arrival scale, and the scene's departure
  let holding = false, done = false, raised = false;

  // ── geometry + drawing ──────────────────────────────────────────────────────────────────
  let Wd = 0, Hd = 0, D = 0, cx = 0, cy = 0, cover = 0;
  const measure = () => {
    Wd = pin.clientWidth; Hd = pin.clientHeight;
    const phone = Wd < 768;
    D = phone ? Math.min(Wd * 0.84, Hd * 0.52) : Math.min(Hd * 0.62, Wd * 0.44);
    cx = Wd / 2; cy = Hd * (phone ? 0.62 : 0.59);
    cover = Math.hypot(Math.max(cx, Wd - cx), Math.max(cy, Hd - cy)) + 12;
    canvas.width = Wd; canvas.height = Hd;
  };

  let shownRate = 1;
  const render = () => {
    const Rm = (D / 2) * s;
    const R = lerp(Rm, cover, P.open);
    for (const el of [hx, rim, target]) { el.style.setProperty('--cx', `${cx}px`); el.style.setProperty('--cy', `${cy}px`); }
    hx.style.setProperty('--R', `${R.toFixed(1)}px`);
    rim.style.setProperty('--R', `${R.toFixed(1)}px`);
    target.style.setProperty('--Rm', `${Rm.toFixed(1)}px`);
    root.style.setProperty('--open', P.open.toFixed(3));

    // the camera on the disc: scale about the disc's centre (49% / 41% of the frame)
    const vw = D * 1.18, z = s * P.zoom;
    hx.style.setProperty('--vw', `${vw.toFixed(1)}px`);
    video.style.transform = `translate3d(${(cx - 0.49 * vw * z).toFixed(1)}px, ${(cy - 0.41 * vw * 0.5625 * z).toFixed(1)}px, 0) scale(${z.toFixed(4)})`;

    worldEls.forEach((el, k) => {
      const r = W[k].r * cover;
      el.style.visibility = r > 0.5 ? 'visible' : 'hidden';
      el.style.setProperty('--wr', `${r.toFixed(1)}px`);
      el.style.setProperty('--wz', W[k].z.toFixed(4));
    });
    ticks.forEach((t, k) => t.style.setProperty('--f', T[k].f.toFixed(3)));
    // the return: the disc is raised above the worlds and irised open over them
    disc.style.zIndex = raised ? '2' : '';
    disc.toggleAttribute('data-raised', raised);
    disc.style.clipPath = raised ? `circle(${(P.ret * cover).toFixed(1)}px at ${cx}px ${cy}px)` : '';
    ret.style.zIndex = raised ? '3' : '';
    ret.style.visibility = raised && P.ret > 0.001 && P.ret < 0.999 ? 'visible' : 'hidden';
    ret.style.setProperty('--wr', `${(P.ret * cover).toFixed(1)}px`);

    // the page draws back; the scene departs on scroll
    const d = P.dim;
    stage.style.opacity = String((1 - d) * (1 - exit));
    stage.style.transform = `scale(${((1 - 0.06 * d) * (1 + 0.1 * exit)).toFixed(4)})`;
    stage.style.filter = d > 0.01 ? `blur(${(d * 6).toFixed(2)}px)` : '';
    clouds.forEach((c) => { c.style.opacity = String(0.9 * (1 - d)); });
    hx.style.opacity = String(1 - exit);
    hx.style.scale = String(1 + 0.1 * exit);
    rim.style.opacity = String((1 - P.open) * (1 - exit));
    button.style.opacity = String(1 - exit);
    answer.style.visibility = exit > 0.9 ? 'hidden' : '';

    const charge = holding ? clamp(tl.time() / ANSWER_AT) : done ? 1 : 0;
    root.style.setProperty('--charge', charge.toFixed(3));
    document.documentElement.style.setProperty('--hold', charge.toFixed(3));

    if (Math.abs(P.rate - shownRate) > 0.05) { shownRate = P.rate; video.playbackRate = Math.min(8, Math.max(0.5, P.rate)); }
  };

  // ── the light rushing past ──────────────────────────────────────────────────────────────
  const ctx = canvas.getContext('2d')!;
  const parts = Array.from({ length: 170 }, () => ({ a: Math.random() * Math.PI * 2, d: Math.random(), v: 0.4 + Math.random() * 0.9, w: 0.6 + Math.random() * 1.6, hot: Math.random() < 0.3 }));
  const streaks = (dt: number) => {
    ctx.clearRect(0, 0, Wd, Hd);
    const k = P.streak;
    if (k < 0.01) return;
    const far = cover * 1.05;
    for (const p of parts) {
      p.d += dt * p.v * (0.15 + 2.6 * k) * (0.25 + p.d);
      if (p.d > 1.15) { p.d = Math.random() * 0.08; p.a = Math.random() * Math.PI * 2; }
      const len = (0.015 + 0.22 * k * p.d) * far;
      const r0 = p.d * far, r1 = r0 + len;
      const ca = Math.cos(p.a), sa = Math.sin(p.a);
      const alpha = k * Math.min(1, p.d * 4) * (p.hot ? 0.9 : 0.45);
      ctx.strokeStyle = p.hot ? `rgba(255,214,168,${alpha.toFixed(3)})` : `rgba(232,160,98,${alpha.toFixed(3)})`;
      ctx.lineWidth = p.w * (0.5 + p.d);
      ctx.beginPath(); ctx.moveTo(cx + ca * r0, cy + sa * r0); ctx.lineTo(cx + ca * r1, cy + sa * r1); ctx.stroke();
    }
  };

  // ── the lines ────────────────────────────────────────────────────────────────────────────
  const splits = texts.map((t) => $$('.hx__t', t).flatMap((el) => new SplitText(el, { type: 'words,chars', wordsClass: 'word', charsClass: 'char' }).chars as HTMLElement[]));
  const labels = texts.map((t) => $('.hx__k', t));
  const showText = (i: number) => {
    const t = texts[i];
    t.style.visibility = 'visible';
    if (labels[i]) gsap.fromTo(labels[i], { opacity: 0, y: 14 }, { opacity: 0.9, y: 0, duration: 0.6, ease: EASE.out, overwrite: true });
    gsap.fromTo(splits[i], { opacity: 0, yPercent: 60, rotateX: -80 }, { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.85, ease: EASE.out, stagger: 0.014, overwrite: true });
  };
  const hideText = (i: number, fast = false) => {
    const t = texts[i];
    if (t.style.visibility !== 'visible') return;
    if (labels[i]) gsap.to(labels[i], { opacity: 0, duration: 0.25, overwrite: true });
    gsap.to(splits[i], { opacity: 0, yPercent: -40, rotateX: 60, duration: fast ? 0.22 : 0.34, ease: EASE.in, stagger: 0.004, overwrite: true,
      onComplete: () => { t.style.visibility = 'hidden'; } });
  };

  // ── the dive ─────────────────────────────────────────────────────────────────────────────
  // zoom at which the whole disc sits comfortably on screen: 60% of a wide stage, 95% of a phone's width
  // (the disc is 86% of D wide at zoom 1)
  const fullZoom = () => ((Wd < 768 ? 0.95 * Wd : 0.6 * Math.min(Wd, Hd * 1.5)) / (0.86 * Math.max(1, D)));
  const tl = gsap.timeline({ paused: true, onUpdate: render });
  tl.to(P, { open: 1, duration: 1.2, ease: EASE.inOut }, 0)
    .to(P, { dim: 1, duration: 0.8, ease: 'power2.out' }, 0)
    .to(P, { zoom: 1.7, duration: 1.2, ease: 'power2.in' }, 0)
    .to(P, { zoom: 3.4, duration: 0.9, ease: 'power2.in' }, 1.2)
    .to(P, { rate: 6, duration: 2.1, ease: 'power1.in' }, 0)
    .to(P, { streak: 1, duration: 1.5, ease: 'power2.in' }, 0.25);
  STARTS.forEach((st, k) => {
    tl.fromTo(W[k], { r: 0 }, { r: 1, duration: 0.62, ease: EASE.inOut, immediateRender: false }, st)
      .fromTo(W[k], { z: 1.32 }, { z: 1.02, duration: DURS[k] + 0.9, ease: 'power2.out', immediateRender: false }, st)
      .fromTo(T[k], { f: 0 }, { f: 1, duration: DURS[k], ease: 'none', immediateRender: false }, st)
      .call(() => showText(k), [], st + 0.22)
      .call(() => hideText(k), [], st + DURS[k] - 0.05);
  });
  tl.call(() => { raised = true; }, [], FIN)
    .fromTo(P, { ret: 0 }, { ret: 1, duration: 0.85, ease: EASE.inOut, immediateRender: false }, FIN)
    .to(P, { zoom: () => fullZoom(), duration: 1.5, ease: EASE.out }, FIN)
    .to(P, { rate: 2.4, duration: 1.8, ease: 'power2.out' }, FIN)
    .to(P, { streak: 0.2, duration: 1.2, ease: 'power2.out' }, FIN)
    .call(() => { showText(5); if (!done) { done = true; root.dataset.done = ''; hint.textContent = hint.dataset.again || hint.textContent; } }, [], ANSWER_AT)
    .to({}, { duration: 0.6 });

  // ── press / release ─────────────────────────────────────────────────────────────────────
  let collapse: gsap.core.Tween | null = null;
  let looping = false, last = 0;
  const loop = (time: number) => { const dt = last ? Math.min(0.05, time - last) : 0.016; last = time; streaks(dt); };
  const startLoop = () => { if (!looping) { looping = true; last = 0; gsap.ticker.add(loop); } };
  const stopLoop = () => { if (looping) { looping = false; gsap.ticker.remove(loop); ctx.clearRect(0, 0, Wd, Hd); } };

  const reset = () => {
    tl.pause(0);
    raised = false; P.ret = 0;
    W.forEach((w) => { w.r = 0; w.z = 1.3; }); T.forEach((t) => { t.f = 0; });
    worldEls.forEach((el) => { el.style.opacity = ''; });
    texts.forEach((t) => { t.style.visibility = 'hidden'; });
    if (header) header.dataset.hidden = 'false';
    render();
    stopLoop();
  };
  const press = (e?: Event) => {
    if (e?.cancelable) e.preventDefault();
    if (holding) return;
    holding = true; root.dataset.holding = '';
    collapse?.kill(); collapse = null;
    worldEls.forEach((el) => { gsap.killTweensOf(el); el.style.opacity = ''; });
    if (video.paused) video.play().catch(() => {});
    if (header) header.dataset.hidden = 'true';
    tl.invalidate().restart();
    startLoop();
  };
  const release = () => {
    if (!holding) return;
    holding = false; delete root.dataset.holding;
    tl.pause();
    texts.forEach((_, i) => hideText(i, true));
    gsap.to(worldEls, { opacity: 0, duration: 0.45, delay: 0.35, ease: 'power1.in' });
    collapse = gsap.to(P, { open: 0, dim: 0, zoom: 1, rate: 1, streak: 0, duration: 0.95, ease: EASE.inOut, onUpdate: render, onComplete: reset });
  };

  for (const el of [target, button]) {
    el.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; el.setPointerCapture?.(e.pointerId); press(e); });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  button.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(); } });
  button.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
  button.addEventListener('blur', release);
  addEventListener('blur', release);

  // ── scroll: the moon arrives, the scene departs ─────────────────────────────────────────
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.5,
    onUpdate: (self) => {
      const p = self.progress;
      s = lerp(0.3, 1, EASE.inOut(clamp(p / 0.42)));
      exit = EASE.in(clamp((p - 0.86) / 0.14));
      render();
    },
    onRefresh: () => { measure(); render(); },
  });
  gsap.fromTo(clouds, { y: (i) => (i ? 180 : 120) }, { y: (i) => (i ? -260 : -180), ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onLeave: release, onLeaveBack: release });
  ScrollTrigger.create({ trigger: root, start: 'top top', onEnter: () => { root.dataset.ground = ''; }, onLeaveBack: () => { delete root.dataset.ground; } });
  addEventListener('resize', () => { measure(); render(); });
  measure();
  render();
}
