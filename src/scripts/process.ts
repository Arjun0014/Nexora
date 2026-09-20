/**
 * The engagement chapter: five stations, one picture.
 *
 * Kononenko shows process as increasing FIDELITY of a single image rather than as numbered boxes. Here the
 * picture is the Nexora model itself: it starts as a drawing and resolves, station by station, into the lit
 * render — the plan becoming the thing. This module only decides which station is current; every visual step
 * is a CSS stage on the figure.
 */
import { $, $$ } from './core/env';

export function initProcess() {
  const root = $('[data-process]');
  if (!root) return;
  const stations = $$<HTMLElement>('[data-station]', root);
  const figure = $('[data-process-figure]', root);
  const caption = $('[data-process-caption]', root);
  if (!stations.length || !figure) return;

  let current = -1;
  const set = (i: number) => {
    if (i === current) return;
    current = i;
    figure.dataset.stage = String(i);
    stations.forEach((s, k) => { s.dataset.on = String(k <= i); s.dataset.current = String(k === i); });
    if (caption) caption.textContent = stations[i]?.querySelector('h3')?.textContent ?? '';
    root.style.setProperty('--station', String(i));
  };
  set(0);

  // The current station is the last one whose top has passed the reading line.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const i = stations.indexOf(e.target as HTMLElement);
      if (i >= 0) set(i);
    }
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  stations.forEach((s) => io.observe(s));
}
