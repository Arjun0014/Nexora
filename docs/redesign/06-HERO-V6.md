# The hero, version 6: one world under a rain of light

Branch `hero-v4` (still off `main`; `main` untouched). Replaces v5's mashrabiya screen (`05-HERO-V5.md`, kept for the
record) — everything in the hero **before** the NEXORA title zoom, and the end of the intro. The NEXORA knock-out,
the title card and every scene after it are unchanged (`src/scripts/hero/mask.ts` untouched). Desktop first, at the
client's request; phones and tablets follow once the desktop is approved.

## 0. Why v5 was replaced (the client, 22 Sep 2026)

"Too simple and not that great, not award-winning worthy at all. Please really try. Desktop only for now."

Diagnosis: v5 fixed v4's faults (night, bad alignment, programmer-art 3D) but gave up the spectacle — a flat carved
screen with a small window. The brief was always a *world* ("One World, Many Workforces": a circular world of five
sectors, motion → time freeze → movement between worlds → time freeze; `nexora_website_context/04_HERO_EXPERIENCE_LOCKED.md`),
and the client's reference for the level was a live 3D film (why.zero.university). v6 goes back to a world, in
daylight, and puts the realism where a real-time renderer can make it perfect: light on stone.

## 1. Directions tried this time, and why they were dropped

All prototyped on three.js's WebGPU renderer and judged in a real GPU window.

| Direction | What it was | Verdict |
|---|---|---|
| Human-scale courtyard | an Arabian court with arcades, iwans, carved doors, fountain, channels | read as an untextured massing model; photoreal architecture this way is a long fight |
| The model | the same court as an architectural model on a plinth (five domed gate pavilions, gardens, a moat) | charming but toy-like at eye level; five big domes read as a mosque complex — wrong for the client |
| Particles | each world's photo rebuilt from 250k particles by its depth map, blown to dust and back | on a light ground the dust is TV static and the relief a torn pop-up |
| The ring | five arched portals turning round the headline on a disc in still water (Squarespace's ring) | clean, but at first glance still "photos in arches" (v5) |
| **Rain of light** | a limestone court under a latticed dome; five doorways onto the worlds | **chosen**: the light alone makes the frame; minimal geometry that can be made perfect |

## 2. The idea

A round limestone court is the one world. Over it, a dome of brass lattice — two shells of eight-point stars at
different scales and turns (the site's mashrabiya, and the girih of the Held scene) — lets the Doha sun through as a
rain of light: stars that fall across the stone, the floor and the pool, and move as the sun moves. Five doorways
lead out of the court, one per workforce; beyond each, a moment of work held in time. *The people behind smooth
operations* are, literally, behind the doors.

| Stop | What you see | Copy |
|---|---|---|
| 0 | across the pool to the far doorway (Hospitality), two more doorways either side, the dome above; the sun drifts, the stars glide; the pointer moves the sun | ONE WORLD. *many* WORKFORCES. (bottom left) |
| 1–5 | at a doorway, ten metres back: the doorway right of centre framing its world, the lit wall to the left for the words; time stops — the stars stand still; the pointer leans round the frozen moment | 01—05 · name · one line · link, standing on the doorway's foot |
| 6 | NEXORA (unchanged) — its letters open onto the five workforces (N, E, X, O, RA) | *The people behind smooth operations.* |

Moves (one gesture = one leg):
- **0 → 1** the camera goes round the pool to the first doorway.
- **k → k+1** it backs off the doorway and sweeps along the court to the next: a star-lit wall passes across the
  frame (the locked "wall wipe"), and the sun turns 72° with the camera, so every doorway stands in the same light and
  the stars sweep over the walls as you move.
- **5 → 6** the camera looks up into the dome as the NEXORA mask closes; mid-close, the lattice's stars play over the
  worlds; at rest, the five worlds fill the letters.

## 3. Composition (alignment)

The world publishes where a doorway stands at its stop — `--door-left/right/top/bottom` on `[data-hero]` — and the
copy is set from them: every world's words stand on the doorway's foot (one ground line) in the column left of it,
sharing the header's left margin. A soft frosted veil (backdrop blur, radial mask, no box) sits behind each block so
the type reads over the moving stars; a limestone fade behind the header does the same for the nav over the dome
(gone on the black title card). The intro reads `--circle-x/y/r` from the world: its point of light travels to the
far doorway of the first screen and opens from there over the whole court.

## 4. Engineering (`src/scripts/hero/court/`)

| File | What |
|---|---|
| `scene.ts` | the court: floor slabs laid in rings round the pool (joints cut in the shader), the pool as a dark planar mirror (`reflector`), the ring wall with coursing lines, five doorways (portal, stepped order, reveal, threshold) with each world's picture hung behind (depth parallax from its depth map), and the dome — two lattice shells as spherical caps whose star pattern is a signed-distance function in the shader (`maskNode` and `maskShadowNode`, so the holes cast real star-shaped light). Materials are Poly Haven scans (CC0), one material per surface. |
| `index.ts` | `World`: loads textures, the five worlds and the sky; takes the sun out of the sky's HDR and makes it a shadow-casting light of the same energy; builds the post chain; films the court from the playhead (`poseAt`: stops and Catmull–Rom legs); moves the sun (72° a leg, drifting on stop 0, the pointer adds to it); publishes the layout; draws the title strips behind the mask. |

Post chain by quality: **high** — screen-space GI (`SSGINode`), god rays (`GodraysNode`, the lattice's shadow map
raymarched), temporal AA (`TRAANode`), bloom, the grade; **medium** — no GI; **low** — no GI, no rays, no bloom.
The grade: ACES, a split tone (warm where the sun falls, a breath of sky in the shade), a touch of saturation, a soft
vignette. The first tier is a guess from the GPU (WebGPU adapter: NVIDIA or AMD RDNA → high, else medium; the
renderer asks for the high-performance GPU); a governor steps down when frames run long (median > 24 ms over 90
animated frames). A frozen frame is not redrawn once the pointer is still and the AA has settled.

Measured (1440×900, dev server): RX 5600M, high — 8 ms a frame (120 Hz display); integrated Radeon (Vega), medium
— 25 ms on the first screen, 16 ms elsewhere; low — 16 ms everywhere. Startup: 12 materials compiled one per frame
(worst single stall ~0.46 s, first post frame ~0.5 s), all behind the intro. The hero's chunk is ~267 KB gzipped
(three's WebGPU build); the court's assets ~2.8 MB (textures 2k colour + 1k normal/ARM, a 1k HDR sky) plus the five
worlds (from `public/media/hero5`, unchanged).

Assets (`scripts/ph-fetch.mjs` → `media/ph`, gitignored; `scripts/build-court.mjs` → `public/media/court`), all
Poly Haven, CC0: `plastered_wall_02` (stone), `patterned_clay_plaster` (plaster), `beige_wall_001` (the floor's slabs),
`qwantani_late_afternoon_puresky` (the sky, resampled in float by `scripts/hdr.mjs` — ffmpeg's scaler clamps HDR).

## 5. Fallbacks

Reduced motion, Save-Data, no WebGL2 and no-JS: the six ordinary sections on limestone, the overview showing a still of
the court (`public/media/hero6/court-*.webp`, rendered by `.qa/pw/stills6.mjs`), the worlds in arches, the title
card with a photo through the word. `public/media/og.jpg` is the court's first screen (same script).

## 6. Things that are easy to break

- **three's `DepthOfFieldNode` fed the SSGI composite hangs the page** (WebGPU, r186), in either order round TRAA.
  Anything else that samples the finished image should sample TRAA's `getTextureNode()` (a real texture: no nested
  render).
- A sprite with an `mrtNode` override breaks the reflector's own pass (it has no MRT: "structures must have at least
  one member"); plain sprites in the scene pass write black into the GI's diffuse target. The dust motes are built
  (`scene.ts`) but not drawn for that reason.
- TSL renames in r186: `directionToColor` → `packNormalToRGB`, `colorToDirection` → `unpackRGBToNormal`;
  `PCFSoftShadowMap` is gone from the WebGPU renderer.
- A TSL `color()` call and a local named `color` in the same function: temporal dead zone at runtime.
- Tone mapping is the renderer's (ACES, exposure 0.95); the grade runs before it on linear HDR. The world pictures are
  in the scene, so they are tone-mapped too.
- The doorway pictures are sized for the door-stop camera (~10 m back); if you move `doorPose`, resize them
  (`scene.ts`, 10.6 m tall).

## 7. QA (`.qa/pw/`)

`hero5-shots.mjs <tag> <profile> p…` (GPU stills at playhead positions; `HERO_QS` appends to the URL),
`motion.mjs` (real wheel input, screencast, long-gap report; `MOTION_DELAY` to let the intro finish; 7th arg = URL),
`hero5-audit.mjs` (every stop: the words fully on screen and clear of the doorway), `perf-igpu.mjs` (frame times on
the integrated GPU; `HP=1` for the discrete one), `timings.mjs` (startup phases), `stills6.mjs` (the static still
and the social image).

## 8. Open

- Phones and tablets: not yet laid out for v6 (the client asked for desktop first).
- Dust motes in the beams: built, not drawn (see §6).
- The Held scene still shows the old diorama inside its moon; a still of the court's dome would tie it in.
- Not tested: Safari/iOS; Firefox's WebGPU.
