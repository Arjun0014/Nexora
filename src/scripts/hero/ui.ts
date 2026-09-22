/** DOM side of the hero: which copy block is on screen, the ground the header reads, the stage's sector, the ring of
 *  names under the title. No canvas knowledge. */
import { $, $$ } from '../core/env';
import { TITLE_STOP, worldAtStop } from './timeline';
import { worlds, overview } from '../../data/worlds';

/** Where the ring's mark stands (continuous: k.0 = world k's name), which name is lit, and whether the ring shows. */
export interface RingState { c: number; k: number; show: boolean }

export interface UIState {
  /** playhead */
  p: number;
  /** the stop the film is heading for (== p when at rest) */
  target: number;
  /** world whose moment is on stage right now (-1 = the court seen whole) */
  world: number;
  /** 0..1 through the leg being played, measured in the direction of travel (1 at rest) */
  arrival: number;
  ring: RingState;
}

const chapterId = (stop: number) => (stop === 0 ? 'overview' : stop === TITLE_STOP ? 'title' : worlds[worldAtStop(stop)].id);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class HeroUI {
  private chapters: HTMLElement[];
  private stage: HTMLElement;
  private canvas: HTMLElement;
  private active = '?';
  private lastWorld = -2;
  private ground = '';
  private ringEl: HTMLElement | null;
  private ringItems: HTMLElement[];
  private ringMarks: HTMLElement[];
  private ringX: { l: number; w: number }[] = [];
  private ringOn = -1;
  private ringShown = false;
  private ringC = NaN;

  constructor(private root: HTMLElement) {
    this.chapters = $$('[data-chapter]', root);
    this.stage = $('[data-stage]', root)!;
    this.canvas = $('[data-canvas]', root)!;
    this.ringEl = $('[data-ring]', root);
    this.ringItems = $$('[data-ring-item]', root);
    this.ringMarks = $$('[data-ring-mark]', root);
  }

  /**
   * Copy leaves the instant time resumes and arrives while the window is opening (70% into a leg: the screen has
   * finished sliding and the arch is coming open), so it is in place as the moment settles — but ONLY on the stop the
   * film is going to end on. Worlds passed through in a chain stay silent.
   */
  private chapterFor({ p, target, arrival }: UIState): string {
    if (p === target) return Number.isInteger(target) ? chapterId(target) : '';
    const nearTarget = Math.abs(target - p) < 1;
    const threshold = target === TITLE_STOP ? 0.8 : target === 0 ? 0.9 : 0.7;
    return nearTarget && arrival >= threshold ? chapterId(target) : '';
  }

  update(s: UIState) {
    const id = this.chapterFor(s);
    if (id !== this.active) {
      this.active = id;
      for (const ch of this.chapters) {
        const on = ch.dataset.chapter === id;
        ch.dataset.active = String(on);
        // Copy stays in the accessibility tree for a linear read; only keyboard focus is gated.
        $$<HTMLAnchorElement>('a', ch).forEach((a) => (a.tabIndex = on ? 0 : -1));
      }
    }

    // The header takes its ink from the ground under it: limestone, until the NEXORA card has closed to black.
    const ground = s.p > TITLE_STOP - 0.35 ? 'dark' : 'light';
    if (ground !== this.ground) {
      this.ground = ground;
      this.root.dataset.bg = ground;
      dispatchEvent(new Event('nx:ground'));
    }

    if (s.world !== this.lastWorld) {
      this.lastWorld = s.world;
      if (s.world >= 0) this.stage.dataset.sector = worlds[s.world].id; else delete this.stage.dataset.sector;
      this.canvas.setAttribute('aria-label', s.world >= 0 ? worlds[s.world].moment : overview.alt);
    }
    this.setRing(s.ring);
  }

  /** World on stage for a playhead position (the image changes while the screen is shut, halfway through a leg). */
  static worldFor(p: number): number {
    const leg = Math.floor(p), local = p - leg;
    if (local === 0) return worldAtStop(leg);
    if (leg === 0) return local > 0.4 ? worldAtStop(1) : -1;
    return worldAtStop(local > 0.5 ? leg + 1 : leg);
  }

  setTitleY(px: number) { this.root.style.setProperty('--title-y', `${Math.round(px)}px`); }

  /**
   * The first screen's title is one line fitted to the page's margins (the header's wordmark on the left, its last
   * button on the right), no taller than an eighth of the screen; the ring of names takes the same width.
   */
  fit() {
    const h1 = $<HTMLElement>('[data-fit]', this.root);
    if (!h1 || !document.documentElement.classList.contains('cinema')) return;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;inline-size:var(--margin);block-size:0';
    this.root.appendChild(probe);
    const margin = probe.getBoundingClientRect().width;
    probe.remove();
    h1.style.fontSize = '100px';
    const w = h1.getBoundingClientRect().width;
    h1.style.removeProperty('font-size');
    if (!w) return;
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    let size = Math.min((100 * (W - 2 * margin)) / w, H * 0.125);
    const apply = () => {
      this.root.style.setProperty('--fit-size', `${size.toFixed(2)}px`);
      this.root.style.setProperty('--fit-w', `${((w * size) / 100).toFixed(1)}px`);
    };
    apply();
    // ...and it stands on the floor in front of the pool, clear of the near rim (published by the world once it has
    // laid itself out; on short screens this is what limits the size)
    const pool = parseFloat(getComputedStyle(this.root).getPropertyValue('--pool-front'));
    const line = $('.l', h1);
    if (Number.isFinite(pool) && line) {
      const top0 = this.stage.getBoundingClientRect().top;
      const top = line.getBoundingClientRect().top - top0, bottom = h1.getBoundingClientRect().bottom - top0;
      const clear = pool + Math.max(12, H * 0.02);
      if (top < clear && bottom > clear) { size *= Math.max(0.55, (bottom - clear) / (bottom - top)); apply(); }
    }
    requestAnimationFrame(() => this.measureRing());
  }

  private measureRing() {
    if (!this.ringEl) return;
    const r = this.ringEl.getBoundingClientRect();
    this.ringX = this.ringItems.map((a) => { const b = a.getBoundingClientRect(); return { l: b.left - r.left, w: b.width }; });
    this.ringC = NaN;
  }

  /** The mark rides over the name you face; past the last name it runs off the end and comes back in at the first. */
  private setRing({ c, k, show }: RingState) {
    if (show !== this.ringShown) {
      this.ringShown = show;
      if (show) this.root.dataset.ring = ''; else delete this.root.dataset.ring;
    }
    if (k !== this.ringOn) {
      this.ringOn = k;
      this.ringItems.forEach((a, i) => a.toggleAttribute('data-on', i === k));
    }
    const X = this.ringX, n = X.length;
    if (!n || Math.abs(c - this.ringC) < 1e-4) return;
    this.ringC = c;
    const put = (el: HTMLElement | undefined, x: number, w: number, o: number) => {
      if (!el) return;
      el.style.setProperty('--x', `${x.toFixed(1)}px`);
      el.style.setProperty('--w', `${w.toFixed(1)}px`);
      el.style.setProperty('--o', o.toFixed(3));
    };
    const i = Math.floor(c) % n, f = c - Math.floor(c);
    const [a, b] = this.ringMarks;
    if (i < n - 1) {
      put(a, lerp(X[i].l, X[i + 1].l, f), lerp(X[i].w, X[i + 1].w, f), 1);
      put(b, 0, 0, 0);
    } else {
      const step = X[n - 1].l - X[n - 2].l;
      put(a, X[n - 1].l + f * step, X[n - 1].w, 1 - f);
      put(b, X[0].l - (1 - f) * step, X[0].w, f);
    }
  }
}
