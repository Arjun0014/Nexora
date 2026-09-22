> **Superseded by `06-HERO-V6.md`** (22 Sep 2026): the client found v5 too simple. Kept for the record; its five
> moments (`public/media/hero5`, `scripts/build-hero5.mjs`) are still the worlds behind v6's doorways.

# The hero, version 5: the people behind the screen

Branch `hero-v4` (still off `main`; `main` untouched). Replaces v4's night world (`04-HERO-V4.md`, kept for the
record) — everything in the hero **before** the NEXORA title zoom, and the intro in front of it. The NEXORA
knock-out, the title card and every scene after it are unchanged (`src/scripts/hero/mask.ts` untouched; the Portal
still scales `[data-media]`).

## 0. Why v4 was replaced (the client, 22 Sep 2026)

"Dark themes and full night don't match our company. The alignment of the names and info on the hero is really bad.
The things rendered in 3D don't look that good. It lacks taste and thought. What comes before the title zoom needs the
same taste as what follows."

Diagnosis: v4 was a night film in front of a daylight site (sky, limestone, maroon); its names were 3D letters
standing behind procedurally modelled objects, half hidden by them; the objects read as programmer art because
nothing in them was real. v5 answers each point: the palette is the site's own (limestone, sky, ink); every word is
DOM type on one grid; the only realism on screen is real — photographs of people at work — and the 3D is what a
shader can make perfect: a carved screen, its depth and its light.

## 1. Research (five sites the client gave, studied live; notes in `.qa/out/ref2/`, not committed)

| Site | What it does | What v5 takes |
|---|---|---|
| era-residence.com | a sunlit architectural render as the hero, the monumental title set in the sky, an arch rising out of the loader; "by night" is blue hour, never black | light as luxury; one image, one title, symmetry of intent; the arch |
| sondaven.com | one material (the building's timber slats) renders the title, the illustrations and the edges of the photographs | **a graphic system derived from the architecture** — ours is the mashrabiya |
| why.zero.university | a real-time film whose light chapters (mint; white clouds over a city) are its best; a sentence spread over chapters; photoreal assets only | realism only where it is real; one colour world per chapter |
| brand.squarespace.com | chapters as live cards in a CSS-3D ring round one sentence; a card flies in to become the chapter; one subject per frame; minimal chrome | the window that becomes the chapter; restraint |
| mesh3d.gallery | one material (particles) morphs into everything; the chrome narrates the journey | continuity by material: the same stars are the pattern, the halftone, the windows and the letters |

Directions tried and dropped on the way (prototypes deleted, described here so nobody retries them blind): a
limestone drum in the sea (read as a water tower); a lattice-dome pavilion with five iwans, textured, with SSAO and
volumetric light shafts (the light was beautiful, the whole still read as a model); the same scene path-traced
(three-gpu-pathtracer: ~1 sample/s at 1440×900 on the RX 5600M, a day per film). Stock footage was surveyed for the
moments (Pexels): usable for two worlds, dated or generic for the rest, so the moments are stills.

## 2. The idea

In Gulf architecture the **mashrabiya** is the screen between the street and the house: it lets the light and the air
through and keeps the people behind it out of sight. Nexora's people are exactly that — *the people behind smooth
operations*, in every operation and rarely seen. The hero is a living mashrabiya in the Doha sun; behind it, five
moments of work, held in time. The title card at the end says what the screen was hiding.

| Stop | What you see | Copy |
|---|---|---|
| 0 | the screen, shut: limestone carved with eight-point stars, sun raking it (and drifting through an unseen outer lattice); **a circle of it open** — the one world — onto the first moment. The pointer is a lens: the screen opens a little wherever you look, onto the room behind, out of focus | ONE WORLD. *many* WORKFORCES. |
| 1–5 | a world, held: a person at work, seen through an **arch** of opened stars (its rim a halftone of half-open stars); the pointer leans round the frozen moment (depth parallax from the photo's depth map) | 01—05 · name · one line · link |
| 6 | NEXORA (the knock-out, unchanged) — its letters are windows onto all five workforces at once (N, E, X, O, RA) | *The people behind smooth operations.* |

Moves (one gesture = one leg, as before):
- **0 → 1** the circle opens and becomes the arch (the SDF morphs); the headline leaves, the world's name arrives.
- **k → k+1** the camera walks along the screen by one bay: the window you are at leaves to the left, its stars
  closing until the moment is only points of light, then shut; the solid screen passes (the locked "wall wipe": the
  world changes only while hidden); the next window arrives from the right and opens as it comes to rest. What is
  behind a window travels at 86% of the screen's speed, so it reads as further away.
- **5 → 6** the arch shuts; NEXORA closes in from inside the X; as the letters come to size the whole screen opens
  behind them, star by star, onto the five moments.

Time: it runs during legs (the moment you leave drifts on, the next arrives a touch forward and settles still) and on
the first screen (the sun moves); it stops at a moment — the frame is not even redrawn until the pointer moves.

## 3. Composition (alignment)

The canvas publishes its layout as CSS custom properties on `[data-hero]` (`--arch-x/-y/-w/-h/-top/-bottom/-left`,
`--circle-x/-y/-r`), and the copy is positioned from them — nothing in CSS guesses what the canvas drew.
- **One ground line**: every copy block (the headline, each world's words) stands on the arch's foot. Label, title,
  line and link share the left margin of the header's wordmark.
- Desktop: the window stands on the right (its right edge a margin plus 3.5% in), 80% as wide as it is tall; the
  copy column is everything left of it. Upright screens: the window on top (41% of the height at most), the words
  under it; short phones (≤ 720 px tall) tighten the type scale.
- Type is the site's: Noto Serif Display condensed caps with the italic accent, Archivo for labels and text. Ink on
  limestone; the accent is `--amber-deep`.
- The header's ink follows the ground (`data-bg` on the hero: light, then dark once the NEXORA card has closed).

## 4. Engineering (`src/scripts/hero/screen/`)

| File | What |
|---|---|
| `shader.ts` | ONE full-viewport fragment shader (GLSL 3). The lattice is a signed-distance field (stars + crosses) whose aperture size is a field: window A (circle ↔ arch morph, iris), window B (the next), the lens, `uBase`. A dead zone keeps nearly-shut stars shut. Thickness by parallax (the aperture's inner wall is lit or shaded by the sun); bevel and carved groove from the SDF gradient; plaster from a real scan (Poly Haven, CC0); sun patches from an offset outer lattice. Behind: `photo()` samples the moment with 4 fixed-point parallax steps on its depth map; beyond its edges, the same photo at mip 6 (the room, out of focus); the sun comes through the lattice onto it (`sunThrough`). The title card samples a five-panel atlas behind the letters. Khronos PBR Neutral tone map and sRGB in-shader. |
| `index.ts` | `World`: loads 5 photos + 5 depth maps + 2 plaster maps (with progress for the intro), builds the title atlas, computes the layout and publishes it to CSS, and maps the playhead to uniforms (`stage()`). The pointer drives the lens (first screen) and the lean (worlds). Held frames are not redrawn; the first screen's idle sun is drawn at 20 fps; a governor steps the resolution down if frames run long. |

Unchanged interfaces: `timeline.ts` (legs now 3.4 / 3.2 / 2.8 s), `input.ts`, `mask.ts`; `index.ts` imports `./screen`
instead of `./world`; `ui.ts` lost the scrim and gained the ground switch. The hero's JS is now three.js core + one
shader (no postprocessing, no cloth worker).

Media (`scripts/build-hero5.mjs`, manifest `src/data/hero5.json`, credits `media/hero5/SOURCES.md`):
frames pulled from 4K clips (hospitality 2.2 s, facilities 4.15 s) or photos; third-party marks painted out
(claim safety; `scripts/retouch.mjs`: each mark is masked by its ink, not by a rectangle, so the helmet's outline and
the wall behind a shoulder survive; refilled by solving Laplace's equation from the ground round it, with the ground's
grain put back; `.qa/pw/retouch-check.mjs` shows every patch before and after); a 0.9:1 crop round the action (the
windows are upright); the site's grade; a depth map from **Depth Anything V2 small**, run locally through
transformers.js in a child process
(`scripts/depth.mjs`; it bundles its own sharp, which cannot share a process with the project's). Output:
`public/media/hero5/<id>-{1400,900}.webp`, `-1400.avif`, `-depth.webp` (~1.1 MB for all five at 1400).

## 5. The intro

Limestone, not black: NEXORA tracks open on the real loading progress, a hairline under it, the five names cycling.
It ends by drawing the hairline in to a point, which travels to where the one-world circle will be and opens there
to exactly the circle's size, onto the first moment; then the intro's limestone gives way to the carved screen round
it. The circle is one object from the loader to the hero. (`src/components/Intro.astro`, `src/scripts/intro.ts`.)

## 6. Fallbacks

Reduced motion, Save-Data, no WebGL2 and no-JS: six ordinary sections on limestone, the same compositions — the
first moment in a circle, each world in an arch (CSS `border-radius` on the photo), the title card with a photo
through the word. `public/media/og.jpg` is the first screen (rendered by `.qa/pw/og5.mjs`).

## 7. Things that are easy to break

- **GLSL 3 reserved words**: `patch`, `sample`, `input`… are reserved; the shader will not compile (seen: `patch`).
- The shader is raw (`RawShaderMaterial`): declare `in vec3 position` yourself; tone mapping and sRGB are done
  in-shader, so do not turn on renderer tone mapping.
- Backticks inside GLSL comments close the template string.
- The copy follows `--arch-*`; if you move the window in `computeLayout()`, the words follow, but check phones.
- Removing packages leaves Vite's optimised-deps cache stale ("504 Outdated Optimize Dep"): `astro dev stop`,
  delete `node_modules/.vite`, restart.
- Headed Playwright with `--force_high_performance_gpu` uses the RX 5600M; without it Chrome may pick the integrated
  Radeon (test both).

## 8. QA (`.qa/pw/`)

`hero5-shots.mjs <tag> <profile> p…` (GPU stills at playhead positions; `HERO_POINTER=x,y` moves the pointer),
`motion.mjs` (real wheel input, screencast; `MOTION_QS=&stop=5` to start elsewhere; 7th arg = URL for the intro),
`static5.mjs` (the reduced-motion reading), `og5.mjs` (the social image), `hero5-audit.mjs` (every stop on eleven
screen profiles: the words fully on screen and clear of the window), `retouch-check.mjs` (the paint-outs).

## 9. Open

- The Held scene (after the title card) still shows the old diorama loop inside its moon; a still of the screen's
  circle would tie it to v5. The client's call.
- The five moments are licence-clean stock chosen for Qatar; the client's own photography of its people would be
  better still, and drops in through the manifest.
- Not tested: Safari/iOS and real phones (Chromium device emulation only).
