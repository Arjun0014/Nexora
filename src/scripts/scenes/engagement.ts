/**
 * Scene 7 — the colonnade (src/components/scenes/Engagement.astro). One scrubbed progress q over the pinned part:
 *   0.00 → 0.07  open    the maroon arch widens and rises until it is the whole ground (--a 0 → 1)
 *   0.07 → 0.86  walk    the track slides left; each photograph drifts against its arch; the floor line fills
 *   0.86 → 1.00  through the limestone doorway grows from its own box to beyond the screen, radius → 0
 * Before the pin engages the section is simply scrolling up over Sectors, so the arch RISES by itself.
 */
import { $, $$, clamp, lerp } from '../core/env';
import { ScrollTrigger, EASE } from '../core/motion';

const OPEN = 0.07, WALK_END = 0.86;

export function initEngagement() {
  const root = $('[data-egx]');
  if (!root || !document.documentElement.classList.contains('motion')) return;
  const pin = $('[data-egx-pin]', root)!;
  const ground = $('[data-egx-ground]', root)!;
  const track = $('[data-egx-track]', root)!;
  const imgs = $$('[data-egx-img]', root);
  const door = $('[data-egx-door]', root)!;
  const open = $('[data-egx-open]', root)!;
  const floor = $('.egx__floor', root)!;

  let travel = 0, doorBox = { x: 0, y: 0, w: 0, h: 0 };
  const measure = () => {
    travel = Math.max(0, track.scrollWidth - innerWidth);
    // The doorway's box at the END of the walk (track fully slid).
    const r = door.getBoundingClientRect(), p = pin.getBoundingClientRect();
    const cur = currentX;
    doorBox = { x: r.left - p.left - cur - travel, y: r.top - p.top, w: r.width, h: r.height };
  };

  let currentX = 0;
  const render = (q: number) => {
    const a = EASE.inOut(clamp(q / OPEN));
    ground.style.setProperty('--a', a.toFixed(4));
    root.toggleAttribute('data-live', q > 0.001);

    const w = EASE.ease(clamp((q - OPEN) / (WALK_END - OPEN)));
    currentX = -travel * w;
    track.style.transform = `translate3d(${currentX.toFixed(1)}px, 0, 0)`;
    floor.style.setProperty('--walk', String(clamp((q - OPEN) / 0.04) * (1 - clamp((q - WALK_END) / 0.03))));
    floor.style.setProperty('--p', w.toFixed(4));
    const vw = innerWidth;
    imgs.forEach((img) => {
      const r = img.parentElement!.getBoundingClientRect();
      const off = (r.left + r.width / 2 - vw / 2) / vw;
      img.style.transform = `translate3d(${(-off * 9).toFixed(2)}%, 0, 0)`;
    });

    const t = EASE.inOut(clamp((q - WALK_END) / (1 - WALK_END)));
    open.style.visibility = t > 0 ? 'visible' : 'hidden';
    if (t > 0) {
      const sw = pin.clientWidth, sh = pin.clientHeight;
      const x = lerp(doorBox.x, -sw * 0.04, t), y = lerp(doorBox.y, -sh * 0.04, t);
      const ww = lerp(doorBox.w, sw * 1.08, t), hh = lerp(doorBox.h, sh * 1.08, t);
      const rad = lerp(doorBox.w / 2, 0, t);
      Object.assign(open.style, { left: `${x}px`, top: `${y}px`, width: `${ww}px`, height: `${hh}px`, borderRadius: `${rad}px ${rad}px 0 0` });
    }
    const light = t > 0.6;
    if ((root.dataset.bg === 'light') !== light) { root.dataset.bg = light ? 'light' : 'dark'; dispatchEvent(new Event('nx:ground')); }
  };

  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => { measure(); render(self.progress); },
  });
  measure();
  render(0);
}
