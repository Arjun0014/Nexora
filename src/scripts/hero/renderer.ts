/**
 * Single-canvas renderer for the whole film: the idle loop (a <video>), the scrub frames and the rest
 * stills all pass through draw(), so hand-offs between them can never differ in compositing.
 *
 * fit(e): e = 0 → the source is CONTAINED at 82% so the disc floats with the corners free for UI
 *         e = 1 → the source COVERS the stage around a focus centre (the human action)
 * Scale is interpolated exponentially so the push-in feels constant, and while e < 1 the area around
 * the frame is filled with a blurred, darkened copy of the frame itself — the footage's backdrop is
 * warm on the left and cool on the right, so a flat page colour would show a seam.
 */
import { clamp, lerp } from '../core/env';

const CONTAIN_SCALE = 0.82; // landscape: the disc floats with the corners free for UI
const CONTAIN_SCALE_PORTRAIT = 1; // portrait: width is the scarce dimension, so use all of it
const MAX_BACKING_WIDTH = 1920; // the source is 720p; more pixels buy nothing
const FEATHER = 0.09;

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private tiny = document.createElement('canvas');
  private hb = document.createElement('canvas'); // blurred horizontally only → top/bottom extension
  private vb = document.createElement('canvas'); // blurred vertically only → left/right extension
  private tctx: CanvasRenderingContext2D;
  private hctx: CanvasRenderingContext2D;
  private vctx: CanvasRenderingContext2D;
  cssW = 1; cssH = 1; w = 1; h = 1; ratio = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    // Needs an alpha channel: the feather uses destination-in, the underlay uses destination-over.
    this.ctx = canvas.getContext('2d')!;
    this.tiny.width = 48; this.tiny.height = 27;
    this.hb.width = 6; this.hb.height = 27;
    this.vb.width = 48; this.vb.height = 4;
    this.tctx = this.tiny.getContext('2d')!;
    this.hctx = this.hb.getContext('2d')!;
    this.vctx = this.vb.getContext('2d')!;
  }

  resize(): boolean {
    const r = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(r.width)), cssH = Math.max(1, Math.round(r.height));
    const ratio = Math.min(Math.min(devicePixelRatio || 1, 2), MAX_BACKING_WIDTH / cssW);
    const w = Math.round(cssW * ratio), h = Math.round(cssH * ratio);
    if (w === this.w && h === this.h) return false;
    this.cssW = cssW; this.cssH = cssH; this.ratio = ratio; this.w = w; this.h = h;
    this.canvas.width = w; this.canvas.height = h;
    return true;
  }

  get portrait() { return this.cssW / this.cssH < 1; }

  /** Destination rectangle (in backing pixels) for a source of sw×sh at fit e. */
  rect(sw: number, sh: number, e: number, focusX: number) {
    const { w: W, h: H } = this;
    const sContain = Math.min(W / sw, H / sh) * (this.portrait ? CONTAIN_SCALE_PORTRAIT : CONTAIN_SCALE);
    const sCover = Math.max(W / sw, H / sh);
    const s = Math.exp(lerp(Math.log(sContain), Math.log(sCover), e));
    const dw = sw * s, dh = sh * s;

    // Contained: centred, nudged up so the headline has the bottom corners. Portrait sits higher still.
    const cxC = W / 2, cyC = H * (this.portrait ? 0.4 : 0.47);
    // Covered: the focus centre sits mid-stage, clamped so the frame always reaches both edges.
    const dwV = sw * sCover, dhV = sh * sCover;
    const leftV = clamp(W / 2 - focusX * dwV, W - dwV, 0);
    const cxV = leftV + dwV / 2, cyV = (H - dhV) / 2 + dhV / 2;

    const cx = lerp(cxC, cxV, e), cy = lerp(cyC, cyV, e);
    return { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh };
  }

  /** CSS object-position that reproduces rect(…, e = 1) for an <img> with object-fit: cover. */
  objectPosition(sw: number, sh: number, focusX: number): string {
    const { w: W, h: H } = this;
    const s = Math.max(W / sw, H / sh);
    const dw = sw * s;
    const left = clamp(W / 2 - focusX * dw, W - dw, 0);
    const px = dw - W > 0.5 ? (-left / (dw - W)) * 100 : 50;
    return `${px.toFixed(2)}% 50%`;
  }

  draw(src: CanvasImageSource, sw: number, sh: number, e: number, focusX: number) {
    const { ctx, w: W, h: H } = this;
    const r = this.rect(sw, sh, e, focusX);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (e >= 0.999 && r.x <= 0 && r.y <= 0 && r.x + r.w >= W && r.y + r.h >= H) {
      ctx.drawImage(src, r.x, r.y, r.w, r.h);
      return;
    }

    // 1. the frame, 2. feather its edges to transparent, 3. slide a veil and a blurred copy in BEHIND it.
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(src, r.x, r.y, r.w, r.h);

    // Feather each axis for as long as that edge of the frame is actually on stage. (Tying it to `e`
    // fails in portrait, where the frame's top and bottom stay visible through most of the push-in.)
    const right0 = r.x + r.w, bottom0 = r.y + r.h;
    const fx = FEATHER * clamp(Math.max(r.x, W - right0) / (0.03 * W));
    const fy = FEATHER * 1.7 * clamp(Math.max(r.y, H - bottom0) / (0.03 * H));
    ctx.globalCompositeOperation = 'destination-in';
    if (fx > 0.002) {
      const gx = ctx.createLinearGradient(r.x, 0, right0, 0);
      gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(fx, '#000'); gx.addColorStop(1 - fx, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gx; ctx.fillRect(0, 0, W, H);
    }
    if (fy > 0.002) {
      const gy = ctx.createLinearGradient(0, r.y, 0, bottom0);
      gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(fy, '#000'); gy.addColorStop(1 - fy, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gy; ctx.fillRect(0, 0, W, H);
    }

    // Everything from here is painted BEHIND what is already on the canvas, nearest layer first.
    ctx.globalCompositeOperation = 'destination-over';

    // a) a veil so the surround never competes with the frame
    ctx.fillStyle = `rgba(11,10,9,${(0.46 * Math.max(1 - e, 0.35)).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);

    // b) a vignette that returns the far corners to studio black
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const vg = ctx.createRadialGradient(cx, cy, r.h * 0.46, cx, cy, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(11,10,9,0)'); vg.addColorStop(1, 'rgba(11,10,9,0.96)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // c) the frame's own light, continued to the stage edges. Each margin is a wash stretched from the
    //    frame's outermost row/column, blurred ALONG that edge only (blurring across it would average
    //    bright disc into a dark border; not blurring along it stretches detail into streaks).
    //    The wash runs UNDER the feathered band, so the sharp frame dissolves straight into it and there
    //    is no boundary anywhere for the eye to find.
    const hb = this.hb, vb = this.vb;
    this.tctx.drawImage(src, 0, 0, this.tiny.width, this.tiny.height);
    this.hctx.drawImage(this.tiny, 0, 0, hb.width, hb.height);
    this.vctx.drawImage(this.tiny, 0, 0, vb.width, vb.height);
    const bandY = fy * r.h + 2, bandX = fx * r.w + 2;
    if (r.y > 0 || fy > 0) ctx.drawImage(hb, 0, 0, hb.width, 1, r.x, 0, r.w, Math.max(0, r.y) + bandY);
    if (bottom0 < H || fy > 0) ctx.drawImage(hb, 0, hb.height - 1, hb.width, 1, r.x, bottom0 - bandY, r.w, H - bottom0 + bandY);
    if (r.x > 0 || fx > 0) ctx.drawImage(vb, 0, 0, 1, vb.height, 0, 0, Math.max(0, r.x) + bandX, H);
    if (right0 < W || fx > 0) ctx.drawImage(vb, vb.width - 1, 0, 1, vb.height, right0 - bandX, 0, W - right0 + bandX, H);

    // d) and studio black under it all, so the canvas is always opaque
    ctx.fillStyle = '#0b0a09';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  fill(color: string) {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }
}
