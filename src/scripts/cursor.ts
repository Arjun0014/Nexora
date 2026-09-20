/**
 * The pointer follower.
 *
 * noho.ink keeps the NATIVE cursor and adds a small dot that morphs with context — we do the same, so nothing
 * is ever lost for a visitor who relies on the system cursor. States, in order of how much they say:
 *
 *   dot     15 px, the resting state
 *   label   a pill carrying one word ("Request", "Drag", the sector name)
 *   arrow   a direction, over the stack and over anything that leads away
 *   drag    an open hand that closes on press, squashed along the direction of travel
 *   media   a 160 px plate of the thing under the pointer
 *
 * Position trails with tau 0.055 s and scale with 0.12, so the shape arrives a beat after the pointer. Fine
 * pointers only; gone entirely for touch and reduced motion; never over a form field.
 */
import { $, clamp, env } from './core/env';
import { onTick, damp } from './core/ticker';

type State = 'dot' | 'label' | 'arrow' | 'drag' | 'media';

const LAG = 0.055;
const LAG_S = 0.12;
const STRETCH_MAX = 1.18;

export function initCursor() {
  const el = $('[data-cursor-root]');
  if (!el || !env.finePointer || !env.motion) { el?.remove(); return; }

  const labelEl = $('[data-cursor-text]', el)!;
  const imgEl = $<HTMLImageElement>('[data-cursor-img]', el)!;

  let x = innerWidth / 2, y = innerHeight / 2;
  let tx = x, ty = y;
  let vx = 0, vy = 0;
  let shown = 0, wantShown = 0;
  let state: State = 'dot';
  let off: (() => void) | null = null;

  const setState = (s: State, label = '', media = '') => {
    if (s === state && labelEl.textContent === label && (!media || imgEl.src.endsWith(media))) return;
    state = s;
    el.dataset.state = s;
    if (label !== labelEl.textContent) labelEl.textContent = label;
    if (media && !imgEl.src.endsWith(media)) imgEl.src = media;
    imgEl.hidden = s !== 'media';
  };

  /** What the pointer is over decides the shape. Explicit hooks win; then the usual suspects. */
  function resolve(target: EventTarget | null) {
    if (!(target instanceof Element)) return setState('dot');
    const el2 = target as HTMLElement;
    if (el2.closest('input, textarea, select, [contenteditable="true"]')) { wantShown = 0; return; }
    wantShown = 1;

    const hook = el2.closest<HTMLElement>('[data-cursor]');
    if (hook) {
      const s = hook.dataset.cursor as State;
      return setState(s, hook.dataset.cursorLabel ?? '', hook.dataset.cursorMedia ?? '');
    }
    if (el2.closest('[data-deck-stack]')) {
      const dragging = !!document.querySelector('[data-deck][data-dragging]');
      return setState('drag', dragging ? '' : 'Drag');
    }
    const link = el2.closest<HTMLElement>('a[href], button, summary, [role="button"]');
    if (link) {
      const label = link.dataset.cursorLabel;
      if (label) return setState('label', label);
      return setState('arrow');
    }
    setState('dot');
  }

  const move = (cx: number, cy: number, target: EventTarget | null) => {
    tx = cx; ty = cy;
    resolve(target);
    wake();
  };
  // Pointer events carry the device type, which is what lets us ignore pen and touch. Not every stack emits
  // them for a mouse, though, so mousemove stands in until a real pointermove has been seen.
  let sawPointer = false;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    sawPointer = true;
    move(e.clientX, e.clientY, e.target);
  }, { passive: true });
  addEventListener('mousemove', (e) => {
    // A tap on a touch screen also emits a mousemove; sourceCapabilities is how you tell them apart.
    if (sawPointer || (e as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities?.firesTouchEvents) return;
    move(e.clientX, e.clientY, e.target);
  }, { passive: true });

  addEventListener('pointerdown', () => { el.dataset.press = 'true'; }, { passive: true });
  addEventListener('pointerup', () => { delete el.dataset.press; }, { passive: true });
  addEventListener('pointerleave', () => { wantShown = 0; }, { passive: true });
  addEventListener('blur', () => { wantShown = 0; });
  // Keyboard users should never see a stray dot following nothing.
  addEventListener('keydown', (e) => { if (e.key === 'Tab') wantShown = 0; });

  const tick = (dt: number) => {
    const nx = damp(x, tx, LAG, dt);
    const ny = damp(y, ty, LAG, dt);
    vx = damp(vx, (nx - x) / Math.max(dt, 0.001), 0.09, dt);
    vy = damp(vy, (ny - y) / Math.max(dt, 0.001), 0.09, dt);
    x = nx; y = ny;
    shown = damp(shown, wantShown, LAG_S, dt);

    // Velocity stretches the shape along its direction of travel, the way a trailing object would.
    const speed = Math.hypot(vx, vy);
    const k = clamp(speed / 2600, 0, 1);
    const stretch = 1 + (STRETCH_MAX - 1) * k;
    const angle = speed > 40 ? (Math.atan2(vy, vx) * 180) / Math.PI : 0;

    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg) scale(${(shown * stretch).toFixed(3)}, ${(shown / stretch).toFixed(3)})`;
    el.style.setProperty('--counter-rotate', `${(-angle).toFixed(1)}deg`);
    el.style.opacity = shown.toFixed(3);

    if (shown < 0.002 && wantShown === 0 && speed < 5) sleep();
  };

  const wake = () => { if (!off) off = onTick(tick); };
  const sleep = () => { off?.(); off = null; };
}
