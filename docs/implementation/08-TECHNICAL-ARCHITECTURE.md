# 08 — Technical Architecture

## Stack

| Choice | Why |
|---|---|
| **Astro 7, static output** | The site is content + one heavy bespoke interaction. Astro ships zero JS by default, gives real components, scoped CSS, a sitemap, and builds to plain files that host anywhere (the previous site was on Vercel; this deploys there or to any static host unchanged). |
| **No UI framework** | The hero is an imperative canvas state machine; the deck is pointer maths. React/Vue would add a runtime and hydration for no benefit. |
| **TypeScript, vanilla modules** | One small module per behaviour, each exporting `init()` and cleaning up after itself. |
| **No GSAP, no Lenis, no scroll library** | Native scroll + a 40-line RAF ticker + a critically-damped follower cover every need. Total first-party JS ≈ 14 KB gz. No scroll-jacking means anchor links, find-in-page, keyboard scrolling, scroll restoration and assistive tech all just work. |
| **Hand-written CSS with custom properties** | The design is editorial and asymmetric; utility classes would fight it. Tokens in one file, component styles scoped in `.astro` files. |
| **Fontsource** | Self-hosted OFL fonts, no third-party request, no consent implications. |
| **sharp + ffmpeg (build-time only)** | `npm run media` regenerates every derivative from the untouched originals. |

## Structure

```
media/                         approved originals — read-only
nexora_website_context/        the brief — read-only
docs/implementation/           this plan
scripts/
  build-media.mjs              originals → public/media + src/data/media-manifest.json
  build-wordmark.mjs           font outline → src/data/wordmark.json
public/
  media/hero/…  media/stills/… generated derivatives (committed; CI does not need ffmpeg)
  favicon.svg  robots.txt
src/
  data/                        ALL copy and config
    site.ts                    legal identity, contact (empty until supplied), nav, form endpoint
    worlds.ts                  the five workforces: titles, lines, roles, accents, timeline
    sectors.ts  process.ts  commitments.ts  engagements.ts
    media-manifest.json  wordmark.json          (generated)
  styles/
    tokens.css  base.css  type.css  utilities.css
  layouts/Base.astro           <head>, SEO, fonts, pre-paint mode script, header, footer
  components/
    Header.astro  Footer.astro  MenuSheet.astro  Wordmark.astro  SEO.astro
    ui/        Label, ButtonLine, TextLink, Arrow, Field, Chips, Plate, PageHead
    hero/      Hero.astro, HeroWorld.astro, WedgeGlyph.astro
    home/      TitleCard, Workforces, Sectors, Process, PlateBreak, Commitments, Doors
    forms/     RequestForm.astro, CandidateForm.astro
  scripts/
    core/      ticker.ts, follow.ts (damped follower), env.ts (motion / pointer / network), dom.ts
    hero/      index.ts (state machine), timeline.ts, renderer.ts, loader.ts, mask.ts, ui.ts
    deck.ts  cursor.ts  header.ts  reveal.ts  process.ts  forms.ts  menu.ts
  pages/       index, services, industries, about, request, careers, contact, privacy, 404
```

## Pre-paint mode script

An inline `<script>` in `<head>` (≈ 300 bytes, no dependencies) sets classes on `<html>` **before first paint**:

- `js` — scripting is available
- `cinema` — JS on **and** motion allowed **and** not Save-Data → the hero lays out as a pinned stage
- otherwise the hero lays out as six ordinary sections (the no-JS default)

Because the mode is known before layout, the hero container's height never changes after paint → **zero CLS**, and
reduced-motion users never see a flash of the pinned layout.

## Hero module boundaries

| Module | Owns | Knows nothing about |
|---|---|---|
| `timeline.ts` | segments, `u → {segment, local}`, rest positions, portrait scaling | DOM, canvas |
| `loader.ts` | fetching, decode look-ahead, contiguous-range bookkeeping, release | timeline semantics |
| `renderer.ts` | canvas sizing, `fit(e)`, draw video/frame/still, blurred underlay | scroll |
| `mask.ts` | the NEXORA knock-out canvas | everything else |
| `ui.ts` | copy visibility, glyph, timecode, scrims, HD still cross-fade | canvas |
| `index.ts` | the state machine: reads scroll, runs the follower, orders the others about | — |

Pure modules (`timeline`, the fit maths) are side-effect free and unit-testable.

## Forms without a backend

No backend was specified. Forms are progressive enhancement over a real `<form method="post" action={endpoint}>`:

- With `formEndpoint` set: `fetch(endpoint, { method: 'POST', body: FormData })` — the contract of Formspree, Basin,
  Netlify Forms, Web3Forms or a bespoke API. The CV goes as multipart. Without JS the form posts natively.
- With it empty: full validation and success UI, plus an unmissable **Preview mode — not sent** notice.
- Honeypot field + minimum-time-to-submit check; no third-party CAPTCHA script by default.

## SEO

Per-page `<title>`/description from page frontmatter · canonical from `SITE_URL` · Open Graph + Twitter card
(`/media/og.jpg`) · `Organization` JSON-LD with **only confirmed facts** (legal name, `addressCountry: QA`,
`foundingDate: 2026-09-07`; no `telephone`/`address` until supplied) · `WebSite` JSON-LD · sitemap via
`@astrojs/sitemap` · `robots.txt` · one `<h1>` per page · all hero copy is real text · the five worlds are
`<section aria-labelledby>` with `<h2>`s.

## Configuration the client must set

`SITE_URL` (build env) and the empty strings in `src/data/site.ts`. Nothing else is hard-coded.

## Browser support

Evergreen Chromium, Firefox, Safari 16.4+. Needed features: `position: sticky`, `IntersectionObserver`, WebP,
`Path2D`, pointer events, CSS `clamp()`/logical properties. `requestVideoFrameCallback`, View Transitions,
`navigator.connection` and `lvh/svh` units are used only behind feature checks with fallbacks.
