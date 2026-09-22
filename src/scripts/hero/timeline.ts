/**
 * The hero as a row of STOPS joined by LEGS. PURE — no DOM.
 *
 *   stop 0 the ring ─leg 0 (dive)→ 1 Hospitality ─leg 1→ 2 Events ─leg 2→ 3 Facilities ─leg 3→ 4 Technical
 *                   ─leg 4→ 5 Recruitment ─leg 5 (exit: NEXORA mask)→ stop 6 title card
 *
 * The playhead `p` is a float in [0, 6]. An integer means "at rest on that stop" (time is frozen there); the
 * fraction is the progress through leg ⌊p⌋. Legs are PLAYED IN TIME — one gesture, one leg — never scrubbed by
 * scroll distance. The world is drawn live from `p`, so every leg plays the same in either direction.
 */
export const WORLD_COUNT = 5;
export const TITLE_STOP = WORLD_COUNT + 1;
export const LEG_COUNT = TITLE_STOP;

/** Seconds per leg at natural speed. */
export const LEG_SECONDS = { entry: 4.6, sector: 4.0, exit: 2.8 };

export type LegKind = 'entry' | 'sector' | 'exit';
export interface Leg { kind: LegKind; seconds: number }

export function buildLegs(): Leg[] {
  const legs: Leg[] = [{ kind: 'entry', seconds: LEG_SECONDS.entry }];
  for (let w = 1; w < WORLD_COUNT; w++) legs.push({ kind: 'sector', seconds: LEG_SECONDS.sector });
  legs.push({ kind: 'exit', seconds: LEG_SECONDS.exit });
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

/** World in focus at stop `s` (-1 = the ring seen whole). */
export const worldAtStop = (s: number) => (s <= 0 ? -1 : Math.min(s, WORLD_COUNT) - 1);
