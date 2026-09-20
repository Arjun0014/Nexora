/**
 * The hero as a row of STOPS joined by LEGS. PURE — no DOM.
 *
 *   stop 0 overview ─leg 0 (entry)→ 1 Hospitality ─leg 1→ 2 Events ─leg 2→ 3 Facilities ─leg 3→ 4 Technical
 *                   ─leg 4→ 5 Recruitment ─leg 5 (exit: NEXORA mask)→ stop 6 title card
 *
 * The playhead `p` is a float in [0, 6]. An integer means "at rest on that stop"; the fraction is the progress
 * through leg ⌊p⌋. Legs are PLAYED IN TIME at the footage's natural 24 fps — one gesture, one leg — never
 * scrubbed by scroll distance.
 */
export const WORLD_COUNT = 5;
export const TITLE_STOP = WORLD_COUNT + 1;
export const LEG_COUNT = TITLE_STOP;
export const FPS = 24;

/**
 * The entry clip is joined ~1.8 s in. Its first frames turn at idle speed from ONE pose, which forced the old
 * build to race the loop to its seam before anything moved. From here on the disc is a motion-blurred spin:
 * the rotation angle is unreadable, so any loop frame can hand off to it through a short cross-fade.
 * Must be even (the portrait set keeps every 2nd frame).
 */
export const ENTRY_START_FRAME = 44;

/** Seconds the NEXORA knock-out takes to pull back from inside the X. */
const EXIT_SECONDS = 2.6;

export type LegKind = 'entry' | 'sector' | 'exit';
export interface Leg { kind: LegKind; /** index into the manifest's sequences; -1 for the exit */ seq: number; seconds: number }

export function buildLegs(sequenceFrames: number[]): Leg[] {
  const legs: Leg[] = [];
  for (let w = 0; w < WORLD_COUNT; w++) {
    const first = w === 0 ? ENTRY_START_FRAME : 0;
    legs.push({ kind: w === 0 ? 'entry' : 'sector', seq: w, seconds: (sequenceFrames[w] - 1 - first) / FPS });
  }
  legs.push({ kind: 'exit', seq: -1, seconds: EXIT_SECONDS });
  return legs;
}

export interface Located {
  /** true when p sits exactly on a stop */
  rest: boolean;
  /** the stop we are on (rest), or the nearer one (moving) */
  stop: number;
  /** the leg under the playhead; at rest, the leg that starts here (clamped) */
  leg: number;
  /** 0..1 through that leg */
  local: number;
}

export function locate(p: number): Located {
  const v = Math.max(0, Math.min(TITLE_STOP, p));
  const near = Math.round(v);
  if (Math.abs(v - near) < 1e-6) return { rest: true, stop: near, leg: Math.min(near, LEG_COUNT - 1), local: near === TITLE_STOP ? 1 : 0 };
  const leg = Math.floor(v);
  return { rest: false, stop: near, leg, local: v - leg };
}

/** World whose picture is on stage at stop `s` (-1 = the overview disc). */
export const worldAtStop = (s: number) => (s <= 0 ? -1 : Math.min(s, WORLD_COUNT) - 1);
