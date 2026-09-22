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
| `scenes/held.ts` | everything on ONE canvas. At rest: the moon (the loop, feathered into night). Held: act I (session 3, approved) lifts the circle inside an instrument dial and parts it into five slices, each world's HD still inside. Act II/III (session 4, §8): the slices lock, a girih inks over the disc as a medallion of five rings (one per world, name and people engraved), the rings turn and then lock gold from the centre out; act IV opens the disc again with the answer. Letting go tweens every parameter back to rest. | the pattern is a baked bitmap turned per ring (`scenes/lattice.ts`); ring angles are pure functions of time; `?qa` exposes `__held.at(t)`. Sources load only when the scene is near. |
| `scenes/workforces.ts` | the deck: the ground is the active card photo blurred 48px and darkened; the world name sits IN FRONT of the card across its lower third (session 4) and turns over (SplitText) on each throw. One pinned stage: canvas knock-out (Path2D from `words.json`, always whole at rest, drifting to the O), the photograph with "Who we supply." over it, then the photo's box is lerped from the stage to the front card's box | the card crop is made by `build-stock.mjs` with the same maths as CSS `object-position`, so the swap to the real card is invisible. Scrolling back resets the deck (`nx:deck-reset`) so card 1 is again the photograph. The name stays hidden until the card lands. |
| `deck.ts` | session 2's physics, unchanged | the whole stage's `--ground` follows `data-sector` |
| `scenes/sectors.ts` | cloud bank driven by the section's arrival (it starts BELOW the section edge so the deck stays clear); gate; city; scale-out; ten steps PLAYED on change | names are split words-then-chars (SplitText) so long names never break mid-word; long names get `data-long`. A visually hidden `h3` per sector carries the name for no-JS and screen readers. |
| `scenes/engagement.ts` | `--a` opens the arch; the track translates by `scrollWidth − innerWidth`; photos drift ±9% against their arches; the doorway overlay is lerped from the door's end-of-walk box to beyond the screen | the header flips to dark ink once the doorway is past 60% open |
| `scenes/expect.ts` | per-line reveal on `top 86%` (chars: opacity, yPercent 50, rotateY 90) | the longest line is allowed to balance-wrap (`max-width: min(84vw, 20em)`) |
| `scenes/employers.ts` | photo box: small window → full → left column; steps PLAYED: six blinds slide in with a stagger | the sky layer's opacity var is `--sky-o` (never reuse a colour token's name) |
| `scenes/candidates.ts` | pin scrolls up (dome rises by itself), then the portal's dive | |
| `scenes/footer.ts` | `--c` 0→1 clips the photo to the arch; `--show` scales the content in | desktop only (≥ 900 px); on phones the arch is static. After limestone pages a tinted cloud bank lifts off the photo (`from="sand"`). |
| `transition.ts` | page changes: a maroon circle with a lit rim opens from the click point, the destination name rises, then navigation; the next page starts covered (pre-paint flag in sessionStorage `nx-pt`, name passed as a CSS string var) and the cover lifts as a dome. Links are prefetched on hover (`prefetch` in astro.config). The browser's cross-document view transition is off. | measured: production subpages paint in ~0.2 s; the dev server takes ~4 s (unbundled modules), which is what made navigation look frozen. |
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

---

## 8. Session 4 (22 Sep 2026): the client's five points

**1 · Workforces gate.** The café photo (a server's hands with coffee and cake) is replaced by a doorman in a grand
lobby with gold lattice screens (`A1-hospitality-2`, cottonbro studio, Pexels License; see `media/stock/SOURCES.md`).
After the fly-through, "Who we *supply.*" rises over the photograph (played like Sectors' line, which it pairs with)
with the five workforces along its foot, Hospitality lit: lower left on wide screens (the doorman stands just right
of centre), centred on an upright phone. The hold is longer (`Z_END 0.44`, `M_START 0.6`, section 470svh). The gate
word is now always whole at rest (`k = min(byW, byH)`; it used to take the larger scale and crop "WORKFORC"), and the
camera drifts to the O as it closes in. Same for SECTORS.

**2 · Deck names in front.** The world's name moved from behind the stack to in front of it, across the card's lower
third — the Sectors index's device: one copy on the ground, a second copy clipped to the card (`clipOver`) with a
shadow. It stays hidden until the card lands, then turns in letter by letter as on every throw.

**3 · The hold, second act.** Act I (lift, dial, five slices) is unchanged. After it (`scenes/held.ts`, geometry in
`scenes/lattice.ts`):
- the pattern is a Penrose rhomb tiling from a wheel of ten Robinson triangles (five-fold like the disc; its axis
  sits on the first seam) dressed with Hankin strapwork at 72°: a girih of ten-point stars and decagons.
- It is drawn ONCE into a bitmap (generation 7, white lines) when the scene comes near, in idle time; each ring is
  that bitmap turned, clipped to its annulus and tinted (`source-atop`) on a layer; a quarter-size copy of the layer
  is the bloom. Stroking the paths per ring per frame ran at 5–8 fps; the bitmap runs at 60.
- The rings' angles are pure functions of the timeline's time (`SPIN`/`FIELD` integrals, `ringTurn`, `LAND`), so the
  hold can be seeked for QA (`?qa` → `__held.at(t)`) and released at any moment. Each lock lands on the next
  alignment in the ring's own direction with a back-out overshoot; `nameAt` puts every name at the top when locked.
- Timings: set 2.2 · rings wake 2.7 · locks 5.75 + 0.16k (0.66 each) · locked 7.05 · answer 9.2.
- Found on the way: `--hold` was set on `<html>` every frame of the hold, restyling the whole document (the old hold
  had the same jank). It now lives on the pointer element. Median frame 16.7 ms during a real hold (GPU, Chromium).

**4 · Cut-off text.** A DOM audit (`.qa/pw/audit-cut.mjs`: text partly on screen but cut by the viewport or by a
clipping ancestor) across 11 profiles found: hero titles clipped by their line masks (`.lines > .l` clipped both
axes; now `overflow-y: clip` only, and title lines never wrap); What to expect's ribbon at `width: 100vw` widening
the grid column past the screen, and its footnote numerals set outside the line box; sector names with a long word
on phones (now capped by their longest word: `--w`); the engagement intro wider than the rising arch on phones.
All profiles report zero now, subpages included.

**5 · Mobile.**
- The real breakage: html was `overflow: visible`, so body's `overflow-x: clip` was handed to the viewport and
  clipped nothing; the Sectors cloud bank (2400 px) widened the phone's layout viewport to 1395 px — innerHeight
  read 2376, and every pin measured the wrong screen. `html { overflow-x: clip }` keeps body's own clip in force.
- The moon (and the hold button) had `touch-action: none` and pressed on touch-down, so any swipe starting on it —
  most of a phone's screen — became a press and the page stuck at the Held scene. Now `pan-y`; a touch press waits
  170 ms without travel, and once holding, touchmove is cancelled so the page stays put.
- Phones on their side got the portrait phone layouts squashed into 390 px of height. Scene phone layouts are now
  `(max-width: 899px) and (orientation: portrait)`; landscape phones get the desktop layouts, with compact rules
  under `(max-height: 519px) and (orientation: landscape)` for Held (line left, moon right), the deck, the Sectors
  index and Employers (whose script now decides "narrow" the same way).
- The address bar sliding away no longer triggers `ScrollTrigger.refresh()` (`ignoreMobileResize`, and the site's
  own listener ignores small height-only changes on coarse pointers); the medallion bitmap is not re-baked for it.
- QA with Playwright device profiles and raw CDP touch events (`.qa/pw/`): the tour swipes from the hero to the
  footer; `touch-hold.mjs` checks that a swipe on the moon scrolls and a long press holds.
