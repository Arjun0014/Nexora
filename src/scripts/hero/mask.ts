/**
 * The title card. A studio-black layer with NEXORA knocked out of it, drawn as vector every frame.
 *
 *   t = 0  the knock-out is scaled so far up that the whole stage sits inside the crossing of the X
 *          → the layer is invisible and the frozen scene is fully seen
 *   t = 1  the word rests at 88% of the stage width; its letters are windows onto the scene
 *
 * Scale is interpolated exponentially (perceptually linear zoom). Because it is a Path2D fill there is
 * no raster blur at any scale and the cost is one path fill per frame.
 */
import wordmark from '../../data/wordmark.json';
import { lerp } from '../core/env';

const REST_WIDTH = 0.88;

export class TitleMask {
  private ctx: CanvasRenderingContext2D;
  private path = new Path2D(wordmark.d);
  private w = 1; private h = 1; private ratio = 1;
  private lastT = -1;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.ratio = Math.min(devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(r.width * this.ratio));
    this.h = Math.max(1, Math.round(r.height * this.ratio));
    this.canvas.width = this.w; this.canvas.height = this.h;
    this.lastT = -1;
  }

  /** Where the word rests, in backing pixels: used by the DOM layer to place the statement under it. */
  restBox() {
    const k = (this.w * REST_WIDTH) / wordmark.width;
    const ww = wordmark.width * k, wh = wordmark.height * k;
    const portrait = this.w / this.h < 1;
    const x = (this.w - ww) / 2;
    const y = this.h * (portrait ? 0.34 : 0.42) - wh / 2;
    return { x, y, w: ww, h: wh, k };
  }

  /** Bottom edge of the resting word in CSS pixels, so the DOM can set the statement beneath it. */
  restBottomCss() {
    const b = this.restBox();
    return (b.y + b.h) / this.ratio;
  }

  draw(t: number) {
    if (t === this.lastT) return;
    this.lastT = t;
    const { ctx, w: W, h: H } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (t <= 0) return;

    const box = this.restBox();
    // The scale at which the clearance circle inside the X swallows the whole stage.
    const sMax = (1.25 * Math.hypot(W, H) / 2) / (wordmark.anchor.r * box.k);
    // Ease-out only: the edges must enter the frame as soon as the user scrolls, then come to a dead stop.
    const p = 1 - Math.pow(1 - t, 1.9);
    const s = Math.exp(lerp(Math.log(sMax), 0, p));

    // The anchor travels from the centre of the stage to its resting place inside the word.
    const restAx = box.x + wordmark.anchor.x * box.k;
    const restAy = box.y + wordmark.anchor.y * box.k;
    const ax = lerp(W / 2, restAx, p), ay = lerp(H / 2, restAy, p);

    ctx.fillStyle = '#0b0a09';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    const ks = box.k * s;
    ctx.setTransform(ks, 0, 0, ks, ax - wordmark.anchor.x * ks, ay - wordmark.anchor.y * ks);
    ctx.fill(this.path);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
}
