# 09 — Performance and Accessibility

## Performance budget

| Metric | Budget | How |
|---|---|---|
| HTML + CSS + JS to first paint | < 90 KB gz | no framework runtime, inlined small CSS |
| LCP (desktop / 4G phone) | < 1.8 s / < 2.5 s | LCP element is the **poster**, 118 KB WebP, preloaded with `fetchpriority="high"` and drawn into the canvas from the same cached bytes |
| CLS | 0 | hero mode decided pre-paint; every image has `width`/`height`; fonts use size-adjusted fallbacks; deck panel height reserved |
| INP | < 100 ms | no long tasks: frame decode is off-thread (`img.decode()`), one canvas draw per RAF, passive scroll listeners |
| First-viewport network | < 1 MB before the loop streams | poster + fonts (2 files, ~60 KB) + CSS/JS |
| Main-thread work per scrub frame | < 4 ms | measured 0.6 ms draw for a decoded frame |

### Loading order (desktop)

1. HTML (inline critical mode script) → CSS → poster + two font files (preloaded).
2. `DOMContentLoaded`: hero draws the poster; loop `<video preload="auto">` starts streaming; 5 rest stills requested
   at low priority.
3. Entry frames requested in order, 6 at a time, `fetchpriority="low"` so they never compete with the loop.
4. Everything below the hero: images `loading="lazy" decoding="async"`, AVIF → WebP via `<picture>` with `sizes`.
5. Later sequences load one world ahead of the user (`04 §6`).

Nothing below the fold is fetched until the browser decides to; the deck's five card images are ~55 KB each (AVIF).

### Things that keep it smooth

- One `<canvas>` for the whole film; backing store capped at 1920 px wide and DPR 2.
- Only `transform` and `opacity` animate in the DOM. No `filter`, no `backdrop-filter`, no animated `box-shadow`.
- The surround is a wash stretched from a 48×27 copy of the frame by the GPU, not a CSS/canvas blur.
- RAF loops stop when there is nothing to do (hero out of view, pointer idle, tab hidden).
- `content-visibility: auto` on the long paper sections.
- The video is paused whenever the hero is not in overview state or is off-screen.
- Small screens release frame sequences more than two worlds away.

### Network adaptation

`Save-Data` or `effectiveType ∈ {slow-2g, 2g, 3g}` → lite hero (stills + DIP, ~1 MB total).
Any sequence that has not arrived by the time it is needed → DIP to the rest still; the film never shows a blank,
a half-loaded frame, or a spinner.

## Accessibility (target: WCAG 2.2 AA)

### Structure
- Landmarks: `header`, `nav`, `main`, `footer`; every section `aria-labelledby` its heading.
- One `<h1>` per page. In the hero the H1 is the overview headline; the five worlds are `<h2>`.
- Skip link is the first focusable element; on the homepage it lands **after** the film.
- Reading order in the DOM is the narrative order regardless of visual stacking.

### The film, for people who do not see or cannot use it
- All hero copy is real text and is always in the accessibility tree — inactive copy blocks are hidden with
  `opacity` and their links get `tabindex="-1"`, never `visibility`/`display`/`inert`, so a screen reader reads all
  six sections in order without scroll-scrubbing while keyboard focus can never land on something invisible.
- The canvas is `role="img"` with a description that changes with the active world (e.g. "A waiter frozen mid-pour at
  a candle-lit table").
- **Skip film** and the five wedge buttons give keyboard users full control; focus is never trapped in the stage.
- Keyboard scrolling works because scroll is native.

### Motion and vestibular safety
- `prefers-reduced-motion` yields a fully static alternative (`05`), decided before first paint and observed live.
- No flashing; the DIP is a 220 ms luminance fade, well under flash thresholds.
- The idle loop is a slow, constant rotation (24°/s). Because it auto-plays for more than 5 s, a **pause control** is
  provided (WCAG 2.2.2): the timecode's ▮▮ / ▶ button pauses and resumes the loop.

### Colour and contrast
- Body text ≥ 7:1 on both surfaces; secondary text ≥ 4.5:1; sector accents are used on dark only, and never as the
  sole carrier of meaning (the active wedge is also thicker and `aria-current`).
- Hero copy sits on a scrim calculated for the *brightest* scene (Facilities, whose left side is pale marble): the
  scrim guarantees ≥ 4.5:1 for the body line there.
- Focus ring: 2 px `--bronze` (dark) / `--bronze-deep` (paper) with 3 px offset, `:focus-visible` only.

### Input
- Deck: drag **or** buttons **or** arrow keys; nothing requires a path-based gesture (WCAG 2.5.1) or dragging (2.5.7).
- Targets meet WCAG 2.5.8 (≥ 24 px): primary controls are ≥ 44 px tall; the five world numerals are 32 × 44 px.
- The cursor label is decorative, `aria-hidden`, and never hides the system cursor.
- Menu sheet: focus trap, `Esc`, `aria-expanded`, background `inert`, focus returned to the trigger.

### Forms
- Visible `<label>` for every control; required state in text, not only an asterisk; hints linked with
  `aria-describedby`; errors announced via `role="alert"` and summarised at the top on submit with links to fields.
- Steps are `<fieldset>`s with `<legend>`s; moving between steps moves focus to the legend; progress is announced
  ("Step 2 of 2").
- `autocomplete` tokens on personal fields; no timeouts; file input states type and size limits before selection and
  validates them with a readable message.
- Success and failure are text, not colour.

### Language
`lang="en"`, `dir="ltr"` from config; logical properties everywhere so `dir="rtl"` needs no CSS rewrite.

## Measured (production build)

| | gzipped |
|---|---|
| All first-party JS (one bundle, every page) | 15.0 KB |
| Homepage CSS (base + page) | 9.3 KB |
| Homepage HTML | 12.6 KB |
| Fonts preloaded (serif + sans, Latin) | 51 KB (woff2) |
| Poster (LCP element) | 118 KB |

Scrub cost: 0.6 ms per decoded frame, ≤ 10.6 ms (p95) for a cold decode. `astro check`: 0 errors, 0 warnings.
Known trade-off: the poster is preloaded from HTML for LCP, so in static mode (where the hero uses the stills) that
one request is wasted.

## How this is verified

What was actually run, in headless Chromium against the dev server and the production build:

- Hero sweeps (overview → five worlds → title card) at 2560×1080, 1920×1080, 1440×900, 1024×768, 820×1180, 844×390,
  390×844, inspected visually frame by frame.
- Scripted state-machine scenarios: auto-settle forward and backward, SETTLE hand-off, refresh mid-film (correct world
  shown within 0.9 s, canvas never blank), world jumps, Skip film (focus lands on the statement), return to idle.
- Throttled network (450 ms per scrub frame): fling to an unloaded world, scroll into an unloaded sequence.
- JavaScript stripped from the built HTML; reduced motion via the toggle (loop video never requested).
- Live resize across the portrait boundary (story position preserved both ways).
- 320 px reflow: no horizontal overflow on any of the 8 pages; one `<h1>` each.
- Deck by buttons, arrow keys, `End`, synthetic pointer drag. Menu sheet: focus on open, trap, `Esc`, focus return,
  page inert. Request form: error summary + focus, step change, query-param prefill, submit → preview panel.
- `astro check` clean; console free of errors.

**Not run:** Safari/WebKit and real iOS (not available on this Windows machine — see the open risks in `10`), a
screen-reader pass, an automated axe audit, and Lighthouse/field Core Web Vitals. Contrast figures are computed from
the tokens, not measured on rendered pixels.
