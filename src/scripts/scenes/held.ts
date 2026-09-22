/**
 * Scene 2 — the world, held (src/components/scenes/Held.astro). Everything in the portal is drawn on one canvas.
 *
 * The idea is the model itself: one world divided into five sectors, and the line over it — five worlds, one
 * partner. At rest the canvas draws the moon: the disc footage in a circle. Holding it plays one timeline:
 *
 *   I    lift + part  (0 – 2.2 s)  the page draws back to night; the circle grows inside an instrument dial (a fine
 *                                  ring, ticks, five spokes); the disc splits along its five sectors, the seams lit
 *                                  amber, and in each slice the footage gives way to that world's scene
 *   II   set          (2.2 – 4.5)  the slices close and lock; from the centre a girih inks itself outwards over the
 *                                  disc (src/scripts/scenes/lattice.ts: a Penrose tiling, five-fold like the disc,
 *                                  its axes on the five seams), and the disc dissolves into it. The pattern is cut
 *                                  into a medallion of five rings, one per world, each in that world's colour, its
 *                                  name and the people it runs on engraved along its edge
 *   III  turn + lock  (2.7 – 7.05) the rings turn, in alternate directions, faster the longer you hold, and the
 *                                  pattern breaks at every ring. Then, from the inside out, each ring slows and
 *                                  clicks into place: the pattern runs on unbroken, the ring turns gold, and the five
 *                                  names come to rest in one column at the top. Five worlds, one pattern
 *   IV   answer       (7.9 – 9.2)  the medallion lets go of its light; at its centre the disc opens again, whole and
 *                                  spinning, inside its dial; "Behind all five, people. We supply them."
 * Letting go at any point tweens everything back to rest from wherever it is: the slices close into the moon.
 *
 * The rings' angles are a pure function of the timeline's time (tables built once), so any moment can be drawn,
 * seeked, or let go of. Parameters (drawn by `draw()` every frame while visible):
 *   g     0 moon → 1 large circle          ex    how far the slices have drawn apart      M[k]  footage → world, per slice
 *   guide the instrument dial              seam  the lit seams                            lab   the world names (part)
 *   disc  the circle's own picture         iris  the circle's radius, as a share          dim   the page drawing back
 *   lat   how far the pattern has inked    la    the pattern's lines                      med   the rings and engraving
 *   z     the camera                       sp    turning speed (disc, dial)               rate  the footage's speed
 */
import { $, $$, clamp, lerp, smoothstep } from '../core/env';
import { gsap, ScrollTrigger, SplitText, EASE } from '../core/motion';
import { worlds } from '../../data/worlds';
import { held } from '../../data/content';
import { buildLayer, type Layer } from './lattice';

const TAU = Math.PI * 2;
const FIFTH = TAU / 5;
const PHI = (1 + Math.sqrt(5)) / 2;
const SET = 2.2;
const AMBER = '240,189,134';
const GOLD = [240, 189, 134];
const HUES = [[217, 164, 91], [176, 124, 224], [95, 184, 174], [91, 155, 224], [79, 195, 232]]; // the five worlds' light, from the footage

// ── the medallion's clock: pure functions of the timeline's time ─────────────────────────────
const RING_S = [1, -0.8, 0.64, -0.52, 0.42]; // each ring's share of the spin, alternating
const LOCK0 = 5.75, LOCK_STEP = 0.16, LOCK_DUR = 0.66;
const lockStart = (k: number) => LOCK0 + k * LOCK_STEP;
const lockEnd = (k: number) => lockStart(k) + LOCK_DUR;
const LOCKED = lockEnd(4); // ≈ 7.05
const ANSWER = LOCKED + 0.85; // a beat to take in the aligned medallion
const ANSWER_AT = ANSWER + 1.3;
/** The fastest ring's speed, rad/s: wakes as the pattern sets, gathers while you hold, eases off for the lock. */
const spinSpeed = (t: number) => smoothstep(2.7, 3.7, t) * (0.45 + 2.6 * smoothstep(4.0, 5.5, t));
/** The medallion as a whole turns slowly, and comes to rest for the lock. */
const fieldSpeed = (t: number) => 0.14 * (1 - smoothstep(5.4, 6.0, t));
const TABLE_DT = 1 / 120, TABLE_N = 12 * 120;
const integrate = (f: (t: number) => number, from = 0) => {
  const out = new Float32Array(TABLE_N + 1);
  for (let i = 1; i <= TABLE_N; i++) { const t = i * TABLE_DT; out[i] = out[i - 1] + (t < from ? 0 : f(t - TABLE_DT / 2) * TABLE_DT); }
  return out;
};
const SPIN = integrate(spinSpeed), FIELD = integrate(fieldSpeed, SET);
const at = (table: Float32Array, t: number) => { const x = clamp(t / TABLE_DT, 0, TABLE_N), i = Math.floor(x), f = x - i; return i >= TABLE_N ? table[TABLE_N] : table[i] + (table[i + 1] - table[i]) * f; };
// A lock lands on the next alignment in the ring's own direction, with a small overshoot: the click.
const backOut = (x: number, s = 1.9) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
const LAND = RING_S.map((s, k) => { const free = s * at(SPIN, lockEnd(k)); return (s > 0 ? Math.ceil(free / FIFTH + 0.35) : Math.floor(free / FIFTH - 0.35)) * FIFTH; });
/** Ring k's turn relative to the medallion. 0 (mod a fifth) = aligned. */
const ringTurn = (k: number, t: number) => {
  const free = RING_S[k] * at(SPIN, t);
  const e = clamp((t - lockStart(k)) / LOCK_DUR);
  return e <= 0 ? free : lerp(free, LAND[k], backOut(e));
};
const lockedness = (k: number, t: number) => smoothstep(lockEnd(k) - 0.18, lockEnd(k) + 0.25, t);
const flash = (k: number, t: number) => { const d = t - lockEnd(k) + 0.06; return d < 0 ? 0 : Math.exp(-d / 0.3); };

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
  const answerText = $('[data-hx-answer]', root)!;
  const target = $('[data-hx-target]', root)!;
  const button = $('[data-held-button]', root)!;
  const hint = $('[data-held-hint]', root)!;
  const answer = $('.held__answer', root)!;
  const clouds = $$('[data-held-cloud]', root);
  const header = $('[data-header]');
  // the pointer's ring fills as you hold. Set on the pointer itself: a custom property on <html> would restyle the
  // whole document every frame of the hold.
  const pointer = $('[data-cursor-root]');

  // ── sources ──────────────────────────────────────────────────────────────────────────────
  const order = held.lines.map((l) => worlds.findIndex((w) => w.id === l.world));
  const imgs: HTMLImageElement[] = [];
  const focusX = order.map((wi) => parseFloat(worlds[wi].focus) / 100 || 0.5);
  const loadSources = () => {
    if (!video.src) { video.src = video.dataset.src!; video.preload = 'auto'; }
    if (imgs.length) return;
    const portrait = innerWidth / innerHeight < 1;
    held.lines.forEach((l) => {
      const im = new Image(); im.decoding = 'async'; im.src = `/media/hero/rest/${l.world}${portrait ? '-m' : '-hd'}.webp`;
      im.decode().catch(() => {}); // decoded off the main thread, so the first parted frame does not stall
      imgs.push(im);
    });
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
  const REST = { g: 0, ex: 0, guide: 0, seam: 0, lab: 0, dim: 0, sp: 0.1, rate: 1, disc: 1, iris: 1, lat: 0, la: 0, med: 0, z: 1 };
  const P = { ...REST };
  const M = order.map(() => ({ m: 0 }));
  let rot = -Math.PI / 2;
  let rotSet = rot; // the disc's turn when the pattern takes over: its axes sit on the seams
  let s = 0.3, exit = 0; // scroll: the moon's arrival scale, the scene's departure
  let holding = false, done = false;

  // ── geometry ─────────────────────────────────────────────────────────────────────────────
  let Wd = 0, Hd = 0, dpr = 1, D = 0, cx = 0, cy = 0, cover = 0, minD = 0, Rbig = 0, U = 1, phone = false;
  const Rm = [0, 0, 0, 0, 0, 0]; // the medallion: hub, then the five rings' outer edges
  const measure = () => {
    Wd = pin.clientWidth; Hd = pin.clientHeight; dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Hd * dpr);
    phone = Wd < 768;
    // a phone on its side: too short to stack the line over the moon, so the moon moves right of it (Held.astro)
    const side = Hd < 520 && Wd / Hd > 1.4;
    D = side ? Hd * 0.72 : phone ? Math.min(Wd * 0.84, Hd * 0.52) : Math.min(Hd * 0.62, Wd * 0.44);
    cx = side ? Wd * 0.68 : Wd / 2; cy = Hd * (side ? 0.54 : phone ? 0.62 : 0.59);
    minD = Math.min(Wd, Hd);
    Rbig = phone ? Wd * 0.46 : minD * 0.43;
    cover = Math.hypot(Wd / 2, Hd / 2) + 24;
    // the pattern's scale: its rhomb edge, in px (the seventh generation, so it reaches far past every corner)
    U = (phone ? 38 : 50) * Math.pow(PHI, 7);
    const R5 = phone ? Math.min(Hd * 0.4, Wd * 0.78) : Math.min(Hd * 0.46, Wd * 0.4);
    const R0 = R5 * 0.22;
    for (let k = 0; k <= 5; k++) Rm[k] = R0 + ((R5 - R0) * k) / 5;
    if (bakedFor) bake();
  };
  const radius = () => lerp((D / 2) * s, Rbig, EASE.ease(clamp(P.g)));
  const centre = () => [cx, lerp(cy, Hd / 2, clamp(P.g))];

  // ── the pattern: one bitmap, baked once, turned per ring ────────────────────────────────
  // Stroking thousands of strapwork segments in six clipped rings every frame is too slow for a phone, so the
  // girih is drawn ONCE into a bitmap (white lines) and each ring is that bitmap turned, clipped to its ring and
  // tinted on a layer of its own. It is baked when the scene comes near, not on the press.
  let lattice: Layer | null = null;
  const bmp = document.createElement('canvas'), bctx = bmp.getContext('2d')!;
  const lay = document.createElement('canvas'), lctx = lay.getContext('2d')!; // the medallion's own layer
  const glow = document.createElement('canvas'), gctx = glow.getContext('2d')!; // a small copy of it, for bloom
  let bakedFor = '', bmpR = 1;
  const bake = () => {
    if (!Rm[5]) return;
    // A phone's address bar changes the height a little: the baked bitmap still covers the medallion, keep it.
    if (bakedFor === String(dpr) && Rm[5] * 1.08 <= bmpR && Rm[5] >= bmpR * 0.6) return;
    const key = String(dpr);
    if (!lattice) lattice = buildLayer(7, 40);
    bakedFor = key;
    bmpR = Rm[5] * 1.12; // room for the camera's lean-in
    const k = Math.min(dpr, 1.5), size = Math.ceil(2 * bmpR * k);
    bmp.width = bmp.height = size;
    bctx.setTransform(U * k, 0, 0, U * k, size / 2, size / 2);
    bctx.strokeStyle = '#fff'; bctx.lineWidth = 1.3 / U; bctx.lineJoin = 'round'; bctx.lineCap = 'round';
    const reach = bmpR / U + lattice.edge;
    for (const b of lattice.bands) if (b.r0 < reach) bctx.stroke(b.lines);
    lay.width = lay.height = size;
    glow.width = glow.height = Math.max(1, Math.round(size / 4));
  };

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
    const zz = 1.14 - 0.08 * mix;
    const sc = Math.max(Wd / im.naturalWidth, Hd / im.naturalHeight) * zz;
    const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    const x = (Wd - w) * focusX[k] + ox * 0.5, y = (Hd - h) / 2 + oy * 0.5;
    ctx.globalAlpha = mix;
    ctx.drawImage(im, x, y, w, h);
    ctx.globalAlpha = 1;
  };
  const charge = () => (holding ? clamp(tl.time() / ANSWER_AT) : done ? 1 : 0);
  const medAngle = (t: number) => rotSet + at(FIELD, t);
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgbOf = (c: number[]) => c.join(',');

  // The engraving on each ring's outer edge: its number and name, then the people it runs on.
  const ringText = order.map((wi, k) => ({ n: worlds[wi].n, name: worlds[wi].short.toUpperCase(), people: held.lines[k].people.map((p) => p.toUpperCase()) }));
  const set: { chars: string[]; widths: number[]; lead: number; leadW: number }[] = [];
  const fs = () => (phone ? 7.5 : 9);
  const engrave = (x0: number, y0: number, k: number, R: number, angle: number, alpha: number, rgb: string) => {
    const size = fs(), track = size * 0.22;
    ctx.font = `500 ${size}px "Archivo Variable", Arial, sans-serif`;
    if (!set[k]) {
      const { n, name, people } = ringText[k];
      let text = `${n}  ${name}`;
      const room = R * TAU * 0.42;
      for (const p of people) { const next = `${text}  ·  ${p}`; if (ctx.measureText(next).width + next.length * track > room) break; text = next; }
      const chars = [...text], widths = chars.map((ch) => ctx.measureText(ch).width + track);
      const lead = `${n}  ${name}`.length;
      set[k] = { chars, widths, lead, leadW: widths.slice(0, lead).reduce((x, y) => x + y, 0) };
    }
    const { chars, widths, lead, leadW } = set[k];
    // the name is centred on `angle`; the people follow it round the ring
    let ang = angle - leadW / R / 2;
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i], t = ang + w / 2 / R;
      ang += w / R;
      if (chars[i] === ' ') continue;
      const c = Math.cos(t), sn = Math.sin(t);
      // translate to the point on the ring, turned to its tangent
      ctx.setTransform(-sn * dpr, c * dpr, -c * dpr, -sn * dpr, (x0 + c * R) * dpr, (y0 + sn * R) * dpr);
      ctx.globalAlpha = alpha * (i < lead ? 1 : 0.8);
      ctx.fillStyle = i < lead ? '#f4efe6' : `rgb(${rgb})`;
      ctx.fillText(chars[i], 0, 0);
    }
  };

  const drawMedallion = (x0: number, y0: number, t: number) => {
    if (!lattice || !bakedFor || P.la < 0.004) return;
    const z = P.z;
    const Th = medAngle(t);
    const R = Rm.map((r) => r * z);
    const inked = P.lat * R[5] * 1.08;
    if (inked <= 0) return;
    const locks = [0, 1, 2, 3, 4].map((j) => lockedness(j, t));
    const flashes = [0, 1, 2, 3, 4].map((j) => flash(j, t));
    const size = lay.width, k = size / (2 * bmpR);
    // a warm light behind the medallion, so it reads as lit from within
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createRadialGradient(x0, y0, 0, x0, y0, R[5] * 1.25);
    g.addColorStop(0, `rgba(208,149,96,${0.17 * P.la})`); g.addColorStop(1, 'rgba(208,149,96,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
    ctx.restore();

    // the hub and the five rings, each the baked pattern turned to its own angle and tinted, on the layer
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, size, size);
    const region = (rIn: number, rOut: number, angle: number, rgb: string, alpha: number) => {
      const outer = Math.min(rOut, inked);
      if (outer <= rIn || alpha < 0.01) return;
      lctx.save();
      lctx.setTransform(k, 0, 0, k, size / 2, size / 2);
      lctx.beginPath(); lctx.arc(0, 0, outer, 0, TAU);
      if (rIn > 0) lctx.arc(0, 0, rIn, 0, TAU, true);
      lctx.clip();
      lctx.rotate(angle - lattice!.axis); lctx.scale(z, z);
      lctx.globalAlpha = alpha;
      lctx.drawImage(bmp, -bmpR, -bmpR, 2 * bmpR, 2 * bmpR);
      lctx.globalAlpha = 1;
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-atop';
      lctx.fillStyle = `rgb(${rgb})`; lctx.fillRect(0, 0, size, size);
      lctx.restore();
    };
    region(0, R[0], Th, AMBER, 0.95 * P.la);
    for (let j = 0; j < 5; j++) {
      // each ring in its world's light until it locks, then gold; the click is a gold-white glint
      const rgb = rgbOf(mix(mix(HUES[j], GOLD, 0.42 + 0.58 * locks[j]), [255, 236, 204], flashes[j]));
      region(R[j], R[j + 1], Th + ringTurn(j, t), rgb, Math.min(1, 0.78 + 0.22 * locks[j] + 0.4 * flashes[j]) * P.la);
    }
    // onto the page: a bloom first (the layer, small and scaled back up), then the lines themselves
    const ox = x0 - bmpR, oy = y0 - bmpR;
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.clearRect(0, 0, glow.width, glow.height);
    gctx.drawImage(lay, 0, 0, glow.width, glow.height);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, 0.32 + 0.5 * Math.max(...flashes)) * P.la;
    ctx.drawImage(glow, ox, oy, 2 * bmpR, 2 * bmpR);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(lay, ox, oy, 2 * bmpR, 2 * bmpR);
    ctx.restore();

    if (P.med > 0.01) {
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const band = fs() * 1.75;
      // the rings' edges: hairlines that heal once the rings on both sides have locked; a faint band of night
      // under each engraving so it reads over the lines
      for (let j = 0; j <= 5; j++) {
        if (R[j] - band > inked) break;
        if (j > 0) {
          ctx.fillStyle = `rgba(14,11,10,${0.55 * P.med})`;
          ctx.beginPath(); ctx.arc(x0, y0, R[j], 0, TAU); ctx.arc(x0, y0, R[j] - band, 0, TAU, true); ctx.fill('evenodd');
        }
        const healed = j === 5 ? 0 : j === 0 ? locks[0] : Math.min(locks[j - 1], locks[j]);
        const a = (j === 5 ? 0.75 : 0.5 * (1 - healed)) * P.med;
        if (a < 0.01) continue;
        const rgb = j === 5 ? AMBER : rgbOf(mix(HUES[Math.max(0, j - 1)], GOLD, 0.42 + 0.58 * locks[Math.max(0, j - 1)]));
        ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x0, y0, R[j], 0, TAU); ctx.stroke();
      }
      // the outer edge is a dial
      ctx.strokeStyle = `rgba(${AMBER},${0.7 * P.med})`;
      ctx.beginPath();
      for (let i = 0; i < 120; i++) {
        const a = Th + (i / 120) * TAU, len = i % 24 === 0 ? 14 : i % 6 === 0 ? 9 : 5;
        ctx.moveTo(x0 + Math.cos(a) * (R[5] + 5), y0 + Math.sin(a) * (R[5] + 5)); ctx.lineTo(x0 + Math.cos(a) * (R[5] + 5 + len), y0 + Math.sin(a) * (R[5] + 5 + len));
      }
      ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
      // the engraving, just inside each ring's outer edge. It rides its ring; locked, every ring's name comes to
      // rest at the top: one column of five.
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let j = 0; j < 5; j++) {
        if (R[j + 1] - band > inked) break;
        const rgb = rgbOf(mix(HUES[j], GOLD, 0.42 + 0.58 * locks[j]));
        const nameAt = at(FIELD, t) - at(FIELD, LOCKED) + ringTurn(j, t) - LAND[j] - Math.PI / 2;
        engrave(x0, y0, j, R[j + 1] - band / 2, nameAt, P.med, rgb);
      }
      ctx.restore();
    }
    // the inking edge burns brighter as the pattern spreads
    if (P.lat < 1) {
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const e = ctx.createRadialGradient(x0, y0, Math.max(0, inked - 70), x0, y0, inked);
      e.addColorStop(0, 'rgba(255,214,160,0)'); e.addColorStop(1, `rgba(255,228,196,${0.2 * P.la})`);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = e; ctx.beginPath(); ctx.arc(x0, y0, inked, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };

  const draw = () => {
    const t = tl.time();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wd, Hd);
    const Rd = radius();
    const R = Rd * P.iris;
    const [x0, y0] = centre();
    const e = P.ex * minD;
    const whole = e < 0.3 && M.every((m) => m.m < 0.001);

    // the night behind the circle, as the page draws back
    if (P.dim > 0.001) {
      const g = ctx.createRadialGradient(x0, y0, 0, x0, y0, cover);
      g.addColorStop(0, `rgba(29,23,19,${P.dim})`); g.addColorStop(1, `rgba(10,8,9,${P.dim})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
    }

    // the instrument dial
    if (P.guide > 0.01) {
      ctx.save();
      ctx.strokeStyle = `rgba(${AMBER},${0.35 * P.guide})`; ctx.lineWidth = 1;
      for (const k of [1.07, 1.17]) { ctx.beginPath(); ctx.arc(x0, y0, Rd * k, 0, TAU); ctx.stroke(); }
      const t0 = rot * 0.35;
      for (let i = 0; i < 120; i++) {
        const a = t0 + (i / 120) * TAU, major = i % 24 === 0, r0 = Rd * 1.085, r1 = Rd * (major ? 1.155 : i % 6 === 0 ? 1.125 : 1.105);
        ctx.globalAlpha = P.guide * (major ? 0.9 : 0.45);
        ctx.beginPath(); ctx.moveTo(x0 + Math.cos(a) * r0, y0 + Math.sin(a) * r0); ctx.lineTo(x0 + Math.cos(a) * r1, y0 + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.globalAlpha = P.guide * 0.5;
      for (let k = 0; k < 5; k++) { // the five spokes carry on past the rim to the edge of the screen
        const a = rot + k * FIFTH;
        ctx.beginPath(); ctx.moveTo(x0 + Math.cos(a) * Rd * 1.2, y0 + Math.sin(a) * Rd * 1.2); ctx.lineTo(x0 + Math.cos(a) * cover, y0 + Math.sin(a) * cover); ctx.stroke();
      }
      ctx.restore();
    }

    // the circle itself: the moon, or its five slices
    if (P.disc > 0.004 && R > 0.5) {
      ctx.save();
      ctx.globalAlpha = P.disc;
      if (whole) {
        ctx.beginPath(); ctx.arc(x0, y0, R, 0, TAU); ctx.clip();
        ctx.fillStyle = '#0f0c0b'; ctx.fillRect(x0 - R, y0 - R, R * 2, R * 2);
        drawDisc(x0, y0, Rd);
      } else {
        for (let k = 0; k < 5; k++) {
          const a0 = rot + k * FIFTH, a1 = a0 + FIFTH;
          const midA = (a0 + a1) / 2, ox = Math.cos(midA) * e, oy = Math.sin(midA) * e;
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x0 + ox, y0 + oy); ctx.arc(x0 + ox, y0 + oy, R, a0, a1); ctx.closePath(); ctx.clip();
          ctx.fillStyle = '#0f0c0b'; ctx.fillRect(0, 0, Wd, Hd);
          ctx.globalAlpha = P.disc;
          if (M[k].m < 0.999) drawDisc(x0 + ox, y0 + oy, Rd);
          if (M[k].m > 0.001) { drawWorld(k, ox, oy, M[k].m * P.disc); ctx.globalAlpha = P.disc; }
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // the pattern: inks across the worlds from the centre out, then turns and locks
    drawMedallion(x0, y0, t);

    // the lit seams
    if (P.seam > 0.01 && R > 0.5) {
      ctx.save();
      ctx.strokeStyle = `rgba(${AMBER},${0.95 * P.seam})`; ctx.lineWidth = 1.3;
      ctx.shadowColor = `rgba(224,150,90,${0.9 * P.seam})`; ctx.shadowBlur = 16;
      for (let k = 0; k < 5; k++) {
        const a0 = rot + k * FIFTH, a1 = a0 + FIFTH;
        const midA = (a0 + a1) / 2, px = x0 + Math.cos(midA) * e, py = y0 + Math.sin(midA) * e;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, R, a0, a1); ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }

    // the moon's lit rim (at rest, while lifting, and when it comes back)
    const rimA = (1 - clamp(P.seam * 2)) * P.disc * (1 - clamp(P.la * 2));
    if (rimA > 0.01 && R > 0.5) {
      const c = charge();
      ctx.save();
      ctx.strokeStyle = `rgba(${AMBER},${0.8 * rimA})`; ctx.lineWidth = 1;
      ctx.shadowColor = `rgba(208,149,96,${(0.45 + c * 0.4) * rimA})`; ctx.shadowBlur = 30 + c * 50;
      ctx.beginPath(); ctx.arc(x0, y0, R, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // the world names at the rim, while the disc is parted
    if (P.lab > 0.01) {
      ctx.save();
      ctx.font = `500 ${phone ? 9 : 11}px "Archivo Variable", Arial, sans-serif`;
      try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.18em'; } catch { /* older engines */ }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < 5; k++) {
        const midA = rot + (k + 0.5) * FIFTH;
        const rl = Math.min(R * 0.8, minD * 0.42);
        const lx = x0 + Math.cos(midA) * rl, ly = y0 + Math.sin(midA) * rl;
        const name = worlds[order[k]].short.toUpperCase();
        ctx.globalAlpha = P.lab;
        ctx.fillStyle = 'rgba(10,8,8,0.4)'; ctx.fillText(name, lx + 1, ly + 1);
        ctx.fillStyle = '#f4efe6'; ctx.fillText(name, lx, ly);
      }
      ctx.restore();
    }

    // DOM that follows the canvas
    target.style.setProperty('--cx', `${cx}px`); target.style.setProperty('--cy', `${cy}px`);
    target.style.setProperty('--Rm', `${((D / 2) * s).toFixed(1)}px`);
    root.style.setProperty('--open', clamp(Math.max(P.g - 1, P.lat)).toFixed(3));
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
    pointer?.style.setProperty('--hold', c.toFixed(3));
    if (Math.abs(video.playbackRate - P.rate) > 0.05) video.playbackRate = Math.min(8, Math.max(0.5, P.rate));
  };

  // ── the answer ──────────────────────────────────────────────────────────────────────────
  const answerChars = $$('.hx__t', answerText).flatMap((el) => new SplitText(el, { type: 'words,chars', wordsClass: 'word', charsClass: 'char' }).chars as HTMLElement[]);
  const showAnswer = () => {
    answerText.style.visibility = 'visible';
    gsap.fromTo(answerChars, { opacity: 0, yPercent: 60, rotateX: -80 }, { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.9, ease: EASE.out, stagger: 0.016, overwrite: true });
  };
  const hideAnswer = (fast = false) => {
    if (answerText.style.visibility !== 'visible') return;
    gsap.to(answerChars, { opacity: 0, yPercent: -40, rotateX: 60, duration: fast ? 0.22 : 0.34, ease: EASE.in, stagger: 0.004, overwrite: true,
      onComplete: () => { answerText.style.visibility = 'hidden'; } });
  };

  // ── the timeline ────────────────────────────────────────────────────────────────────────
  const tl = gsap.timeline({ paused: true });
  // I — lift and part (the version the client approved)
  tl.to(P, { g: 1, duration: 0.95, ease: EASE.inOut }, 0)
    .to(P, { dim: 1, duration: 0.7, ease: 'power2.out' }, 0)
    .to(P, { guide: 1, duration: 0.9, ease: EASE.out }, 0.25)
    .to(P, { sp: 0.32, rate: 2.5, duration: 1.2, ease: 'power2.inOut' }, 0)
    .to(P, { seam: 1, duration: 0.45, ease: EASE.out }, 0.85)
    .to(P, { ex: 0.022, duration: 0.9, ease: EASE.out }, 0.95)
    .to(P, { lab: 1, duration: 0.6, ease: 'power1.out' }, 1.3);
  M.forEach((m, k) => tl.to(m, { m: 1, duration: 0.8, ease: EASE.inOut }, 1.15 + 0.14 * k));
  // II — set: the slices lock, the pattern inks outwards from the seams, the disc dissolves into it
  tl.call(() => { rotSet = rot; }, [], SET)
    .to(P, { ex: 0, duration: 0.5, ease: EASE.inOut }, SET)
    .to(P, { lab: 0, duration: 0.35 }, SET)
    .to(P, { la: 1, duration: 0.4, ease: 'power1.out' }, SET + 0.15)
    .to(P, { lat: 1.04, duration: 2.1, ease: 'power2.inOut' }, SET + 0.15)
    .to(P, { guide: 0.18, duration: 0.8 }, SET + 0.3)
    .to(P, { seam: 0, duration: 0.8 }, SET + 0.5)
    .to(P, { disc: 0, duration: 1.2, ease: 'power1.inOut' }, SET + 0.55)
    .to(P, { med: 1, duration: 0.9, ease: 'power1.out' }, SET + 0.7)
    .to(P, { sp: 0.12, duration: 1.2, ease: 'power2.out' }, SET);
  // III — turn: the rings' own clock does the turning; the camera leans in while they gather, then settles
  tl.to(P, { guide: 0, duration: 0.6 }, 4.2)
    .to(P, { z: 1.07, duration: 1.8, ease: 'power2.inOut' }, 4.2)
    .to(P, { z: 1, duration: 1.1, ease: EASE.inOut }, lockStart(0) + 0.1);
  // IV — the answer: the medallion lets go of its light; the disc opens again at its centre, whole
  M.forEach((m) => tl.set(m, { m: 0 }, ANSWER - 0.05));
  tl.set(P, { iris: 0, seam: 0, ex: 0 }, ANSWER - 0.05)
    .to(P, { la: 0, med: 0, duration: 0.9, ease: 'power1.in' }, ANSWER + 0.1)
    .to(P, { z: 1.35, duration: 1.2, ease: 'power1.in' }, ANSWER + 0.1)
    .to(P, { disc: 1, duration: 0.3 }, ANSWER)
    .to(P, { iris: 1, duration: 1.1, ease: EASE.out }, ANSWER)
    .to(P, { guide: 0.55, duration: 0.9, ease: EASE.out }, ANSWER + 0.45)
    .to(P, { sp: 0.3, rate: 3, duration: 1.2, ease: 'power2.out' }, ANSWER + 0.2);
  tl.call(() => { showAnswer(); if (!done) { done = true; root.dataset.done = ''; hint.textContent = hint.dataset.again || hint.textContent; } }, [], ANSWER_AT)
    .to({}, { duration: 0.6 });

  // ── press / release ─────────────────────────────────────────────────────────────────────
  let collapse: gsap.core.Timeline | null = null;
  let running = false;
  const tick = (_t: number, dtMs: number) => { rot += (P.sp * Math.min(dtMs, 64)) / 1000; draw(); };
  const wake = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
  const sleep = () => { if (running && !holding) { running = false; gsap.ticker.remove(tick); } };

  const press = () => {
    if (holding) return;
    loadSources();
    bake();
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
    hideAnswer(true);
    collapse = gsap.timeline({ onComplete: () => { tl.pause(0); if (header) header.dataset.hidden = 'false'; } })
      .to(P, { ...REST, duration: 1.0, ease: EASE.inOut }, 0)
      .to(M, { m: 0, duration: 0.6, ease: EASE.inOut }, 0.15);
  };

  // Touch: a finger that lands on the moon may be starting a scroll, so the press waits a beat and is abandoned
  // if the finger travels (or the browser takes the gesture for panning). Mouse and pen press at once.
  const LONG_PRESS_MS = 170, SLOP = 10;
  let pending = 0, downX = 0, downY = 0, downId = -1;
  const cancelPending = () => { if (pending) { clearTimeout(pending); pending = 0; } };
  for (const el of [target, button]) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.pointerType === 'touch') {
        cancelPending();
        downX = e.clientX; downY = e.clientY; downId = e.pointerId;
        pending = window.setTimeout(() => { pending = 0; press(); }, LONG_PRESS_MS);
        return;
      }
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      press();
    });
    el.addEventListener('pointermove', (e) => {
      if (pending && e.pointerId === downId && Math.hypot(e.clientX - downX, e.clientY - downY) > SLOP) cancelPending();
    });
    el.addEventListener('pointerup', () => { cancelPending(); release(); });
    el.addEventListener('pointercancel', () => { cancelPending(); release(); });
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  // Once a touch hold has begun, the finger may drift: it must not scroll the page away from the scene.
  root.addEventListener('touchmove', (e) => { if (holding && e.cancelable) e.preventDefault(); }, { passive: false });
  addEventListener('touchend', () => { cancelPending(); release(); }, { passive: true });
  addEventListener('touchcancel', () => { cancelPending(); release(); }, { passive: true });
  button.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(); } });
  button.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
  button.addEventListener('blur', release);
  addEventListener('blur', release);

  // The frame loop runs while the scene is on screen (the footage needs redrawing anyway), and while held.
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      loadSources(); video.play().catch(() => {}); wake();
      // bake the pattern while nothing else is happening, so the press never waits for it
      (window.requestIdleCallback || ((f: () => void) => setTimeout(f, 200)))(() => bake());
    }
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

  // QA: render any moment of the hold (?qa): __held.at(seconds), __held.release()
  if (/[?&]qa\b/.test(location.search)) {
    (window as unknown as { __held: object }).__held = {
      at: (t: number) => { loadSources(); bake(); holding = true; root.dataset.holding = ''; if (header) header.dataset.hidden = 'true'; tl.pause(); tl.seek(t, false); wake(); draw(); return JSON.stringify({ t, z: +P.z.toFixed(2), lat: +P.lat.toFixed(2), med: +P.med.toFixed(2) }); },
      release,
      bench: (t: number, n = 30) => { tl.seek(t, false); const t0 = performance.now(); for (let i = 0; i < n; i++) draw(); return +((performance.now() - t0) / n).toFixed(2); },
      // with each frame finished on the GPU before the clock stops (a 1-px readback forces it)
      benchFlush: (t: number, n = 20) => { tl.seek(t, false); ctx.getImageData(0, 0, 1, 1); const t0 = performance.now(); for (let i = 0; i < n; i++) { draw(); ctx.getImageData(0, 0, 1, 1); } return +((performance.now() - t0) / n).toFixed(2); },
    };
  }
}
