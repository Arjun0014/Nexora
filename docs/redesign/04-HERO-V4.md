> **Superseded by `05-HERO-V5.md`** (the client rejected v4's night world: too dark for the company, names badly
> placed, 3D that did not look real). Kept as the record of what v4 was and why it failed.

# The hero, version 4: five moments held in time

Branch `hero-v4` (from `main`, 22 Sep 2026). Replaces everything in the hero **before** the NEXORA title zoom: the
rotating diorama loop and the five transition videos. The NEXORA knock-out zoom, the title card and every scene
after it are unchanged (`src/scripts/hero/mask.ts` is untouched; the Portal still scales `[data-media]`).

Reference studied: why.zero.university (a real-time three.js film in five stages: GLB hands, painted plates,
text baked into atlases, particles, bloom/grain/lens blur, draw-a-zero and hold gates). What was taken from it is
the *medium*: a live 3D film you move through, not a video you scrub. The content is Nexora's own.

---

## 1. The idea

The old hero's device, "time stops, the camera moves", becomes interactive. Five moments of service float over
night water, frozen in time, each one carried out by hands we cannot see:

| # | Moment | What is frozen in the air | Light |
|---|---|---|---|
| 01 | Hospitality | a brass dallah tipped over a porcelain finjan, the gahwa a stream of light, beads, a crown of drops, cardamom | amber |
| 02 | Events & Promotions | a lanyard flung in a loop, the HOST badge turning, foil confetti mid-burst, a stage beam | violet |
| 03 | Facilities & Support | a linen sheet shaken out over a bed (a real cloth simulation), dust in a shaft of light | teal-white |
| 04 | Specialist & Technical | two cable ends reaching for each other, sparks frozen between them, a spanner, bolts | steel + orange |
| 05 | Recruitment & Workforce | papers lifted into the air, a pen with no hand on it writing an offer's signature in ink of light | cyan |

**Scroll moves time.** One gesture plays one leg: the moment you are at finishes (the pour lands, the sparks
fly), the camera turns and walks through the lattice wall into the next room, glimpsing the Doha skyline across
the water on the way, and the next moment arrives still moving and freezes on its key frame. **Stop, and
everything stops**: the water goes glassy, the dust hangs, a ring of the world's colour runs out across the dial.
**The pointer moves the camera** around the frozen moment (bullet time), and time trembles under it: frozen drops,
confetti, sparks and dust drift a little way along their paths near the pointer.

The five moments hover above **the dial**: an engraved bronze plate like an astrolabe (rings, a tick limb, a
ten-point rosette, five sector lines, each world's colour arc, the names set around the rim). It is the "one world"
of the opening line, it echoes the diorama's disc, and it is the instrument the Held scene lifts out of the moon
further down the page. It turns while the world is seen whole (clockwise, once in 72 s, as the diorama did). On
the first gesture it turns like a turntable presenting a dish and stops with Hospitality facing the camera as the
camera comes down; the lattice walls rise out of it to make five rooms.

The people are the point and are never shown: the payoff is the title card that was already there, *NEXORA — The
people behind smooth operations.*, now with the lit dial showing through the letters.

Claim safety is unchanged: the badge says HOST, the papers say OFFER / CANDIDATE / INTERVIEWS / ONBOARDING, no
names, numbers, clients or logos beyond Nexora's own.

## 2. Film structure (unchanged interface)

`src/scripts/hero/timeline.ts`: stops 0 (the dial) → 1…5 (the moments) → 6 (title card), legs of 4.6 s (the
dive), 4.0 s (between moments) and 2.8 s (the exit, during which the NEXORA mask closes exactly as before).
`input.ts` (one gesture = one leg, queueing, trackpad inertia, touch, keys) and `ui.ts` (which copy block is on)
are the session-2 modules, untouched in behaviour. `index.ts` is the same state machine minus everything that
served video (loop, frame sequences, rest stills, HD settle, starve/dip).

In the live film the world's name stands in the scene as monumental letters, so the page copy for a moment is a
caption at the foot of the frame (number, one line, link); the `h2` stays in the DOM for readers. The overview
keeps its headline, bottom left.

## 3. Engineering (`src/scripts/hero/world/`)

| File | What |
|---|---|
| `index.ts` | `World`: renderer, post chain, build, camera choreography, per-frame state. Everything drawn is a pure function of the playhead `p`, plus four continuous values: the ring's angle, the ambient clock, the pointer rig, the lens |
| `env.ts` | sky (gradient), stars (points), the West Bay skyline (canvas: the dome-topped tower and the hourglass tower drawn by hand), water (a `Reflector` with its own shader), the lantern (point light + halo), lattice screens (an 8-point star lattice in the fragment shader, discarded holes), dust |
| `dial.ts` | the engraved plate (two canvases: plate and emissive inlay; canvas angle = ring angle) and the freeze ripple |
| `tableaux/*.ts` | the five moments. Each exports `pose(a)` for its action a ∈ [0, 1], key frame 0.5; particles are analytic (position = f(time since spawn)), so any `a` shows exactly, forward or back |
| `sheet-sim.ts`, `sheet.worker.ts` | the linen: a 34×30 Verlet cloth held at two corners, shaken by the hands, with gravity and air drag along the normal, recorded at 40 fps; runs in a worker. The key frame (34) was chosen by eye from a contact sheet (`.qa/pw/sim-keys.mjs`) |
| `words.ts` | the names: drawn once in the display face, cut into one quad per glyph, turned in on X with a stagger (the site's SplitText vocabulary, in 3D) |
| `materials.ts`, `kit.ts` | brass / porcelain / lacquer / chrome / "liquid light"; tubes with varying radius and rotation-minimising frames, ribbons, canvas textures, seeded random |

Camera: poses are defined in the ring's frame and interpolated in cylindrical coordinates (`orbitLerp`), so moves
read as orbits. Between moments the camera swings in through the wall and turns to look along its path, so it
meets the lattice face-on; on the dive the ring's turn completes by 70% of the leg and the aim takes its own
shortest path. Light: one follow spot carried between the moments' key lights by focus weight, a moonlight for the
whole-ring view, the lantern, a hemisphere fill.

## 4. Things that are easy to break

- **No MSAA.** `EffectComposer` multisampling + the mipmap bloom rendered a **black canvas** on an AMD integrated
  GPU (ANGLE/D3D11); headless Chromium (SwiftShader) rendered it fine, so software screenshots hid it. Edges are
  SMAA in its own pass. Test visual changes in a real GPU window (`.qa/pw/gpu-*.mjs`), not only headless.
- **The light count must never change.** Hiding a group that contains a light makes three.js recompile every
  program (a 1 s stall mid-film). A moment's own lights are handed to the world (`Tableau.lights`) and live in the
  ring.
- **Compile against the composer's buffer.** Program variants depend on the render target (linear into the
  buffer, sRGB onto the screen). `compileAsync` with no target compiled the screen variants and the first real frame
  compiled everything again (3.5 s).
- Do not add `/// <reference lib="webworker" />` to the worker: it swaps the DOM's event types for the whole
  project.
- Hidden-at-start objects (screens, names, later parts of a moment) are made visible for the compile, then put back.

## 5. Measured (AMD Radeon integrated, 1440×900, DPR 1, Chromium)

- 60 fps through the dive and the transitions (p90 16.8 ms); frozen frames are not redrawn at all.
- World ready ~4.8 s after navigation, inside the intro's minimum 5 s; the longest main-thread block is ~0.8 s
  (reflection map), at the start of the intro. Timings per stage: `window.__hero.world.timings` with `?qa`.
- The 3D chunk (three.js + postprocessing + the world) is **241 KB gzipped**, loaded lazily after first paint; the
  main bundle is unchanged (~83 KB).
- A governor steps the resolution down (to 0.7) if the median frame runs over 23 ms; quality tiers by device
  (`high` desktop, `medium`/`low` phones).

## 6. Fallbacks

Reduced motion, Save-Data and no-JS render six ordinary sections with **stills rendered from the world itself**
(`.qa/pw/stills.mjs` on a GPU → `scripts/build-hero4.mjs` → `public/media/hero4/`), the names set as text. No WebGL2,
or a failure starting the world: the page drops to that static reading. `public/media/og.jpg` is the dial.

## 7. QA tools (`.qa/pw/`)

`hero-shots.mjs` / `film-sheet.mjs` (headless, park the playhead anywhere with `?qa` → `__hero.set(p)`),
`motion.mjs` (real GPU + real wheel input, recorded via screencast), `perf.mjs`, `timings.mjs`, `pointer.mjs`,
`touch-film.mjs` (phone, raw finger swipes: one swipe per leg, then the page scrolls), `stills.mjs`, `sim-keys.mjs`,
`static-hero.mjs`, `gpu-debug.mjs`. Verified: 0 cut-off text on desktop, iPhone and tablet (`audit-cut.mjs`).

## 8. Open

- The Held scene (after the title card, kept as it was) still shows the diorama loop inside its moon. It reads as
  "the world, held", but a render of the new dial would tie it closer. The client's call.
- `public/media/hero/seq/` (53 MB of frames) and the non-HD rest stills are no longer used by the hero; Held still
  uses `loop-960.mp4`, `poster-960.webp` and `rest/*-hd|-m.webp`. Delete the frames once v4 is accepted.
- Not tested: Safari/iOS and real phones (Chromium device emulation only), and discrete GPUs other than this one.
