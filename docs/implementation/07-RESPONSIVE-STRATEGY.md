# 07 — Responsive Strategy

The layout responds to **aspect ratio and input**, not to device names. Type is fluid (`clamp`) so breakpoints are
about composition only.

| Range | Name | What changes |
|---|---|---|
| ≥ 1600 px | Large desktop | Content capped at `110rem`; hero stays full-bleed; canvas backing store capped at 1920 px wide |
| 1024 – 1599 | Desktop / laptop | The reference composition |
| 700 – 1023 | Tablet | 12 → 8 columns; two-column sections stack 1/1 where a column would fall under 22rem; deck beside panel becomes deck above panel |
| < 700 | Phone | Single column; header collapses to wordmark + `Menu` |
| aspect < 1.0 | Portrait (any width) | Hero switches to the portrait frame set and the bottom-copy composition |

## Hero

**Landscape (aspect ≥ 1.0)** — corner UI; world copy in the left 38% over a left scrim; 1280×720 frames; cover focus
slides from 0.5 (≥ 16:10) to 0.68 (square) so narrowing the window crops the calm left side before the action.
On ultra-wide (≥ 21:9) cover crops top and bottom of the *scenes* (acceptable: the action is vertically central) but
the **overview is always contained**, so the disc is never cut.

**Portrait (aspect < 1.0)** — this is a re-composition, not a squeeze:

- Overview: disc contained at full width, centred at 40% of the stage height; headline and controls beneath it.
  Portrait actually gives the headline more room than desktop does.
- Entry: `fit` runs the full distance from contain to cover-at-focus-0.72, so the disc grows to swallow the screen
  as the clip dives. The wall-wipe still crosses the full window.
- Worlds: 512×640 frames pre-cropped to a 4:5 window centred on the action (x = 0.72). Any portrait viewport from
  4:5 to 9:21 is covered. Copy sits in the lower third over a bottom scrim; the title is `--t-display` at its
  minimum (2.75rem); the link becomes a full-width line button.
- Scroll distances: transitions × 0.8, because a thumb flick travels further than a wheel tick.
- Glyph moves to the top-right under the header; timecode is hidden (not enough room to be legible — cut, not
  shrunk).
- Payload ≈ 17 MB for the complete film vs 38 MB on desktop.
- Stage height is `100lvh` with UI laid out inside a `100svh` frame, so the collapsing URL bar never moves the
  controls or exposes a gap.

**Orientation change / resize across aspect 1.0** — progress through the hero is preserved, the other frame set is
requested, and the stage DIPs through bronze to the rest still while it loads.

## Title card
The wordmark always spans 88% of the stage width, so on a phone it is ~19vw tall letters — still a window onto the
frame. Statement block drops to one column; the four facts become a 2×2 grid.

## Deck
| | Desktop | Tablet | Phone |
|---|---|---|---|
| Arrangement | panel 5 cols · deck 6 cols | deck above, panel below | same |
| Card height | `min(62vh, 34vw × 1.25)` | `min(56vh, 60vw × 1.25)` | `min(58svh, 78vw × 1.25)` |
| Input | drag + cursor label + keys + buttons | swipe + buttons | swipe + buttons |

Panel height is reserved for the longest entry so swapping cards never shifts the page.

## Sectors index
Desktop: `numeral | name | roles` on one line. Tablet: roles wrap under the name. Phone: numeral above name, roles
always at full ink (there is no hover).

## Process
Desktop/tablet-landscape: sticky numeral column. Below 900 px: no sticky; each step carries its own inline numeral.

## Plate
Full-bleed at every size. `object-position` moves from `62% 50%` (landscape) to `76% 50%` (portrait) to hold the
linen in frame. Height `min(92svh, 62vw)` landscape, `78svh` portrait.

## Two doors
Side by side 7/5 ≥ 900 px; stacked below, employers first, each `min-height: 46svh`. `--t-mega` has an 11vw slope so
"I'm looking for work." never breaks mid-word at 360 px.

## Forms
One column always; max width `38rem`. Chips wrap. 48 px minimum control height. `inputmode`, `autocomplete` and
`enterkeyhint` set on every field; font-size ≥ 16 px so iOS never zooms.

## Header / menu
< 900 px: links move into the full-screen sheet. The `Request workforce` button stays in the bar at every width —
it is the primary conversion and is never behind a menu.

## Touch
Every hover behaviour has a non-hover equivalent or is purely decorative. No hover-only information. Targets ≥ 44 px.
The cursor label does not exist on coarse pointers.

## Tested viewports
2560×1440 · 1920×1080 · 1440×900 · 1366×768 · 1024×768 · 820×1180 · 768×1024 · 430×932 · 390×844 · 360×740 ·
and 844×390 (phone landscape: uses the landscape hero with a reduced type floor).
