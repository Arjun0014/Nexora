/**
 * Frame-sequence loader.
 *
 * Guarantees the renderer is never handed a frame that is not fully loaded:
 *  - frames load IN ORDER (forwards, or backwards when a sequence is first approached from its end)
 *  - `range()` reports the contiguous loaded run from each end; the state machine clamps the playhead to it
 *  - nearby frames are pre-decoded off the main thread so a scrub never pays a synchronous decode
 */
export interface SeqSpec { id: string; frames: number; mFrames: number; mStep: number }

type Slot = { url: string; img: HTMLImageElement | null; ok: boolean; tries: number };

export class Sequence {
  slots: Slot[] = [];
  started = false;
  done = false;
  private lo = 0; // frames loaded contiguously from the start
  private hi = 0; // frames loaded contiguously from the end
  private queue: number[] = [];
  private inflight = 0;

  /** `first`: source frames before this index are never played, so they are never requested. */
  constructor(public spec: SeqSpec, portrait: boolean, base: string, first = 0) {
    const dir = `${base}/seq/${spec.id}/${portrait ? 'm' : 'd'}`;
    const pad = (n: number) => String(n).padStart(3, '0');
    const indices: number[] = [];
    if (portrait && spec.mStep > 1) {
      for (let i = first; i < spec.frames; i++) if (i % spec.mStep === 0 || i === spec.frames - 1) indices.push(i);
    } else {
      for (let i = first; i < spec.frames; i++) indices.push(i);
    }
    this.slots = indices.map((i) => ({ url: `${dir}/f${pad(i)}.webp`, img: null, ok: false, tries: 0 }));
  }

  get length() { return this.slots.length; }
  get progress() { return this.slots.reduce((n, s) => n + (s.ok ? 1 : 0), 0) / this.slots.length; }

  /** Contiguous loaded runs: frames [0, lo) and [length - hi, length). */
  range() { return { lo: this.lo, hi: this.hi, full: this.done }; }

  frame(i: number): HTMLImageElement | null {
    const s = this.slots[i];
    return s && s.ok ? s.img : null;
  }

  load(order: 'fwd' | 'rev' = 'fwd', concurrency = 6, onProgress?: () => void) {
    if (this.started) return;
    this.started = true;
    const n = this.slots.length;
    this.queue = Array.from({ length: n }, (_, i) => (order === 'fwd' ? i : n - 1 - i));
    const pump = () => {
      while (this.inflight < concurrency && this.queue.length) {
        const i = this.queue.shift()!;
        const slot = this.slots[i];
        const img = new Image();
        img.decoding = 'async';
        // Frames must never out-compete the loop video or the page's own assets.
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
        this.inflight++;
        const settle = (ok: boolean) => {
          this.inflight--;
          if (ok) { slot.ok = true; slot.img = img; }
          else if (slot.tries < 2) {
            // Transient network failure: retry shortly, keeping its place at the FRONT so order is preserved.
            slot.tries++;
            setTimeout(() => { if (this.started) { this.queue.unshift(i); pump(); } }, 600 * slot.tries);
          }
          this.recount();
          onProgress?.();
          pump();
        };
        img.onload = () => settle(true);
        img.onerror = () => settle(false);
        img.src = slot.url;
      }
    };
    pump();
  }

  private recount() {
    const n = this.slots.length;
    while (this.lo < n && this.slots[this.lo].ok) this.lo++;
    while (this.hi < n && this.slots[n - 1 - this.hi].ok) this.hi++;
    this.done = this.lo >= n;
  }

  /** Ask the browser to decode frames around the playhead ahead of time. Cheap and idempotent. */
  warm(center: number, dir: number, span = 6) {
    for (let k = 1; k <= span; k++) {
      const i = center + k * (dir >= 0 ? 1 : -1);
      const img = this.frame(i);
      if (img && !(img as HTMLImageElement & { _w?: boolean })._w) {
        (img as HTMLImageElement & { _w?: boolean })._w = true;
        img.decode?.().catch(() => { /* decode hints are best-effort */ });
      }
    }
  }

  /** Drop decoded + compressed data (small screens only). Reloads come from the HTTP cache. */
  release() {
    for (const s of this.slots) { s.img = null; s.ok = false; s.tries = 0; }
    this.started = false; this.done = false; this.lo = 0; this.hi = 0; this.queue = []; this.inflight = 0;
  }
}

export function loadImage(url: string, priority: 'high' | 'low' | 'auto' = 'auto'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
