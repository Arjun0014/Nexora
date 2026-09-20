/**
 * Contextual cursor label.
 * The native cursor is never hidden. A small chip trails it and exists ONLY over elements that
 * carry data-cursor="LABEL" — places where an affordance (drag, scroll) is otherwise invisible.
 * Fine pointers only; off under reduced motion; never over form controls; RAF sleeps when idle.
 */
import { $, env } from './core/env';
import { onTick, damp } from './core/ticker';

export function initCursor() {
  const el = $('[data-cursor-label]');
  if (!el || !env.motion || !env.finePointer) return;
  const text = el.firstElementChild as HTMLElement;

  let x = 0, y = 0, tx = 0, ty = 0;
  let off: (() => void) | null = null;
  let idle = 0;
  let label = '';

  const stop = () => { off?.(); off = null; };
  const start = () => {
    if (off) return;
    off = onTick((dt) => {
      x = damp(x, tx, 0.07, dt);
      y = damp(y, ty, 0.07, dt);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      idle += dt;
      if (idle > 2 && Math.abs(x - tx) < 0.5 && Math.abs(y - ty) < 0.5) stop();
    });
  };

  function setLabel(next: string) {
    if (next === label) return;
    label = next;
    if (next) text.textContent = next;
    el!.dataset.on = String(Boolean(next));
  }

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') { setLabel(''); return; }
    tx = e.clientX; ty = e.clientY; idle = 0;
    if (!label && !off) { x = tx; y = ty; }
    const target = e.target as Element | null;
    const blocked = target?.closest('input, textarea, select, [contenteditable], [data-cursor-off]');
    const host = blocked ? null : target?.closest<HTMLElement>('[data-cursor]');
    setLabel(host?.dataset.cursor ?? '');
    if (label) start();
  }, { passive: true });

  addEventListener('pointerdown', () => el.classList.add('is-down'), { passive: true });
  addEventListener('pointerup', () => el.classList.remove('is-down'), { passive: true });
  document.addEventListener('pointerleave', () => setLabel(''));
  addEventListener('blur', () => setLabel(''));
}
