/**
 * Hero state machine — gesture-stepped, time-played, drawn live. See docs/redesign/09-HERO-V9.md (07 for the turn).
 *
 * The film is drawn live (./court): a limestone court under a latticed dome that turns about its pool, five doorways
 * onto five films of work, always playing. Its assets (the five films whole) load and its shaders compile while the
 * intro is up (the intro waits for all of it), and every frame is a pure function of the playhead `p` (plus the
 * pointer, the clock on the first screen, and the films' own frames).
 *
 * The court is a ring: the film goes into whichever doorway faces you when you step in — or the one you name in the
 * ring of names — and on round the ring from there (./timeline.ts `ring`).
 *
 * One gesture = one leg at natural speed. Gestures that arrive while a leg is playing move `target` on (a short
 * queue); queued legs play faster; a change of mind eases through zero and plays the leg backwards. After the
 * title card (the last stop) the page scrolls natively; scrolling back to the top re-enters there.
 *
 * Invariant: the film only ever rests on a stop (integer p), so it cannot be left between two states.
 */
import { overview, worlds } from '../../data/worlds';
import { $, $$, clamp, env } from '../core/env';
import { onTick, damp } from '../core/ticker';
import { buildLegs, ring, TITLE_STOP, LEG_COUNT, WORLD_COUNT } from './timeline';
import { TitleMask } from './mask';
import { HeroUI } from './ui';
import { bindInput, type Dir } from './input';
import { loadFilms, filmSize, filmHost } from './films';
import type { World, Quality } from './court';

const MAX_PENDING = 2; // stops that may be queued beyond the leg being played
const BOOST = 0.85; // extra playback speed per queued stop

/**
 * Read by the intro so its progress is the hero's real loading progress; it does not end before `done` (everything
 * loaded, built and compiled). `abandoned`: the intro gave up waiting (something hung), so a late world is let go.
 */
export const heroLoad = { active: false, progress: 0, done: false, abandoned: false };

function pickQuality(): Quality {
  const forced = new URLSearchParams(location.search).get('q');
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced;
  const small = Math.min(screen.width, screen.height) < 760;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (small || coarse) return cores >= 6 && mem >= 4 ? 'medium' : 'low';
  return cores >= 4 ? 'high' : 'medium';
}

function webgl2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

export function initHero() {
  const root = $('[data-hero]');
  if (!root) return;

  // A change of motion preference changes the page's whole layout mode; reload into the right one.
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => location.reload());
  if (!env.cinema) return;
  if (!webgl2()) {
    // No real-time 3D here: the page falls back to its static reading of every scene.
    document.documentElement.classList.remove('cinema');
    return;
  }

  const stage = $('[data-stage]', root)!;
  const canvas = $<HTMLCanvasElement>('[data-canvas]', root)!;
  const mask = new TitleMask($<HTMLCanvasElement>('[data-mask]', root)!);
  const ui = new HeroUI(root);
  const legs = buildLegs();
  const params = new URLSearchParams(location.search);

  // ── state ───────────────────────────────────────────────────────────────────────────────
  let world: World | null = null;
  let p = 0; // playhead, in stops
  let target = 0; // the stop the film is heading for
  let vel = 0; // signed playback speed, 1 = natural
  const pointer = { x: 0, y: 0, active: false };

  const moving = () => p !== target;
  /** The leg under the playhead when travelling in `dir`. */
  const legFor = (dir: Dir) => clamp(dir > 0 ? Math.floor(p + 1e-9) : Math.ceil(p - 1e-9) - 1, 0, LEG_COUNT - 1);

  // ── the playhead ────────────────────────────────────────────────────────────────────────
  function advance(dt: number) {
    const dir: Dir = target > p ? 1 : -1;
    const leg = legFor(dir);
    const end = dir > 0 ? leg + 1 : leg;
    const pending = Math.min(MAX_PENDING, Math.abs(target - end));
    const want = dir * (1 + BOOST * pending);
    // From rest, time simply resumes at full speed. A queue builds speed gently; a change of mind eases through zero.
    if (vel === 0) vel = dir;
    else vel = damp(vel, want, Math.sign(vel) !== dir ? 0.13 : Math.abs(want) > Math.abs(vel) ? 0.3 : 0.55, dt);
    const np = clamp(p + (vel * dt) / legs[leg].seconds, leg, leg + 1);
    if (dir > 0 ? np >= end : np <= end) {
      p = end;
      if (p === target) vel = 0;
    } else p = np;
  }

  const settleAt = (stop: number) => { p = target = stop; vel = 0; };

  // ── input ───────────────────────────────────────────────────────────────────────────────
  const menuOpen = () => !!document.querySelector('[data-menu][data-open="true"]');
  const introUp = () => document.documentElement.dataset.intro === 'on';
  bindInput({
    claims(dir) {
      if (scrollY > 1 || menuOpen() || introUp() || !world) return false;
      if (moving()) return true; // mid-film, everything is ours
      if (p === TITLE_STOP && dir > 0) return false; // the title card: the page takes over
      if (p === 0 && dir < 0) return false; // nothing above the ring
      return true;
    },
    step(dir) {
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
    rewind() { if (p !== 0 || moving()) target = 0; },
  }, root);

  // Anything else that moves the page (skip link, End, focus, anchors) ends the film on its title card.
  addEventListener('scroll', () => { if (scrollY > 1 && (p !== TITLE_STOP || moving())) settleAt(TITLE_STOP); }, { passive: true });

  // The ring of names: each takes you to its doorway. From the first screen, the film goes into that doorway rather
  // than the one facing you; on the way round, it plays on (or back) to it.
  $$<HTMLButtonElement>('[data-ring-item]', root).forEach((a) => {
    const k = Number(a.dataset.ringItem);
    a.addEventListener('click', () => {
      if (!world || introUp() || scrollY > 1) return;
      if (p === 0 && !moving()) { world.aim(k); target = 1; return; }
      target = ((k - ring.start + WORLD_COUNT) % WORLD_COUNT) + 1;
    });
    for (const [on, ev] of [[true, 'pointerenter'], [true, 'focus'], [false, 'pointerleave'], [false, 'blur']] as const) {
      a.addEventListener(ev, () => world?.hover(on ? k : -1));
    }
  });

  // The pointer turns the camera about a frozen moment (fine pointers only).
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = stage.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointer.active = e.clientY >= r.top && e.clientY <= r.bottom;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  }

  // ── frame loop ──────────────────────────────────────────────────────────────────────────
  let lastNow = 0;
  // The court is drawn at most about 60 times a second (every other frame of a 120 Hz screen, so still evenly; 72 on a
  // 144 Hz one): its films change 25 times a second, and a GPU kept busier, frame after frame, starves the decoder they
  // share it with, measured here even while travelling. (?fps=N for QA.)
  const maxFps = Number(params.get('fps') || 60);
  const tick = (_dt: number, now: number) => {
    if (lastNow && now - lastNow < 800 / maxFps) return;
    // The film keeps WALL-CLOCK time: a slow device drops frames rather than playing in slow motion.
    const dt = Math.min(0.1, lastNow ? (now - lastNow) / 1000 : 0.016);
    lastNow = now;
    if (!world) return;
    if (moving()) advance(dt);

    const local = p - Math.floor(p);
    // The NEXORA knock-out closes over the last leg (kept exactly as it was: see ./mask.ts).
    mask.draw(clamp(p - (TITLE_STOP - 1)));
    world.render({ p, moving: moving(), dt, pointer });

    const dir = target >= p ? 1 : -1;
    const arrival = !moving() ? 1 : local === 0 ? 0 : dir > 0 ? local : 1 - local;
    ui.update({ p, target, world: HeroUI.worldFor(p), arrival, ring: world.mark(p) });

    const tag = moving() ? 'film' : 'rest';
    if (root.dataset.mode !== tag) root.dataset.mode = tag;
    const at = moving() ? '' : String(p);
    if (root.dataset.stop !== at) root.dataset.stop = at;
  };

  // ── lifecycle ───────────────────────────────────────────────────────────────────────────
  // The films play whenever the court can be seen (and behind the intro, from the moment the court is ready), and hold
  // when it cannot.
  let off: (() => void) | null = null;
  let inView = true;
  let rolling = false;
  const wake = () => { if (!off) off = onTick(tick); if (rolling) world?.play(); };
  const sleep = () => { off?.(); off = null; lastNow = 0; world?.pause(); };
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView && !document.hidden) wake(); else sleep(); }, { rootMargin: '10% 0px' }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); else if (inView) wake(); });

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      world?.resize(); mask.resize();
      ui.setTitleY(mask.restBottomCss() + stage.offsetHeight * 0.05);
      ui.fit();
    }, 140);
  }, { passive: true });

  // ── boot ────────────────────────────────────────────────────────────────────────────────
  mask.resize();
  ui.setTitleY(mask.restBottomCss() + stage.offsetHeight * 0.05);
  ui.fit();
  document.fonts?.ready.then(() => ui.fit());
  // Refreshed part-way down the page: the film is over, its title card is what sits above the content.
  // (?stop=N is a QA switch: boot straight onto a stop.)
  const qaStop = params.has('stop') ? clamp(Math.round(Number(params.get('stop')) || 0), 0, TITLE_STOP) : -1;
  const bootStop = qaStop >= 0 ? qaStop : scrollY > 1 ? TITLE_STOP : 0;
  settleAt(bootStop);
  heroLoad.active = bootStop === 0;
  canvas.setAttribute('aria-label', overview.alt);

  // The five films start downloading at once, alongside the court's code: they are most of what the hero loads.
  const quality = pickQuality();
  const host = filmHost();
  // progress (for the intro): the films by their bytes, the court's code (three.js), then its world (textures, shaders)
  let filmsF = 0, codeF = 0, worldF = 0;
  const report = () => { heroLoad.progress = Math.max(heroLoad.progress, Math.min(0.995, 0.64 * filmsF + 0.06 * codeF + 0.3 * worldF)); };
  const films = loadFilms(worlds.map((x) => x.id), Number(params.get('fs')) || filmSize(quality), host, (f) => { filmsF = f; report(); });
  import('./court').then(async ({ World }) => {
    codeF = 1; report();
    const w = await World.create(canvas, quality, films, (f) => { worldF = f; report(); });
    if (heroLoad.abandoned) { w.dispose(); return; }
    world = w;
    root.dataset.ready = 'true';
    ui.fit(); // again, now that the world has published where the pool stands
    if (params.has('qa')) (window as unknown as { __hero: unknown }).__hero = { go: (s: number) => { target = clamp(s, 0, TITLE_STOP); }, set: (v: number) => settleAt(v), get p() { return p; }, world };
    // the films roll from now on: behind the intro, if it is up, so they are running when it opens
    rolling = true;
    wake();
    heroLoad.progress = 1;
    heroLoad.done = true;
  }).catch((err) => {
    console.error('[hero] the 3D world failed to start', err);
    document.documentElement.classList.remove('cinema');
    heroLoad.progress = 1; heroLoad.done = true;
  });

  wake();
}
