/**
 * One shared requestAnimationFrame loop. Subscribers receive dt in seconds (clamped so a
 * background-tab stall cannot produce a huge step). The loop sleeps when nobody is subscribed.
 */
type Tick = (dt: number, now: number) => void;

const subs = new Set<Tick>();
let raf = 0;
let last = 0;

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  subs.forEach((fn) => fn(dt, now));
  raf = subs.size ? requestAnimationFrame(frame) : 0;
}

export function onTick(fn: Tick): () => void {
  subs.add(fn);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  return () => { subs.delete(fn); };
}

/** Frame-rate independent exponential approach: moves `current` towards `target` with time-constant tau (s). */
export const damp = (current: number, target: number, tau: number, dt: number) => target + (current - target) * Math.exp(-dt / tau);
