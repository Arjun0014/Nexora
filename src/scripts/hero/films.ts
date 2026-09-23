/**
 * The five worlds' films (docs/redesign/09-HERO-V9.md). No three.js here: the films begin to download the moment the
 * hero starts, alongside the court's code, since they are most of what it loads. Each is fetched WHOLE while the intro
 * is up (its bytes are most of the intro's progress) and played from memory (a blob URL), so a loop never waits on the
 * network. Each plays in a <video> in the page, in view but invisible (see `filmHost`); the court draws it into its
 * doorway (./court: a video texture).
 *
 * A download that stalls is restarted once; a film that still cannot be had is given as `video: null` and the court
 * hangs its poster instead, so the court always opens whole.
 */

export interface Film {
  id: string;
  /** null when the film could not be loaded: the court shows its poster */
  video: HTMLVideoElement | null;
}

/** The films' frame rate (scripts/build-hero9.mjs keeps the sources' 25). */
export const FILM_FPS = 25;
/** A download that receives nothing for this long is restarted (once), then given up for the poster. */
const STALL_MS = 15000;
/** Bytes assumed for a film whose size is not known yet (before its headers arrive). */
const GUESS = 3e6;

/**
 * Where the films' <video>s live. A browser plays a video at its full rate only while it counts as seen: in the
 * viewport, not clipped, not covered, not stacked under another (measured in Chrome: a video hidden under the court's
 * canvas, clipped away, or behind its neighbour in a 2 px box drops most of its frames and its clock runs slow). So
 * they stand side by side, 8 × 14 px each, in the viewport's bottom corner, over everything (even the intro, which
 * they start under), at 1% opacity: seen, as far as the browser knows; invisible to the eye.
 */
export function filmHost() {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.dataset.films = '';
  host.style.cssText = 'position:fixed;right:0;bottom:0;display:flex;opacity:0.01;pointer-events:none;z-index:350';
  document.body.appendChild(host);
  return host;
}

/** 720 px wide wherever a doorway can stand that wide on screen; 540 on phones and the lowest quality tier. */
export const filmSize = (quality: string) => (quality === 'low' || Math.min(screen.width, screen.height) < 760 ? 540 : 720);

/** A file, whole, its bytes reported as they arrive. */
async function fetchWhole(url: string, onBytes: (loaded: number, total: number) => void, tries = 2): Promise<Blob> {
  for (let attempt = 1; ; attempt++) {
    const ctl = new AbortController();
    let timer = 0;
    const arm = () => { clearTimeout(timer); timer = window.setTimeout(() => ctl.abort(), STALL_MS); };
    try {
      arm();
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
      const total = Number(res.headers.get('content-length')) || 0;
      const reader = res.body.getReader();
      const parts: Uint8Array[] = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        arm();
        parts.push(value);
        loaded += value.byteLength;
        onBytes(loaded, Math.max(total, loaded));
      }
      clearTimeout(timer);
      return new Blob(parts as BlobPart[], { type: 'video/mp4' });
    } catch (e) {
      clearTimeout(timer);
      onBytes(0, 0);
      if (attempt >= tries) throw e;
    }
  }
}

/** A silent, looping, inline <video> on the blob, resolved once its first frame can be drawn. */
function makeVideo(src: string, host: HTMLElement): Promise<HTMLVideoElement> {
  const v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
  v.disablePictureInPicture = true;
  (v as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true;
  v.style.cssText = 'flex:none;width:8px;height:14px;object-fit:cover';
  v.src = src;
  host.appendChild(v);
  return new Promise((resolve, reject) => {
    let nudge = 0;
    const off = () => { clearTimeout(nudge); v.removeEventListener('loadeddata', ok); v.removeEventListener('error', bad); };
    const ok = () => { off(); resolve(v); };
    const bad = () => { off(); v.remove(); reject(new Error(`film ${src}: ${v.error?.message || 'cannot be decoded'}`)); };
    v.addEventListener('loadeddata', ok);
    v.addEventListener('error', bad);
    if (v.readyState >= 2) { ok(); return; }
    // some browsers (iOS) will not decode a first frame before playback is asked for: ask, and stop again at once
    nudge = window.setTimeout(() => { v.play().then(() => { v.pause(); v.currentTime = 0; }).catch(() => {}); }, 2500);
  });
}

/**
 * The films at `size` px wide, each whole and ready to draw (never rejects: a film that cannot be had is given with
 * `video: null`), with their download progress (0…1, by bytes).
 */
export function loadFilms(ids: string[], size: number, host: HTMLElement, onProgress: (f: number) => void): Promise<Film[]> {
  const loaded = ids.map(() => 0), totals = ids.map(() => GUESS);
  const report = () => onProgress(loaded.reduce((a, b) => a + b, 0) / totals.reduce((a, b) => a + b, 0));
  return Promise.all(ids.map(async (id, i): Promise<Film> => {
    try {
      const blob = await fetchWhole(`/media/hero9/${id}-${size}.mp4`, (l, t) => { loaded[i] = l; totals[i] = t || GUESS; report(); });
      loaded[i] = totals[i] = blob.size;
      report();
      return { id, video: await makeVideo(URL.createObjectURL(blob), host) };
    } catch (err) {
      console.warn(`[hero] the ${id} film could not be loaded; its poster stands in`, err);
      loaded[i] = totals[i];
      report();
      return { id, video: null };
    }
  }));
}

/**
 * Playing and pausing all five together. A browser may refuse playback without a gesture (iOS in Low Power Mode):
 * the films then hold their first frame and start at the visitor's first touch, click, key or wheel.
 */
export class Reel {
  private want = false;
  private waiting = false;
  constructor(readonly films: Film[]) {}

  /** Some film is playing (the court must then be redrawn every frame). */
  get live() { return this.want && this.films.some((f) => f.video && !f.video.paused); }

  /** How many are playing. */
  get playing() { return this.films.filter((f) => f.video && !f.video.paused).length; }


  /** Frames the films have shown so far, all told (decoded and not dropped), to measure their pace by. */
  shown() {
    let n = 0;
    for (const f of this.films) {
      const q = f.video?.getVideoPlaybackQuality?.();
      if (q) n += q.totalVideoFrames - q.droppedVideoFrames;
    }
    return n;
  }

  play() {
    this.want = true;
    for (const f of this.films) {
      if (!f.video || !f.video.paused) continue;
      f.video.play().catch(() => this.retryOnGesture());
    }
  }

  pause() {
    this.want = false;
    for (const f of this.films) f.video?.pause();
  }

  private retryOnGesture() {
    if (this.waiting) return;
    this.waiting = true;
    const evs = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const;
    const go = () => {
      for (const e of evs) removeEventListener(e, go, true);
      this.waiting = false;
      if (this.want) this.play();
    };
    for (const e of evs) addEventListener(e, go, { capture: true, passive: true });
  }
}
