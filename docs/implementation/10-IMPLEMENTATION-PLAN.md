# 10 — Implementation Plan

Build order follows the context pack's priority (shell → hero static → hero motion → post-hero → optional
interactions → performance → reduced-motion/mobile → QA) with one change: **the media pipeline comes first**, because
every hero decision depended on measuring the real files.

| # | Milestone | Output | Done when |
|---|---|---|---|
| 0 | Media analysis + benchmark | findings in `04 §1–2` | ✔ joins, colour, hand-off and playback tech decided from measurements |
| 1 | Media pipeline | `scripts/build-media.mjs`, `public/media/**`, manifest | ✔ all derivatives built; originals untouched |
| 2 | Project shell | Astro config, tokens, base/type CSS, fonts, `Base.astro`, SEO, pre-paint mode script | blank page renders in both themes with correct type |
| 3 | Wordmark | `build-wordmark.mjs` → `wordmark.json`, `Wordmark.astro` | same vector in header, mask, footer |
| 4 | Header / footer / menu | components + `header.ts`, `menu.ts` | keyboard + touch usable, ink switches by theme |
| 5 | **Hero — static** | markup for six sections, no-JS / reduced-motion layout | readable, complete page with JS disabled |
| 6 | **Hero — renderer** | `renderer.ts`: canvas sizing, `fit(e)`, poster + video draw, underlay | overview looks right at 16:9, 16:10, 21:9, portrait |
| 7 | **Hero — timeline + loader** | `timeline.ts`, `loader.ts` | frames load in order with gating; unit-style checks of `u ↔ segment` |
| 8 | **Hero — state machine** | `index.ts`: follower, SETTLE, SCRUB, DIP, auto-settle, refresh/resize | scrub forward/back, fling, refresh mid-way, never blank |
| 9 | **Hero — UI + exit** | `ui.ts`, `mask.ts`, glyph, timecode, pause, Skip film, HD focus-settle | title card lands exactly; stage releases cleanly |
| 10 | Homepage sections | TitleCard, Workforces (static list first), Sectors, Process, Plate, Commitments, Doors | full homepage reads well with JS off |
| 11 | Deck + cursor | `deck.ts`, `cursor.ts` | drag / swipe / keys / buttons; list fallback |
| 12 | Subpages | services, industries, about, request, careers, contact, privacy, 404 | every nav link resolves; query-param pre-select works |
| 13 | Forms | `forms.ts`: steps, validation, preview mode, endpoint post | both flows complete by keyboard alone |
| 14 | Responsive + reduced-motion pass | fixes | viewports in `07` checked in the browser |
| 15 | Performance + a11y pass | fixes | budgets in `09` met; console and `astro check` clean |
| 16 | README | how to run, configure, regenerate media, what the client must supply | — |

**Status: all 16 milestones complete.** Added during the build: the footer motion toggle, `data-mode` on the hero,
and `/?nosettle`.

## Visual QA loop

The browser is open from milestone 2 onward. Every milestone ends with screenshots at 1440×900 and 390×844 at
minimum, and the hero milestones add 1920×1080, 2560×1080 and 820×1180, plus scripted scroll sweeps (forward,
reverse, fling, stop-mid-transition, refresh-at-depth).

## Open risks

| Risk | Mitigation |
|---|---|
| **Safari / WebKit cannot be run on this Windows machine.** | Only long-supported APIs are used; rVFC, `playbackRate` ramp, View Transitions, `lvh` all have guarded fallbacks. Flagged for a manual check on a real iPhone and Mac before launch. |
| iOS may refuse very high `playbackRate` during SETTLE | time-boxed at 1.6 s, then a single seek to the seam |
| iOS memory with 121 decoded frames | portrait frames are 512×640 (1.3 MB decoded each); far sequences released |
| Entry sequence is 10.8 MB | loads first and in order; gated playhead; lite mode on slow connections |
| Hospitality scene shows a sparkling pour | copy never names it; noted for the client in `06` |
| Process / commitments / no-fee line are promises the client must actually keep | marked *needs client confirmation* in `06`; all live in `src/data` for one-line edits |
| No form backend specified | endpoint-agnostic `FormData` POST; loud preview mode until configured |
| Typographic wordmark stands in for a logo | single generated file to replace |

## Definition of done

- The hero cannot be left in a half-state by any input sequence, network speed or refresh.
- With JS disabled, with reduced motion, and with a keyboard only, every piece of information and both conversions
  remain reachable.
- No sentence on the site states a fact that is not in `01_SOURCE_OF_TRUTH.md`.
- No original in `/media` has been modified.
