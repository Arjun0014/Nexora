# The hero, version 7: the turning world

Branch `hero-v4` (still off `main`; `main` untouched). v7 keeps v6's court (`06-HERO-V6.md`: the idea, the assets, the
engineering) and changes three things the client asked for on 22 Sep 2026. Desktop only, at their request; phones and
tablets follow once the desktop is approved.

## 0. What the client said

1. "The texts in the main screen isn't legible at all — there's a cloud effect behind it on the side but isn't legible
   at all properly, same for the 5 worlds like hospitality and all others when scrolling, looks really bad."
2. "Can we have this rotating effect, like the walls are rotating around in constant motion… the view we are at now but
   the walls are rotating."
3. "The title… we can make this better, and its placement on the left bottom doesn't feel right."

## 1. Legibility: light, not veils

v6 put a frosted veil (a blurred radial patch) behind every copy block. It read as a cloud and still lost the fight
with the rain of light behind it. v7 deletes it and **lights the shot so that the words always fall on plain stone in
shade** — the cinematographer's answer rather than the interface's:

| Stop | Where the sun stands (relative to the camera) | What it leaves for the words |
|---|---|---|
| 0, the court | low (22°) and behind us | the whole floor in front of us lies in the shade of the wall at our back — a quiet, even ground for the title; the far wall and its doorways take the rain of light |
| 1–5, a doorway | high (54°) and behind the doorway | the wall beside the doorway is in soft, even shade — the ground for the words; the world's light spills over the threshold onto the floor |

Ink on limestone in shade measures about 7:1; nothing behind the type moves faster than the court's turn. The words
keep v6's alignment (each block stands on its doorway's foot) and the frosted veil is gone.

The sun now also carries the film's time. Between two doorways **it goes once round the sky** — a day in three seconds
— so its rain sweeps across the wall that wipes the view, and settles behind the next doorway as we arrive.

## 2. The turning world

The first screen is no longer a held shot. The court **turns once round in 72 seconds** about the pool at its heart —
the camera orbits the centre at the wall's foot, which reads as the walls going by — and the sun keeps its place
relative to us, so the light stays composed while the architecture moves through it. A doorway passes the centre of
the frame every 14 seconds. The pool, being round and on the axis, is the one thing that stands still: the title rests
on the floor in front of it, and the intro's point of light now opens from it.

This also answers the brief's own opening loop ("one 360° rotation, the model turning as one solid object",
`04_HERO_EXPERIENCE_LOCKED.md` §2) at eye level instead of in miniature.

**The court is a ring, so the tour starts where you are.** Scroll, and the turn eases to rest with the doorway in
front of you (the one the ring's mark is under) as the camera crosses to it; the tour then goes on round the ring to
the right — 01 → 02 → … → 05 → 01. `timeline.ts` keeps `ring.start`; every stop's world, copy and camera derive from
it. A world's own number never changes, so a tour that begins at Facilities reads 03, 04, 05, 01, 02.

## 3. The title, and the ring of names

```
                      ONE WORLD, many WORKFORCES.
 01 HOSPITALITY   02 EVENTS   03 FACILITIES   04 TECHNICAL   05 RECRUITMENT
 ─────────────────────────────────────────────────────────────────────────
```

- **One line, fitted to the page's margins.** The title is set to the exact width between the header's wordmark and
  its last button (`ui.ts` `fit()`), capped by an eighth of the screen's height and by the pool's near rim, so it
  always stands on the floor, never over the water. It is centred: the axis of the turn runs through it.
- **`many` is the italic accent**, the site's one display accent, in ink here rather than amber (amber has no contrast
  on stone in shade).
- **The ring of names below it is the court unrolled**: the five doorways in the order they stand. Its mark rides
  under the name of the doorway facing you and slides as the court turns (and along the tour, as a progress
  indicator). Each name is a button: it takes the film into that doorway, and hovering one lights its world.
- The eyebrow and the supporting sentence are kept for the static reading and for screen readers, but not drawn over
  the film: the header already says who and where, and the ring already names the five.

## 4. Engineering notes (on top of 06)

| Where | What |
|---|---|
| `court/index.ts` | `theta` (where the court faces) runs down at `SPIN` while the film rests at stop 0; `facing()` picks the doorway you would step into (biased forward, so a doorway just passed is not chased); `depart()` fixes `ring.start` when the film leaves; leg 0 is v6's path round the pool, rotated by what is left of the turn (a cubic that leaves at the turn's own speed and arrives at rest), so the first screen's frame never jumps; `sunAt()` places the sun per stop and per leg; `mark()` gives the ring its position. |
| `timeline.ts` | `ring.start` and `worldAtStop()`: stop → world round the ring. |
| `ui.ts` | `fit()` (the title's size and width, and the ring's) and the ring's mark, measured once per resize. |
| `scene.ts` | doorways now run **clockwise** (`doorAngle(k) = −k·72°`), so the next world stands to the right, as the locked transition grammar asks. |

Three fixes found on the way, all of which also affect v6's court:

- **The sky's light was being prefiltered inside the first material's build.** During `compileAsync` that sometimes
  produced an empty PMREM, and the court lost its sky light for the rest of the session (black shade). It is now
  prefiltered explicitly, before anything compiles.
- **Without screen-space GI there was no bounce light at all**, so on the medium and low tiers (integrated GPUs) the
  shade went nearly black — invisible in v6's front-lit shots, fatal in v7's. A hemisphere fill (warm above, warmer
  below) and a stronger sky stand in for the traced bounce below the top tier; both are uniforms, so a step down
  changes numbers, not shaders.
- **The sun's shadow map was drawn twice a frame** (three redraws it for every camera, the pool's mirror included) and
  it is the dearest pass in the frame — the lattice, alpha-tested, four layers deep at a low sun. It is now drawn by
  hand: once a frame, only when the sun has moved, and every other frame on the first screen below the top tier.
  Per tier: 4096 / 1536 / 1024.

## 5. Measured (1440×900, dev server)

| GPU / tier | first screen | doorway | leg |
|---|---|---|---|
| RX 5600M, high | 8.3 ms | 8.3 | 8.3 |
| integrated Radeon, medium | 25 ms | 8.4 | 8.3 |
| integrated Radeon, low | 16.8 ms | 8.3 | 8.3 |

The integrated GPU starts at medium and the governor steps it to low after a few seconds, as before. Real wheel input
over the whole film: no frame gap above 50 ms (`.qa/pw/stalls.mjs`; the screencast in `motion.mjs` reports the idle
rests at a stop as "gaps" — a held frame is not redrawn).

## 6. QA

`.qa/pw/exp7.mjs` (stills of several query-string variants), `seq7.mjs` (a leg frame by frame), `mock7.mjs` (type
mock-ups over the live court), `sheet.mjs` (contact sheets), `stalls.mjs` (long frames around real wheel steps),
`ring7.mjs` (the ring: click, back, on), `intro7.mjs` (the intro's ending), `hero5-audit.mjs` (now also: the title
clear of the pool, the ring on screen and clear of the words), `stills.mjs` (the static still and the social image).

Switches: `?spin=0` holds the turn, `?th=` sets what the court faces (in doorways), `?turn=` its period, `?sun0/el0`,
`?dsun/del`, `?swing/dip` the sun, `?hemi/env` the fill, `?sm=` the shadow map, `?gov=0` holds the tier.

## 7. Open

- Phones and tablets: not laid out for v7 (desktop first, at the client's request). The ring of names needs a
  different form there.
- Dust motes in the beams: still built, not drawn (see 06 §6).
- The Held scene still shows the old diorama inside its moon.
- Not tested: Safari/iOS; Firefox's WebGPU.
