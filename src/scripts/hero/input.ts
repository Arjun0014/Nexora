/**
 * Turns raw wheel / touch / key input into discrete STEP INTENTS (+1 / −1) for the hero.
 *
 * One physical gesture = one intent, whatever the device:
 *   mouse wheel      separate notches → notches closer together than GAP are one roll of the finger = one intent
 *   trackpad /       a long decaying stream (inertia lasts ~1 s). The whole stream is ONE intent. A second flick
 *   free-spin wheel  inside it shows up as the deltas growing again after they had died down → a new intent
 *   touch            one intent per touch, fired the moment the swipe passes a small threshold
 *   keys             one intent per press; auto-repeat is throttled
 *
 * Per gesture the owner is asked once whether the hero is in charge (`claims`). If it is, every event of that
 * gesture is cancelled — including its inertia tail, so the tail can never leak into the page as a native scroll.
 * If it is not, the gesture is left to the browser and can never step the hero, even if the page reaches the top
 * while its tail is still arriving.
 */
export type Dir = 1 | -1;

export interface InputOwner {
  /** Is the hero in charge of a scroll intent in this direction right now? */
  claims(dir: Dir): boolean;
  step(dir: Dir): void;
  /** Home key. */
  rewind(): void;
}

const GAP = 200; // ms of silence that ends a wheel gesture
const MIN_TRAVEL = 8; // px of accumulated delta before a gesture counts (ignores a brush of the trackpad)
const REFIRE_MS = 260; // a second flick is only believed this long after the last intent
const SWIPE = 26; // px a touch must travel
const KEY_REPEAT_MS = 420;

const isEditable = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const isActivatable = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('button, a[href], summary, [role="button"]');

export function bindInput(owner: InputOwner, surface: HTMLElement): () => void {
  const ac = new AbortController();
  const opts = { passive: false, signal: ac.signal } as const;

  // ── wheel ───────────────────────────────────────────────────────────────────────────────
  let lastT = -1e9, lastDir = 0, lastFire = -1e9;
  let peak = 0, floor = 0, decaying = false, travelled = 0, fired = false, ours = false;

  addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // pinch-zoom
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 40; else if (e.deltaMode === 2) dy *= innerHeight;
    if (dy === 0 || Math.abs(e.deltaX) > Math.abs(dy)) { if (ours && e.cancelable) e.preventDefault(); return; }
    const dir: Dir = dy > 0 ? 1 : -1;
    const mag = Math.abs(dy);
    const now = e.timeStamp;

    let fresh = now - lastT > GAP;
    // Lifting the fingers often emits a stray 1–2 px the other way: only a real reversal starts a gesture.
    if (!fresh && dir !== lastDir) { if (mag < 4) { if (ours && e.cancelable) e.preventDefault(); return; } fresh = true; }
    // A new flick inside an inertia tail: the stream had died down to `floor`, and is clearly growing again.
    if (!fresh && decaying && floor < peak * 0.45 && mag > floor * 3 + 18 && now - lastFire > REFIRE_MS) fresh = true;

    if (fresh) { peak = mag; floor = mag; decaying = false; travelled = 0; fired = false; ours = owner.claims(dir); }
    else {
      if (mag > peak) peak = mag;
      if (!decaying && mag < peak * 0.7) { decaying = true; floor = mag; }
      else if (decaying && mag < floor) floor = mag;
    }
    lastT = now; lastDir = dir;

    if (!ours) return;
    if (e.cancelable) e.preventDefault();
    travelled += mag;
    if (!fired && travelled >= MIN_TRAVEL) { fired = true; lastFire = now; owner.step(dir); }
  }, opts);

  // ── touch ───────────────────────────────────────────────────────────────────────────────
  let tracking = false, decided = false, swiped = false, x0 = 0, y0 = 0;

  surface.addEventListener('touchstart', (e) => {
    tracking = e.touches.length === 1;
    decided = false; swiped = false;
    if (tracking) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }
  }, { passive: true, signal: ac.signal });

  surface.addEventListener('touchmove', (e) => {
    if (!tracking || e.touches.length !== 1) return;
    const dx = x0 - e.touches[0].clientX, dy = y0 - e.touches[0].clientY; // dy > 0: finger up = onwards
    if (!decided) {
      if (dy === 0 && dx === 0) { if (e.cancelable) e.preventDefault(); return; }
      decided = true;
      // A sideways drag, or a direction the hero does not own (e.g. onwards from the title card), is the browser's.
      if (Math.abs(dx) > Math.abs(dy) * 1.2 || !owner.claims(dy > 0 ? 1 : -1)) { tracking = false; return; }
    }
    if (e.cancelable) e.preventDefault();
    if (!swiped && Math.abs(dy) >= SWIPE) { swiped = true; owner.step(dy > 0 ? 1 : -1); }
  }, opts);

  const endTouch = () => { tracking = false; };
  surface.addEventListener('touchend', endTouch, { passive: true, signal: ac.signal });
  surface.addEventListener('touchcancel', endTouch, { passive: true, signal: ac.signal });

  // ── keys ────────────────────────────────────────────────────────────────────────────────
  let lastKey = -1e9;
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isEditable(e.target)) return;
    let dir: Dir | 0 = 0;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': dir = 1; break;
      case 'ArrowUp': case 'PageUp': dir = -1; break;
      case ' ': case 'Spacebar': if (isActivatable(e.target)) return; dir = e.shiftKey ? -1 : 1; break;
      case 'Home': if (owner.claims(-1)) { e.preventDefault(); owner.rewind(); } return;
      default: return;
    }
    if (!owner.claims(dir)) return;
    e.preventDefault();
    if (e.repeat && e.timeStamp - lastKey < KEY_REPEAT_MS) return;
    lastKey = e.timeStamp;
    owner.step(dir);
  }, { signal: ac.signal });

  return () => ac.abort();
}
