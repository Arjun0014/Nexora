/**
 * Hero state machine — gesture-stepped, time-played. See docs/implementation/04-HERO-IMPLEMENTATION.md.
 *
 *   IDLE  stop 0: the loop video plays and is drawn into the canvas
 *   FILM  everything else: frame sequences + rest stills; the playhead `p` moves in TIME toward `target`
 *   DIP   safety net: a fade through the divider-wall bronze onto a rest still (starved network, Home, snaps)
 *
 * One gesture = one leg at the footage's natural speed. Gestures that arrive while a leg is playing move `target`
 * on (a short queue); queued legs play faster; a change of mind eases through zero and plays the leg backwards.
 * After the title card (the last stop) the page scrolls natively; scrolling back to the top re-enters there.
 *
 * Invariants: the canvas is never blank · the playhead never enters frames that have not loaded · the film only
 * ever rests on a stop (integer p), so it cannot be left between two states.
 */
import manifest from '../../data/media-manifest.json';
import { worlds } from '../../data/worlds';
import { $, clamp, env, invLerp, lerp, smoothstep } from '../core/env';
import { onTick, damp } from '../core/ticker';
import { buildLegs, locate, worldAtStop, ENTRY_START_FRAME, LEG_COUNT, TITLE_STOP, WORLD_COUNT } from './timeline';
import { Sequence, loadImage } from './loader';
import { Renderer } from './renderer';
import { TitleMask } from './mask';
import { HeroUI } from './ui';
import { bindInput, type Dir } from './input';

const BASE = '/media/hero';
const NARROW = 0.8; // below this aspect the portrait-cropped frame set is used
const MAX_PENDING = 2; // stops that may be queued beyond the leg being played
const BOOST = 0.85; // extra playback speed per queued stop
const STARVE_MS = 1200; // frames missing for this long → cut to the destination's rest still
const ENTRY_PUSH_END = 0.3; // the floating disc has pushed in to full-bleed by this point of the entry leg
const MIN_ENTRY_FRAMES = 40; // film in hand before the overview may be left
const HANDOFF_MS = 200; // loop → blurred spin cross-fade
const SPIN_DOWN = { rate: 5, seconds: 1.6, fade: 460 }; // coming back out: the loop starts fast and eases to 1×

/** Read by the intro so its progress is the film's real loading progress. */
export const heroLoad = { active: false, progress: 0, done: false };

export function initHero() {
  const root = $('[data-hero]');
  if (!root) return;

  // A change of motion preference changes the page's whole layout mode; reload into the right one.
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => location.reload());
  if (!env.cinema) return;

  const stage = $('[data-stage]', root)!;
  const media = $('[data-media]', root)!;
  const video = $<HTMLVideoElement>('[data-loop]', root)!;
  const hd = $<HTMLImageElement>('[data-hd]', root)!;
  const dip = $('[data-dip]', root)!;
  const ghost = $<HTMLCanvasElement>('[data-ghost]', root)!;
  const gctx = ghost.getContext('2d')!;
  const renderer = new Renderer($<HTMLCanvasElement>('[data-canvas]', root)!);
  const mask = new TitleMask($<HTMLCanvasElement>('[data-mask]', root)!);
  const ui = new HeroUI(root);
  const legs = buildLegs(manifest.sequences.map((s) => s.frames));
  const params = new URLSearchParams(location.search);

  let narrow = innerWidth / innerHeight < NARROW;
  let seqs: Sequence[] = [];
  let rests: (HTMLImageElement | null)[] = [];
  let poster: HTMLImageElement | null = null;

  // ── loading bookkeeping (drives the intro) ──────────────────────────────────────────────
  const part = { poster: 0, video: 0, rests: 0 };
  const report = () => {
    const entry = seqs[0]?.progress ?? 0;
    heroLoad.progress = 0.02 * part.poster + 0.36 * part.video + 0.04 * part.rests + 0.58 * entry;
    heroLoad.done = part.poster >= 1 && part.video >= 1 && part.rests >= 1 && entry >= 1;
  };

  const makeMedia = () => {
    seqs.forEach((s) => s.release());
    seqs = manifest.sequences.map((spec, i) => new Sequence(spec, narrow, BASE, i === 0 ? ENTRY_START_FRAME : 0));
    rests = worlds.map(() => null);
    let got = 0;
    worlds.forEach((w, i) => loadImage(`${BASE}/rest/${w.id}${narrow ? '-m' : ''}.webp`, 'low')
      .then((img) => { rests[i] = img; dirty = true; })
      .catch(() => { /* the sequence's own last frame stands in */ })
      .finally(() => { part.rests = ++got / worlds.length; report(); }));
  };

  const focusFull = () => lerp(0.72, 0.5, invLerp(NARROW, 1.6, renderer.cssW / renderer.cssH));

  // ── state ───────────────────────────────────────────────────────────────────────────────
  let mode: 'idle' | 'film' = 'idle';
  let p = 0; // playhead, in stops
  let target = 0; // the stop the film is heading for
  let vel = 0; // signed playback speed, 1 = natural
  let travel: Dir = 1;
  let dirty = true;
  let lastDrawKey = '';
  let inView = true;
  let dipping = false;
  let starvedSince = 0;
  let restSince = 0;
  let push = 0;
  let spinT0 = 0;

  const moving = () => p !== target;
  /** The leg under the playhead when travelling in `dir`. */
  const legFor = (dir: Dir) => clamp(dir > 0 ? Math.floor(p + 1e-9) : Math.ceil(p - 1e-9) - 1, 0, LEG_COUNT - 1);

  // ── drawing ─────────────────────────────────────────────────────────────────────────────
  function drawVideo() {
    if (video.readyState >= 2 && video.videoWidth) renderer.draw(video, video.videoWidth, video.videoHeight, 0, 0.5);
    else if (poster) renderer.draw(poster, poster.naturalWidth, poster.naturalHeight, 0, 0.5);
  }

  function nearestFrame(s: Sequence, idx: number): HTMLImageElement | null {
    for (let d = 1; d < s.length; d++) {
      const a = s.frame(idx - d); if (a) return a;
      const b = s.frame(idx + d); if (b) return b;
    }
    return null;
  }

  function renderFilm() {
    const loc = locate(p);
    let img: HTMLImageElement | null = null;
    let e = 1, focus = narrow ? 0.5 : focusFull(), key = '', maskT = 0;

    if (loc.rest || legs[loc.leg].kind === 'exit') {
      // A frozen world. The exit leg is the same still with the NEXORA knock-out closing over it.
      const w = loc.rest ? worldAtStop(loc.stop) : WORLD_COUNT - 1;
      if (w < 0) return;
      img = rests[w] ?? seqs[w].frame(seqs[w].length - 1);
      key = `r${w}:${img ? 1 : 0}`;
      maskT = loc.rest ? (loc.stop === TITLE_STOP ? 1 : 0) : loc.local;
    } else {
      const s = seqs[legs[loc.leg].seq];
      const idx = Math.round(loc.local * (s.length - 1));
      img = s.frame(idx) ?? nearestFrame(s, idx);
      if (loc.leg === 0) { e = smoothstep(0, ENTRY_PUSH_END, loc.local); if (narrow) focus = 0.72; }
      key = `s${loc.leg}:${idx}:${e.toFixed(3)}`;
      s.warm(idx, vel >= 0 ? 1 : -1, Math.ceil(6 * Math.max(1, Math.abs(vel))));
    }
    mask.draw(maskT);

    if (!img) return; // nothing new to show: the previous frame stays on the canvas
    key += `|${renderer.w}x${renderer.h}`;
    if (key === lastDrawKey) return;
    lastDrawKey = key;
    renderer.draw(img, img.naturalWidth, img.naturalHeight, e, focus);
  }

  /** Freeze what is on stage into an overlay and fade it away: a cross-fade to whatever is drawn next. */
  function ghostFrom(ms: number) {
    if (ghost.width !== renderer.w || ghost.height !== renderer.h) { ghost.width = renderer.w; ghost.height = renderer.h; }
    gctx.drawImage(renderer.canvas, 0, 0);
    ghost.style.transition = 'none';
    ghost.style.opacity = '1';
    void ghost.offsetWidth;
    ghost.style.transition = `opacity ${ms}ms linear`;
    ghost.style.opacity = '0';
  }

  // A frozen scene is never quite still: a slow push while resting, let go as time resumes.
  function updatePush(dt: number) {
    const held = mode === 'film' && (!moving() || legs[legFor(travel)].kind === 'exit') && p >= 1;
    push = damp(push, held ? 1 : 0, held ? 7 : 0.22, dt);
    media.style.transform = push > 0.002 ? `scale(${(1 + 0.028 * push).toFixed(4)})` : '';
  }

  // The sharper still fades in once a freeze has been held for a moment ("focus settle").
  let hdWorld = -1, hdLoaded = -1;
  function updateHD(now: number) {
    // Held through the exit leg too, in both directions: it is the same frozen picture behind the knock-out.
    const still = mode === 'film' && !dipping && !narrow && p >= 1 && (!moving() || p >= WORLD_COUNT);
    if (!still) { if (hd.dataset.on === 'true') hd.dataset.on = 'false'; return; }
    if (now - restSince < 260) return;
    const world = worldAtStop(Math.round(p));
    if (hdWorld !== world) {
      // An <img> keeps painting its OLD picture until the new one has arrived, so the overlay must stay
      // hidden until decode() confirms the element is really showing this world.
      const w = (hdWorld = world);
      hdLoaded = -1;
      hd.dataset.on = 'false';
      hd.src = `${BASE}/rest/${worlds[w].id}-hd.webp`;
      (hd.decode ? hd.decode() : Promise.resolve()).then(() => { if (hdWorld === w) hdLoaded = w; }).catch(() => { /* stays on the canvas frame */ });
      return;
    }
    if (hdLoaded === world && hd.dataset.on !== 'true') {
      hd.style.objectPosition = renderer.objectPosition(1920, 1080, focusFull());
      hd.dataset.on = 'true';
    }
  }

  // ── loading policy ──────────────────────────────────────────────────────────────────────
  function feed() {
    const onProg = () => { dirty = true; report(); };
    const load = (i: number, order: 'fwd' | 'rev', n: number) => { if (i >= 0 && i < seqs.length) seqs[i].load(order, n, onProg); };
    const dir: Dir = moving() ? (target > p ? 1 : -1) : travel;
    const base = moving() ? (dir > 0 ? Math.floor(p + 1e-9) : Math.ceil(p - 1e-9)) : p; // the stop being left / rested on
    if (dir > 0 || !moving()) {
      load(base, 'fwd', 6);
      // …and the one after it, as soon as we are moving or the nearer one is half in hand.
      if (moving() || base >= seqs.length || seqs[base].progress > 0.5) load(base + 1, 'fwd', 4);
    }
    if (dir < 0 || !moving()) {
      const k = Math.min(base - 1, seqs.length - 1);
      load(k, 'rev', 6);
      if (moving()) load(k - 1, 'rev', 4);
    }
    if (env.smallScreen) seqs.forEach((s, i) => { if (s.started && Math.abs(i - (p - 0.5)) > 2.6) s.release(); });
  }

  // ── DIP ─────────────────────────────────────────────────────────────────────────────────
  function settleAt(stop: number, now = performance.now()) {
    p = target = stop; vel = 0; starvedSince = 0; restSince = now;
    lastDrawKey = ''; dirty = true;
    if (stop === 0) { mode = 'idle'; video.playbackRate = 1; spinT0 = 0; playLoop(); drawVideo(); mask.draw(0); }
    else { mode = 'film'; video.pause(); renderFilm(); }
  }
  function dipTo(stop: number) {
    if (dipping) return;
    dipping = true;
    dip.dataset.on = 'true';
    hd.dataset.on = 'false';
    setTimeout(() => {
      settleAt(stop);
      requestAnimationFrame(() => { dip.dataset.on = 'false'; dipping = false; });
    }, 210);
  }

  // ── IDLE ⇄ FILM ─────────────────────────────────────────────────────────────────────────
  function playLoop() {
    if (!inView || document.hidden || mode !== 'idle') return;
    video.play().catch(() => { /* autoplay refused: the poster stays, the film still works */ });
  }
  /** Leave the overview: the blurred spin takes over from whatever loop frame is showing. */
  function leaveIdle(): boolean {
    const s = seqs[0], r = s.range();
    if (!r.full && r.lo < Math.min(s.length, MIN_ENTRY_FRAMES)) return false; // keep the loop alive until there is film in hand
    ghostFrom(HANDOFF_MS);
    video.pause();
    video.playbackRate = 1;
    mode = 'film';
    lastDrawKey = '';
    return true;
  }
  /** Back out to the overview: the loop picks the spin up at speed and eases down to its idle pace. */
  function arriveIdle(now: number) {
    ghostFrom(SPIN_DOWN.fade);
    mode = 'idle';
    spinT0 = now;
    try { video.playbackRate = SPIN_DOWN.rate; } catch { spinT0 = 0; }
    playLoop();
    drawVideo();
  }
  function spinDown(now: number) {
    if (!spinT0) return;
    const t = clamp((now - spinT0) / 1000 / SPIN_DOWN.seconds);
    const rate = 1 + (SPIN_DOWN.rate - 1) * Math.pow(1 - t, 3);
    try { video.playbackRate = t >= 1 ? 1 : Math.round(rate * 20) / 20; } catch { /* rate control unavailable: plain 1× */ }
    if (t >= 1) spinT0 = 0;
  }

  // ── the playhead ────────────────────────────────────────────────────────────────────────
  function advance(dt: number, now: number) {
    const dir: Dir = target > p ? 1 : -1;
    travel = dir;
    if (mode === 'idle') {
      if (!leaveIdle()) { starve(now); return; }
      vel = 0;
    }
    const leg = legFor(dir);
    const end = dir > 0 ? leg + 1 : leg;
    const pending = Math.min(MAX_PENDING, Math.abs(target - end));
    const want = dir * (1 + BOOST * pending);
    // From rest, time simply resumes at full speed. A queue builds speed gently; a change of mind eases through zero.
    if (vel === 0) vel = dir;
    else vel = damp(vel, want, Math.sign(vel) !== dir ? 0.13 : Math.abs(want) > Math.abs(vel) ? 0.3 : 0.55, dt);

    let np = clamp(p + (vel * dt) / legs[leg].seconds, leg, leg + 1);

    // Never enter frames that have not arrived: hold at the edge of what is loaded, in the direction of travel.
    const seq = legs[leg].seq >= 0 ? seqs[legs[leg].seq] : null;
    let starved = false;
    if (seq && !seq.range().full) {
      const r = seq.range(), n = seq.length;
      if (dir > 0) { const lim = leg + (r.lo > 0 ? (r.lo - 1) / (n - 1) : 0); if (np > lim) { np = Math.max(Math.min(p, np), lim); starved = true; } }
      else { const lim = leg + (r.hi > 0 ? (n - r.hi) / (n - 1) : 1); if (np < lim) { np = Math.min(Math.max(p, np), lim); starved = true; } }
    }
    if (starved) { p = np; starve(now); return; }
    starvedSince = 0;

    if (dir > 0 ? np >= end : np <= end) {
      p = end;
      if (p === target) { vel = 0; restSince = now; if (p === 0) arriveIdle(now); }
    } else p = np;
  }
  function starve(now: number) {
    if (!starvedSince) starvedSince = now;
    else if (now - starvedSince > STARVE_MS) dipTo(target);
  }

  // ── input ───────────────────────────────────────────────────────────────────────────────
  const menuOpen = () => !!document.querySelector('[data-menu][data-open="true"]');
  const introUp = () => document.documentElement.dataset.intro === 'on';
  bindInput({
    claims(dir) {
      if (scrollY > 1 || menuOpen() || introUp()) return false;
      if (moving() || dipping) return true; // mid-film, everything is ours
      if (p === TITLE_STOP && dir > 0) return false; // the title card: the page takes over
      if (p === 0 && dir < 0) return false; // nothing above the overview
      return true;
    },
    step(dir) {
      if (dipping) return;
      const next = clamp(target + dir, 0, TITLE_STOP);
      if (next === target) return;
      if (moving()) {
        // Keep the queue short: a free-spinning wheel must not be able to skip the whole film.
        const d: Dir = next > p ? 1 : -1;
        const leg = legFor(d), end = d > 0 ? leg + 1 : leg;
        if (Math.abs(next - end) > MAX_PENDING) return;
      }
      target = next;
    },
    rewind() { if (p !== 0 || moving()) dipTo(0); },
  }, root);

  // Anything else that moves the page (skip link, End, focus, anchors) ends the film on its title card.
  addEventListener('scroll', () => {
    if (scrollY > 1 && (p !== TITLE_STOP || moving()) && !dipping) {
      if (root.getBoundingClientRect().bottom > innerHeight * 0.35) dipTo(TITLE_STOP); else settleAt(TITLE_STOP);
    }
  }, { passive: true });

  // ── frame loop ──────────────────────────────────────────────────────────────────────────
  const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  let lastNow = 0;
  const tick = (_dt: number, now: number) => {
    // The film keeps WALL-CLOCK time: on a slow device it drops frames rather than playing in slow motion.
    // (The shared ticker clamps dt to 50 ms; only a real stall — a background tab — is clamped here.)
    const dt = Math.min(0.25, lastNow ? (now - lastNow) / 1000 : 0.016);
    lastNow = now;
    if (!dipping && moving()) advance(dt, now);

    if (mode === 'idle') {
      spinDown(now);
      if (!hasRVFC && !video.paused) drawVideo();
      else if (dirty && video.paused) drawVideo();
      mask.draw(0);
    } else if (!dipping) renderFilm();

    feed();
    updatePush(dt);
    updateHD(now);

    const dir = target >= p ? 1 : -1;
    const local = p - Math.floor(p);
    const arrival = !moving() ? 1 : local === 0 ? 0 : dir > 0 ? local : 1 - local;
    ui.update({ p, target, world: HeroUI.worldFor(p), arrival });

    dirty = false;
    // Observable state for QA and styling hooks.
    const tag = dipping ? 'dip' : mode;
    if (root.dataset.mode !== tag) root.dataset.mode = tag;
    const at = moving() ? '' : String(p);
    if (root.dataset.stop !== at) root.dataset.stop = at;
  };

  // The video drives its own draws so we paint exactly once per decoded frame.
  const rvfc = (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback?.bind(video);
  const onVideoFrame = () => { if (mode === 'idle' && !dipping) drawVideo(); rvfc?.(onVideoFrame); };
  rvfc?.(onVideoFrame);

  // ── lifecycle ───────────────────────────────────────────────────────────────────────────
  let off: (() => void) | null = null;
  const wake = () => { if (!off) off = onTick(tick); playLoop(); };
  const sleep = () => { off?.(); off = null; lastNow = 0; video.pause(); };

  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView && !document.hidden) wake(); else sleep(); }, { rootMargin: '10% 0px' }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); else if (inView) wake(); });
  addEventListener('pageshow', (e) => { if (e.persisted) { lastDrawKey = ''; dirty = true; if (inView) wake(); } });

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const wasNarrow = narrow;
      narrow = innerWidth / innerHeight < NARROW;
      renderer.resize(); mask.resize();
      ui.setTitleY(mask.restBottomCss() + stage.offsetHeight * 0.05);
      hdWorld = -1; hdLoaded = -1; hd.dataset.on = 'false';
      if (narrow !== wasNarrow) { makeMedia(); settleAt(target); } // a different frame set: finish the move on its still
      lastDrawKey = ''; dirty = true;
      if (mode === 'film') renderFilm(); else drawVideo();
    }, 140);
  }, { passive: true });

  // ── boot ────────────────────────────────────────────────────────────────────────────────
  renderer.resize(); mask.resize(); makeMedia();
  ui.setTitleY(mask.restBottomCss() + stage.offsetHeight * 0.05);

  const small = narrow || Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) < 1100;
  const ready = () => { root.dataset.ready = 'true'; };

  // Refreshed part-way down the page: the film is over, its title card is what sits above the content.
  // (?stop=N is a QA switch: boot straight onto a stop.)
  const qaStop = params.has('stop') ? clamp(Math.round(Number(params.get('stop')) || 0), 0, TITLE_STOP) : -1;
  const bootStop = qaStop >= 0 ? qaStop : scrollY > 1 ? TITLE_STOP : 0;
  heroLoad.active = bootStop === 0;

  loadImage(`${BASE}/poster-${small ? 960 : 1440}.webp`, 'high')
    .then((img) => { poster = img; if (mode === 'idle') drawVideo(); if (bootStop === 0) ready(); })
    .catch(() => { if (bootStop === 0) ready(); })
    .finally(() => { part.poster = 1; report(); });

  if (bootStop > 0) {
    const w = worldAtStop(bootStop);
    const show = () => { settleAt(bootStop); ready(); };
    loadImage(`${BASE}/rest/${worlds[w].id}${narrow ? '-m' : ''}.webp`, 'high').then((img) => { rests[w] = img; show(); }).catch(show);
    p = target = bootStop; mode = 'film';
  }

  // The loop is fetched whole: real byte progress for the intro, and a fully buffered, seamless loop afterwards.
  const loopUrl = `${BASE}/loop-${small ? 960 : 1440}.mp4`;
  const useDirect = () => { video.src = loopUrl; video.preload = 'auto'; video.addEventListener('canplaythrough', () => { part.video = 1; report(); }, { once: true }); video.addEventListener('error', () => { part.video = 1; report(); }, { once: true }); };
  video.addEventListener('loadeddata', () => { dirty = true; if (mode === 'idle') { drawVideo(); playLoop(); } }, { once: true });
  (async () => {
    try {
      const res = await fetch(loopUrl);
      if (!res.ok || !res.body) throw new Error('no body');
      const total = Number(res.headers.get('content-length')) || (small ? 2.9e6 : 5.1e6);
      const reader = res.body.getReader();
      const chunks: BlobPart[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.byteLength;
        part.video = Math.min(0.99, got / total); report();
      }
      video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
      part.video = 1; report();
    } catch { useDirect(); }
  })();

  wake();
  // Safety: never leave the opening cover up if something above stalls.
  setTimeout(ready, 2500);
}
