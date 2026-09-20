/** DOM side of the hero: which copy block is on screen, the scrim, the stage's sector palette. No canvas knowledge. */
import { $, $$ } from '../core/env';
import { TITLE_STOP, worldAtStop } from './timeline';
import { worlds, overview } from '../../data/worlds';

export interface UIState {
  /** playhead */
  p: number;
  /** the stop the film is heading for (== p when at rest) */
  target: number;
  /** world whose picture is on stage right now (-1 = the disc) */
  world: number;
  /** 0..1 through the leg being played, measured in the direction of travel (1 at rest) */
  arrival: number;
}

const chapterId = (stop: number) => (stop === 0 ? 'overview' : stop === TITLE_STOP ? 'title' : worlds[stop - 1].id);

export class HeroUI {
  private chapters: HTMLElement[];
  private scrim: HTMLElement;
  private stage: HTMLElement;
  private canvas: HTMLElement;
  private active = '?';
  private lastWorld = -2;

  constructor(private root: HTMLElement) {
    this.chapters = $$('[data-chapter]', root);
    this.scrim = $('[data-scrim]', root)!;
    this.stage = $('[data-stage]', root)!;
    this.canvas = $('[data-canvas]', root)!;
  }

  /**
   * Copy leaves the instant time resumes and arrives, with a hard stop, as the clip freezes — but ONLY on the stop
   * the film is actually going to end on. Worlds that are merely passed through in a chain stay silent.
   */
  private chapterFor({ p, target, arrival }: UIState): string {
    if (p === target) return chapterId(target);
    const nearTarget = Math.abs(target - p) < 1;
    const threshold = target === TITLE_STOP ? 0.8 : target === 0 ? 1 : 0.9;
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
      this.scrim.dataset.on = String(id !== '' && id !== 'title');
      this.scrim.dataset.mode = id === 'overview' ? 'overview' : 'world';
    }

    if (s.world !== this.lastWorld) {
      this.lastWorld = s.world;
      if (s.world >= 0) this.stage.dataset.sector = worlds[s.world].id; else delete this.stage.dataset.sector;
      this.canvas.setAttribute('aria-label', s.world >= 0 ? worlds[s.world].alt : overview.alt);
    }
  }

  /** World to describe for a playhead position (switches while the divider wall hides the view). */
  static worldFor(p: number): number {
    const leg = Math.floor(p), local = p - leg;
    if (local === 0) return worldAtStop(leg);
    if (leg === 0) return local > 0.4 ? 0 : -1;
    return worldAtStop(local > 0.5 ? leg + 1 : leg);
  }

  setTitleY(px: number) { this.root.style.setProperty('--title-y', `${Math.round(px)}px`); }
}
