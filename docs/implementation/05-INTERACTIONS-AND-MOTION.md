# 05 — Interactions and Motion

## Motion budget

The hero spends ~90% of the site's motion. After the title card the rule is **one dominant behaviour per section, and
three sections have none**.

| Section | Dominant behaviour | Everything else |
|---|---|---|
| Hero | scroll scrubs time | — |
| Title card | the mask comes to rest | statement lines reveal once |
| Workforces | **drag the deck** | panel cross-fade |
| Sectors | row focus (hover/keyboard) | — |
| Process | numeral swaps as steps pass | — |
| Plate | slow scale with scroll | — |
| What to expect | none | lines reveal once |
| Two doors | panel hover fill | — |

## Motion language

Derived from the film's own grammar — *motion, then an abrupt stop*:

- `--ease-freeze: cubic-bezier(.16, 1, .3, 1)` — fast start, dead stop. Used for every reveal. Nothing bounces or
  overshoots; time in this world *stops*, it doesn't wobble. (The deck is the one exception: it is a physical object
  and uses a spring.)
- Durations: 180 ms (state), 420 ms (reveal), 700 ms (large type). Stagger 60 ms per line, max 5 lines.
- Reveals are **mask-and-rise**: a line translates from 105% inside an `overflow: clip` parent. No opacity fades on
  type, no blur, no scale.
- Each reveal happens **once** (IntersectionObserver, `threshold .25`, then unobserved).

## Interaction inventory

### 1. Hero scrub, settle and dip
Fully specified in `04`. Input: wheel, trackpad, touch, keyboard (Space/PageDown/arrows scroll natively), the wedge
glyph, Skip film.

### 2. Five-wedge progress glyph + world numerals
A 56 px SVG: five 60° arcs with 12° gaps around a hub dot. The hub is the overview. Each wedge fills in **its own
sector colour** as it is visited; while a transition is scrubbing, the *incoming* wedge fills along its arc in
proportion to clip progress. The glyph is an indicator (`aria-hidden`). The controls are the five numerals beside it:
real `<button>`s, 32 × 44 px (`aria-label="World 2 of 5: Events & Promotions"`, `aria-current` on the active one) —
wedges on a 56 px ring would be too small to be honest touch targets. Click → adjacent forward: play the clip at
natural speed by animating scroll; anything else: DIP. Inspired by Arc'teryx's I–V diagram; shaped by our own disc.

### 3. Timecode
`▮▮ 00:00:13:05` beside the glyph. Computed from the display playhead (frames ÷ 24). The glyph reads `▶` while the
playhead is moving and `▮▮` when it has been still for 120 ms. `aria-hidden` — it is a caption for the mechanic, not
information.

### 4. Title-card mask
Specified in `04 §8`. Scroll-driven, reversible.

### 5. The deck
- **Pointer/touch:** `pointerdown` captures; the card follows with `rotate = dx / 18°`, `y = dy × .25`. Release past
  28% of card width or > 0.5 px/ms → exits along its velocity vector (spring, 520 ms), then re-enters at the back.
  Otherwise springs home. `touch-action: pan-y` keeps vertical page scroll alive.
- **Buttons:** `←` / `→`, visible, labelled, 48 px.
- **Keyboard:** the deck region is focusable; `←`/`→` change card, `Home`/`End` jump.
- **Announce:** the detail panel is `aria-live="polite"`; the counter reads "2 of 5".
- **No JS / reduced motion:** the underlying `<ol>` renders as a static two-column list of five illustrated entries.
- Direction is meaningless here (it is not Tinder — nothing is accepted or rejected); either direction means "next".
  This is said in the hint: *Drag, or use ← →*.

### 6. Contextual cursor label
The native cursor is **never hidden**. A small label chip trails it (lerp 0.22) and only exists over elements with
`data-cursor`. (A `SCROLL` label over the hero was planned and cut: the HUD's *Scroll to enter* line already says
it, and two cues for one action is noise.)

| Where | Label | Why it earns its place |
|---|---|---|
| Deck | `DRAG` | the draggable affordance is invisible otherwise |
| Two doors | `REQUEST` / `APPLY` | confirms which door before the click |

Enabled only when `(hover: hover) and (pointer: fine)` and motion is allowed. Removed over inputs, textareas and
selectable text. It is `aria-hidden`, `pointer-events: none`, and one composited `transform` per frame. The RAF loop
stops when the pointer has been idle for 2 s.

### 7. Header
Hides on scroll-down after the hero, returns on scroll-up (threshold 8 px, `transform` only). Ink switches by the
`data-theme` of the section under it. Never hides while focus is inside it or inside a form.

### 8. Process numeral
IntersectionObserver with `rootMargin: -45% 0px -45% 0px` sets the active step; the sticky numeral swaps with a
vertical mask slide (420 ms, `--ease-freeze`).

### 9. Forms
Step change is a horizontal mask wipe between fieldsets (no page scroll jump; focus moves to the new step's legend).
Validation is on blur and on submit, inline, never by colour alone. Blur-validation is skipped for a blur caused by
pressing a button: revealing an error there shifts the layout under the pointer and the click is lost (found in QA). The submit button shows a progress state and the
form is replaced by the "what happens next" panel on success.

### 10. Page-to-page
Native cross-document view transitions (`@view-transition { navigation: auto }`): a 200 ms cross-fade where
supported, nothing where not. No client-side router, so the hero script never has to be torn down and rebuilt.

### 11. Motion toggle
A footer control, **Reduce motion** / **Motion is reduced — turn on**, stores the visitor's choice
(`localStorage: nx-motion`). The pre-paint script honours it over the OS setting in either direction, so people
without an OS-level preference can still switch the film off. Applying it is a reload, because it changes the page's
layout mode. (Inspired by Noho's reduced-animation control.)

## Reduced motion (`prefers-reduced-motion: reduce`, or the footer toggle)

Not "the same thing but slower" — a different, complete page:

- Hero: no pinning, no scrub, no autoplaying loop. Overview still + five full-height world sections + a static title
  card (CSS `background-clip: text` shows the still inside the letters).
- Deck → static list. Cursor label off. Reveals off (content simply present). Plate does not scale. Header does not
  animate. View transitions off. Smooth scrolling off.
- The preference is read before first paint (inline head script) so there is no flash of the cinematic layout, and it
  is observed at runtime.

## What was deliberately not built

Parallax on text · scroll-linked section colour morphs (cuts are harder and better) · magnetic buttons · a preloader
with a percentage · marquee text · hover videos · sound.
