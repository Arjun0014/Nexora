# 03 — Visual System

Everything here is derived from the footage, not from a mood board.

## Colour

Sampled from the media (`scripts` analysis, 20 Sep 2026): the one light source common to **all five** scenes is the warm
strip light, clustering at `#c28456`. That becomes the single brand accent. Sector colours are reserved for moments
when a sector is actually active.

| Token | Value | Use |
|---|---|---|
| `--studio` | `#0b0a09` | Dark surface. Warm near-black so the footage's blacks sit inside it |
| `--studio-2` | `#14120f` | Raised dark surface (menu sheet, candidate door hover) |
| `--paper` | `#eee8de` | Light surface — the marble/stone white of the scenes, not pure white |
| `--paper-2` | `#e3dbcd` | Bordered blocks on paper |
| `--ink` | `#15120f` | Text on paper |
| `--ink-soft` | `#6b6259` | Secondary text on paper (5.3:1 on paper) |
| `--bone` | `#f3ede3` | Text on dark |
| `--bone-soft` | `rgba(243,237,227,.62)` | Secondary text on dark (≥ 7:1 on studio) |
| `--bronze` | `#c48a55` | The accent on dark: numerals, hairlines in focus, links, focus ring |
| `--bronze-deep` | `#7a4e2a` | The accent on paper (6.1:1) |
| `--line-dark` | `rgba(243,237,227,.14)` | Hairlines on dark |
| `--line-paper` | `rgba(21,18,15,.16)` | Hairlines on paper |

Sector accents (dark surfaces only — they are too light to be text on paper):

| Sector | Token | Value | Source in footage |
|---|---|---|---|
| Hospitality | `--c-hospitality` | `#d9a45b` | champagne / candle gold |
| Events & Promotions | `--c-events` | `#b07ce0` | LED edge lighting (`#9961bf` lifted for contrast) |
| Facilities & Support | `--c-facilities` | `#5fb8ae` | the teal doors and upholstery, lifted |
| Specialist & Technical | `--c-technical` | `#5b9be0` | floor LED blue; `#e0793a` pipe orange as a secondary tick only |
| Recruitment & Workforce | `--c-recruitment` | `#4fc3e8` | screen cyan |

A sector colour is applied by setting `--accent` on a container (`[data-sector="events"]`). Components only ever read
`--accent`, which defaults to `--bronze`. Where it appears: the active wedge of the progress glyph, the world numeral,
one 1px rule, the deck numeral. It never fills a background.

**Surfaces alternate by hard cut** (no gradient transitions between sections): dark → paper → dark. Sections declare
`data-theme="dark|paper"`, which also drives the header's ink.

**The loop's backdrop is not flat** — it is warm brown on the left (`#271c17`, the disc's glow reaches that edge) and
cool navy on the right (`#121924`). When the disc is shown contained, the canvas paints a 64×36 copy of the current
frame stretched to the full stage underneath it (a free, GPU-cheap blur), so the studio light continues to the
viewport edges instead of meeting a flat colour.

## Typography

Two families, both SIL OFL, self-hosted via Fontsource (no third-party requests, `font-display: swap`, Latin subset,
the two hero-critical files preloaded).

| Role | Face | Notes |
|---|---|---|
| Display | **Instrument Serif** 400 / 400 italic | Condensed, high-contrast. Its narrow set lets sector titles be very large inside the hero's protected 38% column |
| UI / body / wordmark | **Instrument Sans Variable** 400–700 | Labels at 11px uppercase +0.14em; body at 16–18px; the NEXORA wordmark at 700, +0.02em, as outlined vector |

The serif speaks for hospitality and the editorial register; the small tracked sans speaks for operations. Italic is
used for exactly one thing: the emphasised phrase in a statement (*smooth operations*).

Arabic (not loaded; chosen so RTL is a content task, not a redesign): **Noto Naskh Arabic** for display,
**IBM Plex Sans Arabic** for UI — both OFL.

### Scale (fluid, `clamp()`; no breakpoints for type)

| Token | Size | Line | Use |
|---|---|---|---|
| `--t-mega` | `clamp(3.5rem, 11vw, 12rem)` | 0.9 | Two doors, 404 |
| `--t-display` | `clamp(2.75rem, 6.4vw, 7rem)` | 0.95 | World titles, page titles |
| `--t-h1` | `clamp(2.25rem, 4.6vw, 4.75rem)` | 1.0 | Statements |
| `--t-h2` | `clamp(1.75rem, 3.4vw, 3.25rem)` | 1.05 | Index rows, step names |
| `--t-h3` | `clamp(1.375rem, 2vw, 1.875rem)` | 1.15 | Commitments |
| `--t-lead` | `clamp(1.125rem, 1.35vw, 1.375rem)` | 1.45 | Lead paragraphs (sans) |
| `--t-body` | `1rem` → `1.0625rem` | 1.6 | Body |
| `--t-label` | `0.6875rem` (11px) | 1.3 | Uppercase, `letter-spacing: .14em`, weight 500 |

The system's character is the **jump** between `--t-label` and `--t-display` with little in between.
Display type is tracked `-0.02em`; measure for body copy is capped at `34rem`.

Numerals everywhere use `font-variant-numeric: tabular-nums` so the timecode and counters do not jitter.

## Grid and spacing

- 12 columns, `--gutter: clamp(1rem, 2vw, 2rem)`, page margin `--margin: clamp(1.25rem, 4vw, 4.5rem)`.
  Max content width `110rem`; the hero and plate ignore it (full bleed).
- Compositions are **asymmetric**: text blocks start on column 1 or column 7, rarely centred. Two-column sections
  split 5/7 or 7/5, never 6/6.
- Vertical rhythm from one variable: `--space: clamp(5rem, 11vw, 11rem)` between sections; `--space-s` = ⅓ of it
  inside sections.
- **Hairlines, not boxes.** Content is separated by 1px rules. `border-radius` is `0` everywhere except the deck
  cards (`10px`, because they are physical objects) and form controls (`2px`).

## Components (the whole kit)

`Label` (11px uppercase) · `Numeral` (tabular, accent) · `Rule` · `TextLink` (underline draws from inline-start on
hover) · `ButtonLine` (1px border, uppercase label, arrow) · `ButtonSolid` (bronze, forms only) · `Chip` (form
choices; caption chips on plates) · `Field` (underlined input, label above, error below) · `Plate` (image +
caption chip) · `IndexRow` · `Door`.

No icons except a single arrow glyph (`→`, drawn as SVG so it can animate) and the wedge glyph.

## Imagery

- Only the approved media. No stock. The five reference stills (1672×941) are used at full quality wherever
  continuity with video is not required: deck cards, the plate, subpage bands, reduced-motion hero, social image.
- Crops always keep the **frozen object** in frame (the pour, the lanyard, the linen, the cable, the document) —
  it is the concept.
- Images are never rounded, never tinted, never given drop shadows (deck cards excepted).
- Copy never names the drink in the Hospitality scene; it is "a pour". (See the cultural note in `06`.)

## Wordmark

No logo files were supplied. A typographic wordmark is generated at build time by outlining `NEXORA` in Instrument
Sans 700 (`scripts/build-wordmark.mjs` → `src/data/wordmark.json`). The same vector is used for the header, the
title-card mask and the footer, so they are guaranteed identical. When the client supplies a logo, replace that one
file; note that the title-card zoom targets the solid crossing of the **X**, so a replacement mark needs an
equivalent solid region (documented in `04`).
