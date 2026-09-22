/**
 * Scenes 3 + 4 — Workforces gate → deck (src/components/scenes/Workforces.astro).
 *
 * One scrubbed progress q over the section:
 *   0.00 → 0.44  ZOOM   the sky, with WORKFORCES knocked out of it, flies into the O. ln(scale) eases as q^3.4
 *                       (measured from the zoom-type reference), so most of the move is slow and the last part
 *                       rushes. The photograph behind SETTLES from 1.22x to 1.0 as we arrive: its natural scale.
 *   0.44 → 0.60  HOLD   the photograph, full bleed, drifting in a little; "Who we supply." rises over it (played,
 *                       as Sectors plays its line) with the five workforces along its foot, the first lit.
 *   0.60 → 0.86  MORPH  the line goes; the photograph's box shrinks from the stage to the front card's box
 *                       (object-fit keeps re-cropping, and the card crop uses the same maths, so the swap is
 *                       invisible). The ground shows around it, the cards beneath rise, the copy arrives.
 *   0.86 → 1.00  DECK   the real stack takes over and can be thrown.
 * The knock-out is a Path2D fill on a canvas (the hero's title card, reversed), so it is sharp at any scale.
 */
import words from '../../data/words.json';
import { $, $$, clamp, lerp, whenNear } from '../core/env';
import { gsap, ScrollTrigger, SplitText, EASE, DUR } from '../core/motion';

type Word = { width: number; height: number; d: string; anchor: { x: number; y: number; r: number } };
const SKY = '#c4d4db';
const EXP = 3.4;
const Z_END = 0.44, M_START = 0.6, M_END = 0.86;

export function initWorkforces() {
  const root = $('[data-wfx]');
  if (!root || !document.documentElement.classList.contains('motion')) return;
  const spec = (words.words as Record<string, Word>).WORKFORCES;
  const canvas = $<HTMLCanvasElement>('[data-wfx-mask]', root)!;
  const photo = $('[data-wfx-photo]', root)!;
  const photoImg = $<HTMLImageElement>('img', photo)!;
  const stage = $('[data-wfx-stage]', root)!;
  const gateUi = $('[data-wfx-gateui]', root)!;
  const stack = $('[data-deck-stack]', root)!;
  const monosOver = $('[data-wfx-monos-over]', root)!;
  const over = $('[data-wfx-over]', root)!;
  const overLines = $$('[data-wfx-overh] > span > span', root);
  const ctx = canvas.getContext('2d')!;
  const path = new Path2D(spec.d);
  whenNear(root, () => { $$<HTMLImageElement>('img', root).forEach((i) => { i.loading = 'eager'; }); });

  // The monument turns over with each throw: the old name's letters fall away, the new ones rise and turn in.
  const monos = $$('[data-mono]', root);
  const chars = new Map(monos.map((m) => [m, new SplitText(m, { type: 'chars', charsClass: 'char' }).chars as HTMLElement[]]));
  new MutationObserver((list) => {
    for (const m of list) {
      const el = m.target as HTMLElement;
      const c = chars.get(el);
      if (!c) continue;
      if (el.dataset.on === 'true') gsap.fromTo(c, { yPercent: 70, rotateX: -85, opacity: 0 }, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.1, ease: EASE.out, stagger: 0.035, overwrite: true });
      else gsap.to(c, { yPercent: -40, rotateX: 70, opacity: 0, duration: 0.4, ease: EASE.in, stagger: 0.015, overwrite: true });
    }
  }).observe(root, { subtree: true, attributes: true, attributeFilter: ['data-on'] });

  // The name's second copy is clipped to the card's home box, so its shadow falls only where it crosses the photo.
  const clipOver = () => {
    const k = stack.getBoundingClientRect(), o = monosOver.getBoundingClientRect();
    monosOver.style.clipPath = `inset(${(k.top - o.top).toFixed(1)}px ${(o.right - k.right).toFixed(1)}px ${(o.bottom - k.bottom).toFixed(1)}px ${(k.left - o.left).toFixed(1)}px round 6px)`;
  };

  // The line over the photograph: played in once we are through the O, played out as the photograph shrinks.
  gsap.set(overLines, { yPercent: 110 });
  let overOn = false;
  const setOver = (on: boolean) => {
    if (on === overOn) return;
    overOn = on;
    if (on) over.style.visibility = 'visible';
    gsap.to(overLines, on
      ? { yPercent: 0, duration: DUR.l, ease: EASE.out, stagger: 0.09, overwrite: true }
      : { yPercent: 110, duration: DUR.s, ease: EASE.in, overwrite: true });
    over.toggleAttribute('data-on', on); // the five names under the line follow this in CSS
    gsap.to(over, { '--scrim': on ? 1 : 0, duration: on ? DUR.l : DUR.s, ease: 'none', overwrite: true,
      onComplete: () => { if (!overOn) over.style.visibility = 'hidden'; } });
  };

  let W = 1, H = 1, dpr = 1, q = 0, lastT = -1;
  let card = { x: 0, y: 0, w: 1, h: 1 };

  const measure = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H; lastT = -1;
    // The front card's home box, relative to the stage (it is never transformed while the gate runs).
    const s = stage.getBoundingClientRect(), k = stack.getBoundingClientRect();
    card = { x: k.left - s.left, y: k.top - s.top, w: k.width, h: k.height };
  };

  const restBox = () => {
    const byW = (W * 0.9) / spec.width, byH = (H * 0.15) / spec.height;
    // the whole word, always: at rest nothing of it may be cut by the screen's edge
    const k = Math.min(byW, byH);
    const x = (W - spec.width * k) / 2;
    return { k, x, y: (H - spec.height * k) / 2 - H * 0.02 };
  };

  const draw = (t: number) => {
    if (t === lastT) return;
    lastT = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (t >= 1) return;
    const box = restBox();
    const sMax = (1.08 * Math.hypot(W, H) / 2) / (spec.anchor.r * box.k);
    const s = Math.exp(Math.log(sMax) * Math.pow(t, EXP));
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    // the camera drifts to the O as it closes in, so we arrive through the middle of the screen
    const d = EASE.inOut(clamp(t / 0.9));
    const ax = lerp(box.x + spec.anchor.x * box.k, W / 2, d), ay = lerp(box.y + spec.anchor.y * box.k, H / 2, d), ks = box.k * s;
    ctx.setTransform(ks, 0, 0, ks, ax - spec.anchor.x * ks, ay - spec.anchor.y * ks);
    ctx.fill(path);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  let landed = false;
  const render = () => {
    const z = clamp(q / Z_END);
    draw(z);
    canvas.style.visibility = z >= 1 ? 'hidden' : 'visible';
    gateUi.style.opacity = String(1 - clamp(z * 4));
    // it settles to its natural scale as we arrive, then drifts in a touch while the line is over it
    photoImg.style.transform = `scale(${(lerp(1.22, 1, EASE.out(z)) + 0.045 * EASE.inOut(clamp((q - Z_END) / (M_START - Z_END)))).toFixed(4)})`;
    setOver(q >= Z_END + 0.004 && q < M_START + 0.015);

    const m = EASE.inOut(clamp((q - M_START) / (M_END - M_START)));
    const sw = stage.clientWidth, sh = stage.clientHeight;
    photo.style.left = `${lerp(0, card.x, m).toFixed(2)}px`;
    photo.style.top = `${lerp(0, card.y, m).toFixed(2)}px`;
    photo.style.width = `${lerp(sw, card.w, m).toFixed(2)}px`;
    photo.style.height = `${lerp(sh, card.h, m).toFixed(2)}px`;
    photo.style.borderRadius = `${(6 * m).toFixed(2)}px`;
    root.style.setProperty('--copy', clamp((q - 0.74) / 0.12).toFixed(3));
    root.style.setProperty('--under', clamp((q - 0.72) / 0.12).toFixed(3));

    const now = q >= M_END;
    if (now !== landed) {
      landed = now;
      root.toggleAttribute('data-landed', now);
      // the card has landed: its name turns in over it, letter by letter, as it does on every throw
      if (now) for (const [m, c] of chars) if (m.dataset.on === 'true') gsap.fromTo(c, { yPercent: 70, rotateX: -85, opacity: 0 }, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.1, ease: EASE.out, stagger: 0.035, overwrite: true });
      // Scrolling back into the gate always finds Hospitality on top, because that is the photograph.
      if (!now) root.dispatchEvent(new CustomEvent('nx:deck-reset'));
    }
  };

  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => { q = self.progress; render(); },
    onRefresh: (self) => { measure(); clipOver(); q = self.progress; render(); },
  });
  measure();
  render();
}
