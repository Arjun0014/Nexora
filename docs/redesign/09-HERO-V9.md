# The hero, version 9: the doorways open onto films

Branch `hero-v4` (still off `main`). v9 keeps v8's turning court and its upright framing (`08-HERO-V8.md`) and puts
the client's five films behind the doorways.

## 0. What the client said (24 Sep 2026)

1. "I have added 5 vertical videos to the media folder under hero-new. I want to use these videos for what's behind
   the doors in the main hero section: the videos keep on playing full time in each door, even while rotating, and
   even when scrolled and focused, the video plays in loop."
2. "The first loading screen should work as a place to load all these 5 videos and assets required in the hero
   section, so even if loading takes a little more time, all the videos and assets must be loaded properly."
3. "Be careful about placing the videos in the door: it must be placed right, not zoomed out or in."

## 1. The films

The originals are in `media/hero-new` (client-supplied, never modified). `scripts/build-hero9.mjs` builds them into
`public/media/hero9` from the manifest `src/data/hero9.json`:

| World | Source | Length (loop) | 720 | 540 |
|---|---|---|---|---|
| Hospitality | a receptionist at a hotel desk, on the phone, a guest signing in | 17.8 s (17.0) | 2.6 MB | 1.2 MB |
| Events & Promotions | hosts signing guests in, lanyards and badges | 18.4 s (17.6) | 2.9 MB | 1.4 MB |
| Facilities & Support | a crew in orange overalls cleaning an office kitchen | 25.2 s (24.4) | 3.5 MB | 1.7 MB |
| Specialist & Technical | a welder at his bench in a dim workshop | 44.8 s (44.0) | 6.4 MB | 3.1 MB |
| Recruitment & Workforce | two candidates smiling across an interview table | 10.7 s (9.9) | 1.4 MB | 0.6 MB |

- **9:16.** Four sources are 1080 by 1920; the technical one (1080 by 2048) is cut to 9:16 round its centre (3% off
  the top and bottom: lamps and floor).
- **One look.** The grade of `build-hero5.mjs` (a little less saturation, warm gains, the blacks set down), applied in
  RGB with BT.709 kept end to end (an identity grade measures 44.9 dB against the source: no matrix shift).
- **A seamless loop.** Every source's first and last frames differ (SSIM 0.40 to 0.53: a hard cut at every loop). Each
  film now starts 0.8 s in and its last 0.8 s dissolves into those first 0.8 s, so it runs on through the seam.
- **Encoding.** H.264 High, 25 fps, CRF 23 (720 by 1280) and 25 (540 by 960), `aq-mode=3`, 2 s GOP, `+faststart`, no
  sound. Plus a poster per world (`<id>-poster-{1080,720}.webp`, the same cut and grade) for the static reading.

## 2. The doorway, cut to the film

A 9:16 film in v8's opening would have been either zoomed in or zoomed out. That opening, seen from its stop, is
0.84:1, so a film fitted as `cover` loses a third of its height; fitted as `contain`, it leaves bands either side. So
the doorway is now cut to the film.

- **Its shape.** A tall pointed arch, 4.8 m wide, apex 8.66 m, the arch rising 0.55 of the span. The apex is not
  chosen but computed (`apexFor`, `court/scene.ts`), so that the camera at the doorway stop sees exactly 9:16 of the
  world beyond. The ring wall rose from 9 m to 10.2 m to take it, and the dome with it. The first screen's low sun rose
  from 0.38 to 0.425 rad, so the wall at our back still throws the same 22.5 m of shade over the floor.
- **What the stop sees.** The opening is a tunnel (the reveal is 1.5 m deep), and its FAR edge is what frames the view
  beyond. v8 measured from the face, which overstated the view by about 16%. The floor cuts the view at the bottom, and
  the film's foot stands on it. `fitFilms()` hangs each film to exactly that window plus 2%, so a lean of the pointer
  never finds an edge. The film keeps its own shape: nothing is lost but the two top corners the arch itself hides
  (about 6% of the frame: ceiling, lamps, the top of the RECEPTION letters). Upright screens stand their camera
  elsewhere, so the films are refitted when the layout changes.
- **The stops.** Wide: 11.4 m back, pitched up 11.5 degrees. The doorway stands from a tenth of the height to its foot
  at 86%, where v8's foot was, so the words still clear the ring of names. Upright: level, 10.7 m back, eye at 1.52 m,
  a 74 degree lens. The arch sits under the header and its foot at about 58%, which leaves a two-line title room above
  the ring.
- **On screen.** 1440 by 900: the film is about 373 by 617 px. iPhone 13: about 179 by 318 px. Between two doorways
  and across the court the opening looks past the film's edge into its room, as a doorway does.

## 3. Always playing

The films play all the time: while the court turns, while the camera travels, at the doorway, and on the title card
(the NEXORA letters now show the five films). They hold only while the court cannot be seen (scrolled away, a hidden
tab), and go on when it can.

- **Drawn every frame.** v8 stopped redrawing a still doorway; a playing film is never still. The films are mipmapped
  video textures, so a doorway seen across the court does not shimmer.
- **Light, not stone.** The sun stands behind the doorway at its stop, so its shafts (the godrays) poured over the film
  and washed it milky. A film writes a clear alpha (`NoBlending`; everything else in the court is opaque), and the post
  chain uses it: over a film only 20% of the sunbeams' haze is kept (`?fr=`), and no traced bounce light or occlusion.
  Its blacks are black again.
- **Seen, as far as the browser knows.** Chrome throttles a video it thinks no one sees. Measured: a video stacked,
  clipped, covered or 2 px wide plays with its clock at about 40% speed and drops most of its frames. The five
  `<video>`s stand side by side, 8 by 14 px, fixed in the viewport's bottom corner over everything, at 1% opacity
  (`filmHost()`, `hero/films.ts`).
- **The GPU is shared.** The films' decoder shares the GPU with the court, and a court that keeps the GPU saturated
  starves it. Measured on an RX 5600M: the top tier at 1920 by 1080 shows the films 42 to 46% of their frames; the
  medium tier, 100%; the top tier at 1440 by 900, 100%. Hence:
  - the court is drawn at most about 60 times a second (every other frame of a 120 Hz screen, so evenly; `?fps=`);
  - the top tier is chosen only for canvases up to 1.6 million pixels (`?px=`);
  - a watch (`watchFilms`): every 1.5 s the frames the films showed are counted against their 25 fps, and short
    (under 85%) twice running, the court steps down a tier. It stands aside while the intro is up, since the intro's
    own full-screen compositing loads the GPU. The frame-time governor now waits for the intro too.
- **iOS in Low Power Mode** refuses playback without a gesture: the films hold their first frame and start at the first
  touch, click, key or wheel (written; not run on a device).

## 4. The intro loads it all

The intro no longer opens on a timer. v8 forced it open at 7.5 s whatever was still loading; now it holds until
everything the court needs is in:

| Share of the bar | What |
|---|---|
| 64% | the five films, by their bytes (they start downloading the moment the hero starts, alongside three.js) |
| 6% | the court's code (three.js) |
| 30% | the court's textures and sky, then its shaders compiled |

- Each film is downloaded whole into memory (a blob), so a loop never waits on the network. A download that receives
  nothing for 15 s is restarted once; a film that still cannot be had is replaced by its poster, so the court always
  opens whole.
- The films start playing behind the intro as soon as the court is ready, so they are already running when it opens.
- The bar shows 99% until the court is done. It never runs ahead of the real progress, and never faster than the
  intro's 5 s minimum.
- There is no upper bound. The intro gives up only if the progress stops altogether for 45 s (counted in ticker time,
  so a hidden tab does not count), and then opens onto the static reading.

Measured (Chrome's network throttling, `.qa/pw/intro9.mjs`): production build at 50 Mb/s, open at 11.2 s; at 20 Mb/s,
19.9 s; dev server at 6 Mb/s, 51.8 s. Every time, all five films were drawable when it began to open, and playing once
it had.

## 5. The static reading

Reduced motion, Save-Data and no JS: each world's arch shows its film's poster in the doorway's own shape (9:16, the
top a half-ellipse 0.55 of the width tall). Nothing plays and no film is downloaded. The static title card's word shows
the facilities poster. The court's still (`public/media/hero6`) and the social image (`og.jpg`) were regenerated from
the live court (`.qa/pw/stills.mjs`).

## 6. Engineering notes (on top of 08)

| Where | What |
|---|---|
| `scripts/build-hero9.mjs`, `src/data/hero9.json` | the films and their posters, above |
| `hero/films.ts` (no three.js) | `loadFilms` (whole-file fetch with byte progress, stall restart, poster fallback), `filmHost`, `filmSize` (720, or 540 on small screens and the low tier), `Reel` (play and pause together, their pace, the gesture retry) |
| `hero/index.ts` | starts the films at once; the intro's progress weights; the films roll once the court is ready; the 60 fps cap |
| `court/scene.ts` | `FILM`, `coneAt`, `apexFor`, the wall and dome raised, `COURT.upStop`; `fitFilms`; each room's film on a unit plane (and its room a unit box), marked for the post chain |
| `court/index.ts` | video textures (mipmapped; `?fm=0` turns the mips off), the film mask in the post chain, the films on the title card, the stops' new framing, `watchFilms` and `stepDown`, the pixel budget in `tierFor` |
| `intro.ts` | holds for `done`; the stall give-up in place of the 7.5 s limit |
| `Hero.astro`, `worlds.ts` | the static reading's posters in 9:16 arches; each world's `moment` (its film, for screen readers) and the court's `alt` rewritten |
| `.qa/pw/hero9-shots.mjs`, `films9.mjs`, `intro9.mjs`, `perf9.mjs` | stills with the films' state; the films' real pace through a visit; the intro against a throttled network; frame and film rates |

QA switches added: `?fps=` (the court's frame cap), `?fs=540` or `720` (the films' size), `?fm=0` (no film mipmaps),
`?px=` (the top tier's pixel budget), `?fr=` (the sunbeams kept over a film), `?back=` and `?pitch=` (the wide stop),
`?uback=`, `?ueye=` and `?ufov=` (the upright stop).

## 7. Checked

- Layout audit, every stop on all eleven profiles: all clear (`hero5-audit.mjs`).
- The films: five of five loaded and playing; at the doorway and in motion, 93 to 101% of their frames once the court
  has settled its tier (`films9.mjs`, in Playwright's Chromium and in Google Chrome, dev and production).
- The intro: the throttled runs above, all PASS.
- `tsc` clean; `npm run build` clean (the three.js chunk's size warning, as before).

## 8. Open

- **The machine was not quiet while this was measured.** Another Chrome was using about 18% of the GPU throughout.
  Under that load the court stepped down further (to low) a few seconds after the intro, and on the first screen the
  films ran at 75 to 90% of their frames until it did. Quiet, the same tiers measured 100%. Worth a look on the
  client's machines.
- The top tier is no longer used on screens past 1.6 million pixels; it could return with a cheaper traced light.
- Phones and Safari are untested on real devices: five 540p films decoding next to the court on a phone GPU, and iOS's
  Low Power Mode path.
- Weight: on large screens the films are 16.7 MB of the hero's 21 MB or so. The technical film alone is 6.4 MB (44 s):
  cut to 20 s, or encoded at CRF 25, the wait at 20 Mb/s would shorten by several seconds.
- The films' licences: client-supplied; they look like stock footage, so confirm the licences before launch.
- The v8 photographs (`public/media/hero5`, `scripts/build-hero5.mjs`) are no longer used by the hero; kept for now.
