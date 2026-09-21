# What was built — session 3

Companion to `02-DIRECTION-V3.md` (the decisions). This is the engineering record: how each scene works, the
things that are easy to break, and what was measured. `00-DIRECTION.md` and `01-BUILD.md` describe session 2's
post-hero site, which the client rejected; their hero sections (§1 of 01-BUILD) still apply.

---

## 1. Stack changes

- **GSAP 3.15** (ScrollTrigger, SplitText, CustomEase — free since 3.13) and **Lenis 1.3**, the same stack as ERA
  Residence. `src/scripts/core/motion.ts` registers the plugins and defines the ONLY eases on the site (ERA's,
  read from its production script): `inOut 0.75,0,0.25,1`, `out 0.25,1,0.5,1`, `in 0.5,0,0.75,0`, `dive 0.6,0,0,1`.
  CSS mirrors them as `--ease-*`.
- `src/scripts/core/scroll.ts` runs Lenis from GSAP's ticker. **Boot order matters**: the hero's wheel listener is
  registered first (`initHero` before `initScroll` in `app.ts`) and Lenis ignores any event already
  `defaultPrevented` (`virtualScroll`). That is how the film keeps "one gesture, one world" while the rest of the
  page is smooth-scrolled. Verified: stops 0→6 on six gestures, the seventh scrolls the page.
- Sound: removed (`sound.ts`, its toggle and every call site).
- Fonts: Noto Serif Display (variable, `wdth` 62.5–100) and Archivo (variable, `wdth` 62–125) via Fontsource;
  Instrument Serif / Sans text faces and JetBrains Mono dropped. `.display/.h1/.h2/.h3/.cap` = condensed light
  capitals; `em` inside them = the italic accent. Labels = Archivo at `font-stretch: 125%`.

## 2. The overlap technique (why there are no seams)

Three scenes use a negative top margin of one viewport so they begin *over* the last screen of the scene
before, with a transparent pin whose ground is a shape:

| Scene | Overlaps | Shape | Hand-off |
|---|---|---|---|
| Held | the portal | none: its ground stays `opacity: 0` until its top reaches the top of the viewport, the moment the portal's dome covers everything | `data-ground` toggled by a ScrollTrigger at `top top` |
| Engagement | Sectors' last screen | a maroon arch (`clip-path: inset(... round ...)` driven by `--a`) | a limestone underlay appears behind the arch once pinned, because Sectors has gone |
| Candidates | Employers' last screen | a maroon circle | its pin gets pointer events only once the dome has opened |

A pinned scene's LAST frame always equals the next scene's FIRST frame (portal → sky, colonnade doorway →
limestone, footer arch). When changing a scene's ground, change both ends.

## 3. Scenes

| File | Mechanism | Notes |
|---|---|---|
| `scenes/portal.ts` | the hero is `position: sticky` inside `.opening` (100svh + 150svh); the dome's diameter/top are CSS vars on the pin; two phases (inOut rise, dive) | clouds are clipped to the same circle (`clip-path: circle(var(--d)/2 at …)`), otherwise they read as ash on black. The rim turns at 9°/s plus Lenis velocity. It also flags `data-bg` for the header. |
| `scenes/held.ts` | **the dive** (rebuilt after client review): the moon is a circle clip on a full-stage layer. Holding plays one timeline: the circle opens past every edge while the camera falls into the disc (zoom 1 → 3.4, rate → 6x) and amber streaks rush from the centre (canvas); five worlds iris open from the centre one after another (1.5 → 1.0 s each) as full-screen HD stills pushing in, each with its line set large; the disc irises back on top and pulls out to full spin; the answer at 8.95 s. Letting go collapses the circle back to the moon from wherever you are (0.95 s). | the timeline is `invalidate()`d on each press so a re-press mid-collapse opens from the current size. The raised disc carries its own night backdrop; the text layer sits above it (z 5). The header hides during the dive. |
| `scenes/workforces.ts` | one pinned stage: canvas knock-out (Path2D from `words.json`), then the photo's box is lerped from the stage to the front card's box | the card crop is made by `build-stock.mjs` with the same maths as CSS `object-position`, so the swap to the real card is invisible. Scrolling back resets the deck (`nx:deck-reset`) so card 1 is again the photograph. The deck layer must keep `z-index: 1` or the cards paint over the morph. |
| `deck.ts` | session 2's physics, unchanged | the whole stage's `--ground` follows `data-sector` |
| `scenes/sectors.ts` | cloud bank driven by the section's arrival (it starts BELOW the section edge so the deck stays clear); gate; city; scale-out; ten steps PLAYED on change | names are split words-then-chars (SplitText) so long names never break mid-word; long names get `data-long`. A visually hidden `h3` per sector carries the name for no-JS and screen readers. |
| `scenes/engagement.ts` | `--a` opens the arch; the track translates by `scrollWidth − innerWidth`; photos drift ±9% against their arches; the doorway overlay is lerped from the door's end-of-walk box to beyond the screen | the header flips to dark ink once the doorway is past 60% open |
| `scenes/expect.ts` | per-line reveal on `top 86%` (chars: opacity, yPercent 50, rotateY 90) | the longest line is allowed to balance-wrap (`max-width: min(84vw, 20em)`) |
| `scenes/employers.ts` | photo box: small window → full → left column; steps PLAYED: six blinds slide in with a stagger | the sky layer's opacity var is `--sky-o` (never reuse a colour token's name) |
| `scenes/candidates.ts` | pin scrolls up (dome rises by itself), then the portal's dive | |
| `scenes/footer.ts` | `--c` 0→1 clips the photo to the arch; `--show` scales the content in | desktop only (≥ 900 px); on phones the arch is static. After limestone pages a tinted cloud bank lifts off the photo (`from="sand"`). |
| `pagehead.ts` | subpage arch photo opens to full bleed between `top 95%` and `top 15%` | |
| `cursor.ts` | see §4 | |
| `intro.ts` | real loading progress as before; ending: hairline draws in → a lit aperture (`mask-image: radial-gradient`) breathes then dives, film settles 1.14 → 1 | runs on every load. Timed in page: opens ~6.6 s, gone ~8.5 s. |

## 4. The pointer

noho.ink's model (read from its bundle): a disc re-aimed at the pointer every frame, no spring. Ours:
`k = 1 − e^(−dt/0.085)`, snapping the last 0.1 px, so it keeps up with fast movement and lands exactly. Looks are
resolved from `elementFromPoint` on move **and after every Lenis scroll** (content moves under a still pointer).
The disc is laid out at 96 px and scaled, so every size is sharp. Tag anything with `data-cursor="Word"` for a
labelled circle, `"hold"`, `"Drag"`, or a numeral. Removed for touch, coarse pointers and reduced motion.

## 5. Media

- `media/stock/` — 28 licence-clean originals (Unsplash License; credits and source pages in `SOURCES.md`). Chosen
  for Qatar: no alcohol, modest dress, no construction. `npm run stock` grades them to one look (saturation 0.86,
  warm cast, lifted blacks) at 800/1400/2400 plus 4:5 crops at 640/960.
- `media/clouds/` — client-supplied. `npm run clouds` makes WebP derivatives and copies of the two cloud banks
  tinted (RGB multiplied) to limestone and sky, so a bank's solid body is exactly the ground it dissolves into.
- Hero: the four world-to-world clips were replaced by the client's upscaled versions (2560×1440, 120 frames each) and rebuilt with `npm run media:force`; the manifest now says 120. World copy arrives at 62% of a leg (was 90%), i.e. as soon as the divider wall has cleared, while the camera still moves (`hero/ui.ts`).
- Hero: `ENTRY_START_FRAME` 44 → 20 (one second earlier, brief #3); cross-fade 200 → 340 ms because frame 20's pose
  is still legible.

## 6. Bugs found on the way

- `?nointro` never worked: `Base.astro` contained a literal backspace character (0x08) where `\b` was intended in
  the regex. Fixed.
- `String.replace` with a replacement containing `$$` inserts a single `$` — two `$$(` helper calls were silently
  broken by a scripted edit and caught by `astro check`.
- The Astro dev server served stale scoped CSS twice after edits (as in session 2). Restart it before debugging a
  style that "didn't apply".

## 7. Measured

`npm run check` 0 errors · `npm run build` 9 pages · JS ~79 KB gzipped (GSAP + SplitText + ScrollTrigger + Lenis
≈ 60 KB of it) · CSS ~19 KB gzipped.
