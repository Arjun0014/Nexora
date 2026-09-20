/**
 * Hero state machine. See docs/implementation/04-HERO-IMPLEMENTATION.md.
 *
 *   IDLE    the loop video plays and is drawn into the canvas
 *   SETTLE  the user has started to scroll: the loop runs fast, then eases into its seam pose (the
 *           pose the entry clip starts from). Time-based, bounded.
 *   SCRUB   native scroll → target playhead; a damped display playhead chases it; frames are drawn
 *   DIP     safety net: fade through the divider-wall bronze to a rest still (jumps, refresh, starvation)
 *
 * Invariants: the canvas is never blank; the playhead never enters frames that are not loaded; the
 * film is never left between two states (auto-settle finishes any abandoned transition).
 */
import manifest from '../../data/media-manifest.json';
import { worlds } from '../../data/worlds';
import { $, $$, clamp, env, invLerp, lerp, smoothstep } from '../core/env';
import { onTick, damp } from '../core/ticker';
import { buildTimeline, locate, type Timeline } from './timeline';
import { Sequence, loadImage } from './loader';
import { Renderer } from './renderer';
import { TitleMask } from './mask';
import { HeroUI } from './ui';

const BASE = '/media/hero';
const NARROW = 0.8; // below this aspect the portrait-cropped frame set is used
const FOLLOW_TAU = 0.11;
const DIP_GAP = 1.6; // playhead gap (in u) beyond which we cut instead of fast-forwarding
const IDLE_BEFORE_SETTLE = 160; // ms without scroll before an abandoned transition is completed

type Mode = 'idle' | 'settle' | 'scrub';

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
  const pauseBtn = $<HTMLButtonElement>('[data-pause]', root);
  const renderer = new Renderer($<HTMLCanvasElement>('[data-canvas]', root)!);
  const mask = new TitleMask($<HTMLCanvasElement>('[data-mask]', root)!);

  let layoutPortrait = env.portrait;
  let narrow = innerWidth / innerHeight < NARROW;
  let tl: Timeline = buildTimeline(layoutPortrait);
  const ui = new HeroUI(root, tl);

  let seqs: Sequence[] = [];
  let rests: (HTMLImageElement | null)[] = [];
  let poster: HTMLImageElement | null = null;
  const makeMedia = () => {
    seqs.forEach((s) => s.release());
    seqs = manifest.sequences.map((spec) => new Sequence(spec, narrow, BASE));
    rests = worlds.map(() => null);
    worlds.forEach((w, i) => loadImage(`${BASE}/rest/${w.id}${narrow ? '-m' : ''}.webp`, 'low').then((img) => { rests[i] = img; dirty = true; }).catch(() => {}));
  };

  // ── geometry ────────────────────────────────────────────────────────────────────────────
  let top = 0, scrollable = 1;
  const measure = () => {
    top = root.getBoundingClientRect().top + scrollY;
    scrollable = Math.max(1, root.offsetHeight - stage.offsetHeight);
  };
  const targetU = () => clamp((scrollY - top) / scrollable) * tl.total;
  const yFor = (u: number) => top + (u / tl.total) * scrollable;
  const focusFull = () => lerp(0.72, 0.5, invLerp(NARROW, 1.6, renderer.cssW / renderer.cssH));

  // ── state ───────────────────────────────────────────────────────────────────────────────
  let mode: Mode = 'idle';
  let disp = 0; // display playhead (u)
  let dirty = true;
  let lastDrawKey = '';
  let videoReady = false;
  let userPaused = false;
  let inView = true;
  let dipping = false;
  let forceDip = false;
  let starvedSince = 0;
  let settleT0 = 0, settleRem0 = 0, settleDur = 0;

  // ── drawing ─────────────────────────────────────────────────────────────────────────────
  function drawVideo() {
    if (video.readyState >= 2 && video.videoWidth) renderer.draw(video, video.videoWidth, video.videoHeight, 0, 0.5);
    else if (poster) renderer.draw(poster, poster.naturalWidth, poster.naturalHeight, 0, 0.5);
  }

  function nearestFrame(s: Sequence, idx: number): HTMLImageElement | null {
    for (let d = 0; d < s.length; d++) {
      const a = s.frame(idx - d); if (a) return a;
      const b = s.frame(idx + d); if (b) return b;
    }
    return null;
  }

  function renderAt(u: number) {
    const { seg, local } = locate(tl, u);
    let img: HTMLImageElement | null = null;
    let e = 1, focus = narrow ? 0.5 : focusFull(), key = '';

    if (seg.kind === 'overview') {
      // Only reached in SCRUB while returning to the top: hold the seam pose (entry frame 0 ≈ poster).
      img = seqs[0].frame(0) ?? poster; e = 0; key = 'o';
      if (narrow) focus = 0.72;
    } else if (seg.kind === 'seq') {
      const s = seqs[seg.seq];
      const idx = Math.round(local * (s.length - 1));
      img = s.frame(idx) ?? nearestFrame(s, idx);
      if (seg.seq === 0) { e = smoothstep(0.04, 0.42, local); if (narrow) focus = 0.72; }
      key = `s${seg.seq}:${idx}:${e.toFixed(3)}`;
      s.warm(idx, 1); s.warm(idx, -1, 3);
    } else {
      const s = seqs[seg.world];
      img = rests[seg.world] ?? s.frame(s.length - 1);
      key = `r${seg.world}:${img ? 1 : 0}`;
    }

    // Slow push while resting, released over the first frames of the next move (continuous both ways).
    let k = 0;
    if (seg.kind === 'rest') k = local;
    else if (seg.kind === 'seq' && seg.seq > 0) k = 1 - smoothstep(0, 0.18, local);
    else if (seg.kind === 'exit' || seg.kind === 'title') k = 1;
    media.style.transform = k > 0.001 ? `scale(${(1 + 0.025 * k).toFixed(4)})` : '';

    if (seg.kind === 'exit') mask.draw(local);
    else mask.draw(seg.kind === 'title' ? 1 : 0);

    if (!img) return; // nothing new to show: the previous frame stays on the canvas
    key += `|${renderer.w}x${renderer.h}`;
    if (key === lastDrawKey) return;
    lastDrawKey = key;
    renderer.draw(img, img.naturalWidth, img.naturalHeight, e, focus);
  }

  // The sharper still fades in once a freeze has been held for a moment ("focus settle").
  // The picture is static for the whole rest (and through the exit), so once shown it stays until time resumes.
  let hdWorld = -1, hdLoaded = -1, restSince = 0;
  function updateHD(now: number) {
    const { seg } = locate(tl, disp);
    const resting = mode === 'scrub' && !dipping && !narrow && (seg.kind === 'rest' || seg.kind === 'exit' || seg.kind === 'title');
    if (!resting) { restSince = 0; if (hd.dataset.on === 'true') hd.dataset.on = 'false'; return; }
    if (!restSince) restSince = now;
    if (now - restSince < 260) return;
    if (hdWorld !== seg.world) {
      // An <img> keeps painting its OLD picture until the new one has arrived, so the overlay must stay
      // hidden until decode() confirms the element is really showing this world.
      const w = (hdWorld = seg.world);
      hdLoaded = -1;
      hd.dataset.on = 'false';
      hd.src = `${BASE}/rest/${worlds[w].id}-hd.webp`;
      (hd.decode ? hd.decode() : Promise.resolve()).then(() => { if (hdWorld === w) hdLoaded = w; }).catch(() => { /* stays on the canvas frame */ });
      return;
    }
    if (hdLoaded === seg.world && hd.dataset.on !== 'true') {
      hd.style.objectPosition = renderer.objectPosition(1920, 1080, focusFull());
      hd.dataset.on = 'true';
    }
  }

  // ── loading policy ──────────────────────────────────────────────────────────────────────
  function feed(u: number, dir: number) {
    const { seg } = locate(tl, u);
    const w = seg.kind === 'overview' ? -1 : seg.kind === 'seq' ? seg.seq - 1 : seg.world;
    const onProg = () => { dirty = true; };
    // The sequence we are in, or about to enter, in the direction of travel…
    if (seg.kind === 'seq') seqs[seg.seq].load(dir < 0 && !seqs[seg.seq].started ? 'rev' : 'fwd', 6, onProg);
    const next = w + 1;
    if (next < seqs.length) seqs[next].load('fwd', 6, onProg);
    // …and one further ahead once the nearer one is half done.
    if (next + 1 < seqs.length && seqs[next].progress > 0.5) seqs[next + 1].load('fwd', 4, onProg);
    if (dir < 0 && w >= 0 && !seqs[w].started) seqs[w].load('rev', 6, onProg);
    if (env.smallScreen) seqs.forEach((s, i) => { if (s.started && Math.abs(i - (w + 0.5)) > 2.6) s.release(); });
  }

  /** Clamp a goal so the playhead never moves into frames that have not arrived. */
  function gate(goal: number, now: number): number {
    const dir = Math.sign(goal - disp) || 1;
    const from = locate(tl, disp).index, to = locate(tl, goal).index;
    let limited = goal, starved = false;
    for (let i = from; dir > 0 ? i <= to : i >= to; i += dir) {
      const seg = tl.segs[i];
      if (seg.kind !== 'seq') continue;
      const s = seqs[seg.seq];
      const r = s.range();
      if (r.full) continue;
      const n = s.length, len = seg.end - seg.start;
      if (dir > 0) {
        const lim = r.lo > 0 ? seg.start + ((r.lo - 1) / (n - 1)) * len : seg.start;
        if (goal > lim) { limited = Math.max(lim, Math.min(disp, goal)); starved = true; break; }
      } else {
        const lim = r.hi > 0 ? seg.start + ((n - r.hi) / (n - 1)) * len : seg.end;
        if (goal < lim) { limited = Math.min(lim, Math.max(disp, goal)); starved = true; break; }
      }
    }
    if (!starved) starvedSince = 0;
    else if (!starvedSince) starvedSince = now;
    return limited;
  }

  // ── DIP ─────────────────────────────────────────────────────────────────────────────────
  function dipTo(getU: () => number) {
    if (dipping) return;
    dipping = true;
    dip.dataset.on = 'true';
    hd.dataset.on = 'false';
    setTimeout(() => {
      let u = getU();
      // Land on something we can certainly draw: a rest still, never a half-loaded sequence.
      const loc = locate(tl, u);
      if (loc.seg.kind === 'seq' && !seqs[loc.seg.seq].range().full) u = loc.local > 0.5 ? loc.seg.end : loc.seg.start;
      if (u < tl.entryStart) { backToIdle(); }
      else { if (mode !== 'scrub') enterScrub(); disp = u; }
      lastDrawKey = ''; dirty = true;
      if (mode === 'scrub') renderAt(disp); else drawVideo();
      requestAnimationFrame(() => { dip.dataset.on = 'false'; dipping = false; starvedSince = 0; });
    }, 210);
  }

  // ── IDLE ⇄ SETTLE ⇄ SCRUB ───────────────────────────────────────────────────────────────
  function playLoop() {
    if (userPaused || !inView || document.hidden) return;
    video.play().then(() => { videoReady = true; }).catch(() => { /* autoplay refused: the poster stays, the film still works */ });
  }
  function backToIdle() {
    mode = 'idle'; disp = 0;
    video.loop = true; video.playbackRate = 1;
    try { video.currentTime = 0; } catch { /* not seekable yet */ }
    playLoop();
    lastDrawKey = '';
  }
  function enterScrub() {
    mode = 'scrub';
    video.pause();
    video.playbackRate = 1;
    disp = tl.entryStart;
    lastDrawKey = '';
  }
  function beginSettle(now: number) {
    const playing = videoReady && !video.paused && video.readyState >= 2 && isFinite(video.duration);
    const rem = playing ? video.duration - video.currentTime : 0;
    if (!playing || rem < 0.06) { enterScrub(); return; }
    mode = 'settle';
    video.loop = false;
    settleT0 = now; settleRem0 = rem;
    settleDur = clamp(0.28 + rem * 0.06, 0.32, 1.1);
  }
  video.addEventListener('ended', () => { if (mode === 'settle') enterScrub(); });

  function runSettle(now: number, t: number) {
    if (t < tl.entryStart) { video.loop = true; video.playbackRate = 1; mode = 'idle'; return; }
    const tau = (now - settleT0) / 1000 / settleDur;
    if (now - settleT0 > 1600 || video.paused) { enterScrub(); return; }
    // Ease-out: fast first, decelerating into the seam. Rate is capped by what browsers allow.
    const want = tau < 1 ? (3 * (1 - tau) * (1 - tau) * settleRem0) / settleDur : 2;
    try { video.playbackRate = clamp(want, 1, 16); } catch { enterScrub(); }
  }

  // ── auto-settle: never leave the film between two states ────────────────────────────────
  let lastScrollAt = performance.now(), lastY = scrollY, lastDir = 1, touching = false;
  let anim: { from: number; to: number; t0: number; dur: number } | null = null;
  let selfScroll = false;
  const cancelAnim = () => { anim = null; };

  addEventListener('scroll', () => {
    dirty = true;
    if (selfScroll) { selfScroll = false; return; }
    const y = scrollY;
    if (y !== lastY) lastDir = y > lastY ? 1 : -1;
    lastY = y; lastScrollAt = performance.now();
  }, { passive: true });
  addEventListener('wheel', cancelAnim, { passive: true });
  addEventListener('touchstart', () => { touching = true; cancelAnim(); }, { passive: true });
  addEventListener('touchend', () => { touching = false; lastScrollAt = performance.now(); }, { passive: true });
  addEventListener('touchcancel', () => { touching = false; }, { passive: true });
  addEventListener('keydown', cancelAnim);
  addEventListener('pointerdown', cancelAnim, { passive: true });

  function animateTo(u: number, seconds: number) {
    anim = { from: scrollY, to: yFor(u), t0: performance.now(), dur: Math.max(0.2, seconds) * 1000 };
  }
  // QA switch: /?nosettle parks the playhead wherever scroll leaves it, so mid-transition frames can be inspected.
  const noSettle = new URLSearchParams(location.search).has('nosettle');
  function maybeSettle(now: number, t: number) {
    if (noSettle || anim || touching || dipping || mode === 'idle') return;
    if (now - lastScrollAt < IDLE_BEFORE_SETTLE) return;
    const { seg, local } = locate(tl, t);
    if (seg.kind !== 'seq' && seg.kind !== 'exit') return;
    if (seg.kind === 'seq' && !seqs[seg.seq].range().full && starvedSince) return; // wait for frames rather than fight them
    const forward = lastDir >= 0 ? local > 0.12 : local > 0.88;
    const portion = forward ? 1 - local : local;
    const clipSeconds = seg.kind === 'seq' ? manifest.sequences[seg.seq].frames / 24 : 2.2;
    animateTo(forward ? seg.end + 0.015 : seg.start - 0.015, clamp(portion * clipSeconds, 0.35, 3));
  }

  // ── controls ────────────────────────────────────────────────────────────────────────────
  $$<HTMLButtonElement>('[data-jump]', root).forEach((btn) => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.jump);
    const here = locate(tl, disp).seg;
    const adjacentForward = mode === 'scrub' && here.kind === 'rest' && here.world === i - 1 && seqs[i].range().full;
    cancelAnim();
    if (adjacentForward) animateTo(tl.restAt[i], manifest.sequences[i].frames / 24);
    else { forceDip = true; scrollTo(0, yFor(tl.restAt[i])); }
  }));
  $('[data-skip]', root)?.addEventListener('click', () => { forceDip = true; cancelAnim(); });

  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', userPaused ? 'Resume the rotating overview' : 'Pause the rotating overview');
    if (userPaused) video.pause(); else if (mode === 'idle') playLoop();
  });

  // ── frame loop ──────────────────────────────────────────────────────────────────────────
  const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  let lastDisp = -1;
  const tick = (dt: number, now: number) => {
    if (anim) {
      const p = clamp((now - anim.t0) / anim.dur);
      selfScroll = true;
      scrollTo(0, lerp(anim.from, anim.to, p));
      if (p >= 1) { anim = null; lastScrollAt = now; }
    }
    const t = targetU();

    if (mode === 'idle') {
      if (t >= tl.entryStart + 0.004 && !dipping) {
        if (forceDip || t - tl.entryStart > DIP_GAP) { forceDip = false; dipTo(targetU); }
        else beginSettle(now);
      }
      disp = Math.min(t, tl.entryStart);
      if (!hasRVFC && !video.paused) drawVideo();
      else if (dirty && video.paused) drawVideo();
      mask.draw(0);
      media.style.transform = '';
    } else if (mode === 'settle') {
      runSettle(now, t);
      if (!hasRVFC) drawVideo();
    }
    if (mode === 'scrub' && !dipping) {
      const dir = Math.sign(t - disp) || lastDir;
      feed(disp, dir);
      const goal = gate(t, now);
      if (forceDip || Math.abs(t - disp) > DIP_GAP) { forceDip = false; dipTo(targetU); }
      else if (starvedSince && now - starvedSince > 1100 && locate(tl, t).seg.kind !== 'seq') dipTo(targetU);
      else {
        disp = damp(disp, goal, FOLLOW_TAU, dt);
        if (Math.abs(goal - disp) < 0.0004) disp = goal;
        if (disp <= tl.entryStart + 0.0006 && t < tl.entryStart) backToIdle();
        else renderAt(disp);
      }
    } else if (mode !== 'scrub') feed(0, 1);

    const moving = Math.abs(disp - lastDisp) > 0.00015;
    lastDisp = disp;
    updateHD(now);

    // Timecode: footage frames elapsed up to the display playhead.
    const loc = locate(tl, disp);
    let frames = 0;
    for (let i = 0; i < manifest.sequences.length; i++) {
      if (loc.seg.kind === 'seq' && loc.seg.seq === i) { frames += loc.local * (manifest.sequences[i].frames - 1); break; }
      if (loc.seg.kind !== 'overview' && (loc.seg.kind === 'seq' ? loc.seg.seq > i : loc.seg.world >= i)) frames += manifest.sequences[i].frames;
    }
    ui.update({ u: mode === 'settle' ? t : disp, seg: loc.seg, local: loc.local, moving: moving || mode === 'settle', frames, idle: mode !== 'scrub' && !video.paused, leaving: mode === 'settle' });

    maybeSettle(now, t);
    dirty = false;
    // Observable state for QA and styling hooks.
    const tag = dipping ? 'dip' : anim ? `${mode}+auto` : mode;
    if (root.dataset.mode !== tag) root.dataset.mode = tag;
  };

  // The video drives its own draws so we paint exactly once per decoded frame.
  const rvfc = (video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback?.bind(video);
  const onVideoFrame = () => { if (mode !== 'scrub' && !dipping) drawVideo(); rvfc?.(onVideoFrame); };
  rvfc?.(onVideoFrame);

  // ── lifecycle ───────────────────────────────────────────────────────────────────────────
  let off: (() => void) | null = null;
  const wake = () => { if (!off) off = onTick(tick); if (mode === 'idle') playLoop(); };
  const sleep = () => { off?.(); off = null; video.pause(); };

  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView && !document.hidden) wake(); else sleep(); }, { rootMargin: '25% 0px' }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); else if (inView) wake(); });
  addEventListener('pageshow', (e) => { if (e.persisted) { measure(); lastDrawKey = ''; dirty = true; if (inView) wake(); } });

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const world = locate(tl, disp);
      const wasPortrait = layoutPortrait, wasNarrow = narrow;
      layoutPortrait = env.portrait; narrow = innerWidth / innerHeight < NARROW;
      if (layoutPortrait !== wasPortrait) { tl = buildTimeline(layoutPortrait); ui.setTimeline(tl); }
      renderer.resize(); mask.resize(); measure();
      ui.setTitleY(mask.restBottomCss() + stage.offsetHeight * 0.05);
      hdWorld = -1; hdLoaded = -1; hd.dataset.on = 'false';
      if (narrow !== wasNarrow) { makeMedia(); forceDip = true; }
      // Keep the visitor in the same place in the story when the timeline length changes.
      if (layoutPortrait !== wasPortrait && mode === 'scrub') {
        const seg = tl.segs[world.index];
        selfScroll = true; scrollTo(0, yFor(seg.start + world.local * (seg.end - seg.start)));
      }
      lastDrawKey = ''; dirty = true;
      if (mode === 'scrub') renderAt(disp); else drawVideo();
    }, 140);
  }, { passive: true });

  // ── boot ────────────────────────────────────────────────────────────────────────────────
  renderer.resize(); mask.resize(); measure(); makeMedia();
  ui.setTitleY(mask.restBottomCss() + stage.offsetHeight * 0.05);

  const small = narrow || Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) < 1100;
  const ready = () => { root.dataset.ready = 'true'; };

  loadImage(`${BASE}/poster-${small ? 960 : 1440}.webp`, 'high').then((img) => {
    poster = img;
    if (mode !== 'scrub') drawVideo();
    if (targetU() < tl.entryStart) ready();
  }).catch(ready);

  const startU = targetU();
  if (startU >= tl.entryStart) {
    // Refreshed or deep-linked part-way through the film: show that world's rest still, then load around it.
    mode = 'scrub';
    const loc = locate(tl, startU);
    disp = loc.seg.kind === 'seq' ? (loc.local > 0.5 ? loc.seg.end : loc.seg.start) : startU;
    if (disp < tl.entryStart + 0.001) { mode = 'idle'; disp = 0; }
    const w = Math.max(0, locate(tl, disp).seg.world);
    const show = () => { lastDrawKey = ''; renderAt(disp); ready(); };
    loadImage(`${BASE}/rest/${worlds[w].id}${narrow ? '-m' : ''}.webp`, 'high').then((img) => { rests[w] = img; show(); }).catch(show);
  }

  video.src = `${BASE}/loop-${small ? 960 : 1440}.mp4`;
  video.preload = 'auto';
  video.addEventListener('loadeddata', () => { dirty = true; if (mode !== 'scrub') drawVideo(); }, { once: true });
  wake();
  // Safety: never leave the opening cover up if something above stalls.
  setTimeout(ready, 2500);
}
