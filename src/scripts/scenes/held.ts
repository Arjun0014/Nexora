/**
 * Scene 2 — the world, held (src/components/scenes/Held.astro). Everything in the portal is drawn on one canvas.
 *
 * The idea is the model itself: one world divided into five sectors. At rest the canvas draws the moon — the disc
 * footage in a circle. Holding it plays one timeline:
 *   lift     (0 – 1.0 s)  the page draws back to night; the circle grows; an instrument dial draws itself around it —
 *                         a fine ring, ticks, five hairline spokes, turning slowly like a watch face
 *   part     (0.85 – 2.2) the disc splits along its five sectors, the seams lit amber, the slices drawing apart; in
 *                         each slice the footage gives way to that world's scene, held upright while the slices turn
 *   bloom    (2.4 – 3.5)  the slices grow past the edges: the whole screen becomes one radial composition of the
 *                         five worlds, turning
 *   dial     (3.4 – 8.4)  one world at a time sweeps round like a clock hand to take the screen, with its line
 *   close    (8.4 – 9.9)  back to five equal slices, back into the circle; the seams close, the footage returns, the
 *                         answer arrives
 * Letting go at any point tweens every parameter back to rest from wherever it is: the slices close into the moon.
 *
 * Parameters (all drawn by `draw()` every frame while visible):
 *   g      0 moon → 1 large circle → 2 beyond every corner        ex    how far the slices have drawn apart
 *   M[k]   footage → world scene, per slice                       Wt[k] share of the circle, per slice (the dial)
 *   guide  the instrument dial            seam  the lit seams      lab   the world names at the rim
 *   dim    the page drawing back          sp    the turning speed  rate  the footage's playbackRate
 */
import { $, $$, clamp, lerp } from '../core/env';
import { gsap, ScrollTrigger, SplitText, EASE } from '../core/motion';
import { worlds } from '../../data/worlds';
import { held } from '../../data/content';

const TAU = Math.PI * 2;
const DIAL0 = 3.4, DIAL_STEP = 1.0;
const CLOSE = DIAL0 + 5 * DIAL_STEP; // 8.4
const ANSWER_AT = CLOSE + 1.5;
const AMBER = '240,189,134';

export function initHeld() {
  const root = $('[data-held]');
  if (!root) return;
  const video = $<HTMLVideoElement>('[data-held-video]', root)!;
  if (!document.documentElement.classList.contains('motion')) return;

  const pin = $('[data-held-pin]', root)!;
  const stage = $('[data-held-stage]', root)!;
  const hx = $('[data-hx]', root)!;
  const canvas = $<HTMLCanvasElement>('[data-hx-canvas]', root)!;
  const ctx = canvas.getContext('2d')!;
  const texts = $$('[data-hx-text]', root);
  const target = $('[data-hx-target]', root)!;
  const button = $('[data-held-button]', root)!;
  const hint = $('[data-held-hint]', root)!;
  const answer = $('.held__answer', root)!;
  const clouds = $$('[data-held-cloud]', root);
  const header = $('[data-header]');

  // ── sources ──────────────────────────────────────────────────────────────────────────────
  const order = held.lines.map((l) => worlds.findIndex((w) => w.id === l.world));
  const imgs: HTMLImageElement[] = [];
  const focusX = order.map((wi) => parseFloat(worlds[wi].focus) / 100 || 0.5);
  const loadSources = () => {
    if (!video.src) { video.src = video.dataset.src!; video.preload = 'auto'; }
    if (imgs.length) return;
    const portrait = innerWidth / innerHeight < 1;
    held.lines.forEach((l) => { const im = new Image(); im.decoding = 'async'; im.src = `/media/hero/rest/${l.world}${portrait ? '-m' : '-hd'}.webp`; imgs.push(im); });
  };
  // The footage, feathered into the night (the frame's rectangle must never show inside the circle).
  const ofs = document.createElement('canvas');
  const octx = ofs.getContext('2d')!;
  const maskedVideo = () => {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || video.readyState < 2) return null;
    if (ofs.width !== vw) { ofs.width = vw; ofs.height = vh; }
    octx.globalCompositeOperation = 'source-over';
    octx.drawImage(video, 0, 0, vw, vh);
    octx.save();
    octx.globalCompositeOperation = 'destination-in';
    octx.translate(vw * 0.49, vh * 0.41);
    octx.scale(1, (0.62 * vh) / (0.58 * vw));
    const g = octx.createRadialGradient(0, 0, 0, 0, 0, 0.58 * vw);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    octx.fillStyle = g; octx.fillRect(-vw, -vh * 2, vw * 2, vh * 4);
    octx.restore();
    return ofs;
  };

  // ── state ────────────────────────────────────────────────────────────────────────────────
  const REST = { g: 0, ex: 0, guide: 0, seam: 0, lab: 0, dim: 0, sp: 0.1, rate: 1 };
  const P = { ...REST };
  const M = order.map(() => ({ m: 0 }));
  const Wt = order.map(() => ({ w: 1 }));
  let rot = -Math.PI / 2;
  let s = 0.3, exit = 0; // scroll: the moon's arrival scale, the scene's departure
  let holding = false, done = false;

  // ── geometry ─────────────────────────────────────────────────────────────────────────────
  let Wd = 0, Hd = 0, dpr = 1, D = 0, cx = 0, cy = 0, cover = 0, minD = 0, Rbig = 0;
  const measure = () => {
    Wd = pin.clientWidth; Hd = pin.clientHeight; dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Hd * dpr);
    const phone = Wd < 768;
    D = phone ? Math.min(Wd * 0.84, Hd * 0.52) : Math.min(Hd * 0.62, Wd * 0.44);
    cx = Wd / 2; cy = Hd * (phone ? 0.62 : 0.59);
    minD = Math.min(Wd, Hd);
    Rbig = phone ? Wd * 0.46 : minD * 0.43;
    cover = Math.hypot(Math.max(cx, Wd - cx), Math.max(cy, Hd - cy)) + 20;
  };
  const radius = () => (P.g <= 1 ? lerp((D / 2) * s, Rbig, EASE.ease(P.g)) : lerp(Rbig, cover, P.g - 1));
  // the circle's centre: the moon's place at rest, the middle of the screen once it has grown
  const centre = () => [cx, lerp(cy, Hd / 2, clamp(P.g))];

  // ── drawing ──────────────────────────────────────────────────────────────────────────────
  const drawDisc = (x: number, y: number, R: number) => {
    const v = maskedVideo();
    if (!v) return;
    const vw = 2.36 * R, vh = vw * (v.height / v.width);
    ctx.drawImage(v, x - 0.49 * vw, y - 0.41 * vh, vw, vh);
  };
  const drawWorld = (k: number, ox: number, oy: number, mix: number) => {
    const im = imgs[k];
    if (!im || !im.complete || !im.naturalWidth) return;
    const z = 1.14 - 0.08 * mix;
    const sc = Math.max(Wd / im.naturalWidth, Hd / im.naturalHeight) * z;
    const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    const x = (Wd - w) * focusX[k] + ox * 0.5, y = (Hd - h) / 2 + oy * 0.5;
    ctx.globalAlpha = mix;
    ctx.drawImage(im, x, y, w, h);
    ctx.globalAlpha = 1;
  };
  const charge = () => (holding ? clamp(tl.time() / ANSWER_AT) : done ? 1 : 0);

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wd, Hd);
    const R = radius();
    const [x0, y0] = centre();
    const e = P.ex * minD;
    const total = Wt.reduce((a, b) => a + b.w, 0);
    const spans = Wt.map((t) => (t.w / total) * TAU);
    const whole = e < 0.3 && M.every((q) => q.m < 0.001);
    const discR = P.g <= 1 ? R : Rbig * (1 + (P.g - 1) * 0.6);

    // the night behind the circle, as the page draws back
    if (P.dim > 0.001) {
      const g = ctx.createRadialGradient(x0, y0, 0, x0, y0, cover);
      g.addColorStop(0, `rgba(29,23,19,${P.dim})`); g.addColorStop(1, `rgba(10,8,9,${P.dim})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
    }

    // the instrument dial
    if (P.guide > 0.01 && R < cover) {
      ctx.save();
      ctx.strokeStyle = `rgba(${AMBER},${0.35 * P.guide})`; ctx.lineWidth = 1;
      for (const k of [1.07, 1.17]) { ctx.beginPath(); ctx.arc(x0, y0, R * k, 0, TAU); ctx.stroke(); }
      const t0 = rot * 0.35;
      for (let i = 0; i < 120; i++) {
        const a = t0 + (i / 120) * TAU, major = i % 24 === 0, r0 = R * 1.085, r1 = R * (major ? 1.155 : i % 6 === 0 ? 1.125 : 1.105);
        ctx.globalAlpha = P.guide * (major ? 0.9 : 0.45);
        ctx.beginPath(); ctx.moveTo(x0 + Math.cos(a) * r0, y0 + Math.sin(a) * r0); ctx.lineTo(x0 + Math.cos(a) * r1, y0 + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.globalAlpha = P.guide * 0.5;
      let a = rot;
      for (const sp of spans) { // the five spokes carry on past the rim to the edge of the screen
        ctx.beginPath(); ctx.moveTo(x0 + Math.cos(a) * R * 1.2, y0 + Math.sin(a) * R * 1.2); ctx.lineTo(x0 + Math.cos(a) * cover, y0 + Math.sin(a) * cover); ctx.stroke();
        a += sp;
      }
      ctx.restore();
    }

    if (whole) {
      // the moon: one circle of footage
      ctx.save(); ctx.beginPath(); ctx.arc(x0, y0, R, 0, TAU); ctx.clip();
      ctx.fillStyle = '#0f0c0b'; ctx.fillRect(x0 - R, y0 - R, R * 2, R * 2);
      drawDisc(x0, y0, discR);
      ctx.restore();
    } else {
      let a = rot;
      spans.forEach((sp, k) => {
        const a0 = a, a1 = a + sp; a = a1;
        if (sp < 0.004) return;
        const mid = (a0 + a1) / 2, ox = Math.cos(mid) * e, oy = Math.sin(mid) * e;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(x0 + ox, y0 + oy); ctx.arc(x0 + ox, y0 + oy, R, a0, a1); ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#0f0c0b'; ctx.fillRect(0, 0, Wd, Hd);
        if (M[k].m < 0.999) drawDisc(x0 + ox, y0 + oy, discR);
        if (M[k].m > 0.001) drawWorld(k, ox, oy, M[k].m);
        ctx.restore();
      });
      // the lit seams
      if (P.seam > 0.01) {
        ctx.save();
        ctx.strokeStyle = `rgba(${AMBER},${0.95 * P.seam})`; ctx.lineWidth = 1.3;
        ctx.shadowColor = `rgba(224,150,90,${0.9 * P.seam})`; ctx.shadowBlur = 16;
        let b = rot;
        spans.forEach((sp) => {
          const a0 = b, a1 = b + sp; b = a1;
          if (sp < 0.02) return;
          const mid = (a0 + a1) / 2, px = x0 + Math.cos(mid) * e, py = y0 + Math.sin(mid) * e;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, R, a0, a1); ctx.closePath(); ctx.stroke();
        });
        ctx.restore();
      }
    }

    // the moon's lit rim (at rest and while lifting)
    const rimA = (1 - clamp(P.seam * 2)) * (1 - clamp(P.g - 0.9));
    if (rimA > 0.01) {
      const c = charge();
      ctx.save();
      ctx.strokeStyle = `rgba(${AMBER},${0.8 * rimA})`; ctx.lineWidth = 1;
      ctx.shadowColor = `rgba(208,149,96,${(0.45 + c * 0.4) * rimA})`; ctx.shadowBlur = 30 + c * 50;
      ctx.beginPath(); ctx.arc(x0, y0, R, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // the world names at the rim
    if (P.lab > 0.01) {
      ctx.save();
      ctx.font = `500 ${Wd < 768 ? 9 : 11}px "Archivo Variable", Arial, sans-serif`;
      try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.18em'; } catch { /* older engines */ }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let a = rot;
      spans.forEach((sp, k) => {
        const mid = a + sp / 2; a += sp;
        if (sp < 0.5) return;
        const rl = Math.min(R * 0.8, minD * 0.42);
        const lx = x0 + Math.cos(mid) * rl, ly = y0 + Math.sin(mid) * rl;
        const name = worlds[order[k]].short.toUpperCase();
        ctx.globalAlpha = P.lab;
        ctx.fillStyle = 'rgba(10,8,8,0.4)'; ctx.fillText(name, lx + 1, ly + 1);
        ctx.fillStyle = '#f4efe6'; ctx.fillText(name, lx, ly);
      });
      ctx.restore();
    }

    // DOM that follows the canvas
    target.style.setProperty('--cx', `${cx}px`); target.style.setProperty('--cy', `${cy}px`);
    target.style.setProperty('--Rm', `${((D / 2) * s).toFixed(1)}px`);
    root.style.setProperty('--open', clamp(P.g - 1).toFixed(3));
    const d = P.dim;
    stage.style.opacity = String((1 - d) * (1 - exit));
    stage.style.transform = `scale(${((1 - 0.06 * d) * (1 + 0.1 * exit)).toFixed(4)})`;
    stage.style.filter = d > 0.01 ? `blur(${(d * 6).toFixed(2)}px)` : '';
    clouds.forEach((c) => { c.style.opacity = String(0.9 * (1 - d)); });
    hx.style.opacity = String(1 - exit);
    hx.style.scale = String(1 + 0.1 * exit);
    button.style.opacity = String(1 - exit);
    answer.style.visibility = exit > 0.9 ? 'hidden' : '';
    const c = charge();
    root.style.setProperty('--charge', c.toFixed(3));
    document.documentElement.style.setProperty('--hold', c.toFixed(3));
    if (Math.abs(video.playbackRate - P.rate) > 0.05) video.playbackRate = Math.min(8, Math.max(0.5, P.rate));
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

  // ── the timeline ────────────────────────────────────────────────────────────────────────
  const tl = gsap.timeline({ paused: true });
  tl.to(P, { g: 1, duration: 0.95, ease: EASE.inOut }, 0)
    .to(P, { dim: 1, duration: 0.7, ease: 'power2.out' }, 0)
    .to(P, { guide: 1, duration: 0.9, ease: EASE.out }, 0.25)
    .to(P, { sp: 0.32, rate: 2.5, duration: 1.2, ease: 'power2.inOut' }, 0)
    // part
    .to(P, { seam: 1, duration: 0.45, ease: EASE.out }, 0.85)
    .to(P, { ex: 0.022, duration: 0.9, ease: EASE.out }, 0.95)
    .to(P, { lab: 1, duration: 0.6, ease: 'power1.out' }, 1.3);
  M.forEach((q, k) => tl.to(q, { m: 1, duration: 0.8, ease: EASE.inOut }, 1.15 + 0.14 * k));
  // bloom
  tl.to(P, { g: 2, duration: 1.1, ease: EASE.inOut }, 2.4)
    .to(P, { ex: 0.008, duration: 1.1, ease: EASE.inOut }, 2.4)
    .to(P, { guide: 0, duration: 0.5 }, 2.4)
    .to(P, { lab: 0, duration: 0.4 }, 3.0)
    .to(P, { sp: 0.14, duration: 1 }, 2.4);
  // dial: each world sweeps round to take the screen
  for (let k = 0; k < 5; k++) {
    const t = DIAL0 + k * DIAL_STEP;
    Wt.forEach((q, j) => tl.to(q, { w: j === k ? 1 : 0.003, duration: 0.6, ease: EASE.inOut }, t));
    tl.call(() => showText(k), [], t + 0.3).call(() => hideText(k), [], t + DIAL_STEP - 0.08);
  }
  // close
  Wt.forEach((q) => tl.to(q, { w: 1, duration: 0.7, ease: EASE.inOut }, CLOSE));
  tl.to(P, { g: 1, duration: 0.9, ease: EASE.inOut }, CLOSE + 0.2)
    .to(P, { ex: 0.022, duration: 0.6 }, CLOSE + 0.2)
    .to(P, { lab: 1, duration: 0.5 }, CLOSE + 0.5)
    .to(P, { guide: 0.6, duration: 0.6 }, CLOSE + 0.9)
    .to(P, { lab: 0, duration: 0.4 }, CLOSE + 1.1)
    .to(P, { ex: 0, duration: 0.6, ease: EASE.inOut }, CLOSE + 1.2)
    .to(P, { seam: 0, rate: 3, duration: 0.8 }, CLOSE + 1.3);
  M.forEach((q, j) => tl.to(q, { m: 0, duration: 0.7, ease: EASE.inOut }, CLOSE + 0.9 + 0.08 * j));
  tl.call(() => { showText(5); if (!done) { done = true; root.dataset.done = ''; hint.textContent = hint.dataset.again || hint.textContent; } }, [], ANSWER_AT)
    .to({}, { duration: 0.6 });

  // ── press / release ─────────────────────────────────────────────────────────────────────
  let collapse: gsap.core.Timeline | null = null;
  let running = false;
  const tick = (_t: number, dtMs: number) => { rot += (P.sp * Math.min(dtMs, 64)) / 1000; draw(); };
  const wake = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
  const sleep = () => { if (running && !holding) { running = false; gsap.ticker.remove(tick); } };

  const press = (e?: Event) => {
    if (e?.cancelable) e.preventDefault();
    if (holding) return;
    loadSources();
    holding = true; root.dataset.holding = '';
    collapse?.kill(); collapse = null;
    if (video.paused) video.play().catch(() => {});
    if (header) header.dataset.hidden = 'true';
    tl.invalidate().restart();
    wake();
  };
  const release = () => {
    if (!holding) return;
    holding = false; delete root.dataset.holding;
    tl.pause();
    texts.forEach((_, i) => hideText(i, true));
    collapse = gsap.timeline({ onComplete: () => { tl.pause(0); if (header) header.dataset.hidden = 'false'; } })
      .to(P, { ...REST, duration: 1.0, ease: EASE.inOut }, 0)
      .to(Wt, { w: 1, duration: 0.6, ease: EASE.inOut }, 0)
      .to(M, { m: 0, duration: 0.6, ease: EASE.inOut }, 0.15);
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

  // The frame loop runs while the scene is on screen (the footage needs redrawing anyway), and while held.
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { loadSources(); video.play().catch(() => {}); wake(); }
    else { release(); video.pause(); sleep(); }
  }, { rootMargin: '30% 0px' }).observe(root);

  // ── scroll: the moon arrives, the scene departs ─────────────────────────────────────────
  ScrollTrigger.create({
    trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.5,
    onUpdate: (self) => { const p = self.progress; s = lerp(0.3, 1, EASE.inOut(clamp(p / 0.42))); exit = EASE.in(clamp((p - 0.86) / 0.14)); },
    onRefresh: () => measure(),
  });
  gsap.fromTo(clouds, { y: (i) => (i ? 180 : 120) }, { y: (i) => (i ? -260 : -180), ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
  ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onLeave: release, onLeaveBack: release });
  ScrollTrigger.create({ trigger: root, start: 'top top', onEnter: () => { root.dataset.ground = ''; }, onLeaveBack: () => { delete root.dataset.ground; } });
  addEventListener('resize', measure);
  measure();
}
