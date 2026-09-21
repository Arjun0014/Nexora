# Nexora — website

Website for **Nexora Hospitality and Services W.L.L.** (Doha, Qatar · CR 250993).
A cinematic, gesture-stepped hero — *One world, many workforces* — and then one continuous scroll film,
from night into a Doha day and back to dusk, with two conversion paths: employers request workforce,
candidates register a CV.

Static site · Astro 7 · TypeScript · no UI framework · GSAP (ScrollTrigger, SplitText, CustomEase) + Lenis
(~79 KB of JS, ~19 KB of CSS, gzipped).

```
npm install
npm run dev          # http://localhost:4321
npm run build        # → dist/   (set SITE_URL first, see below)
npm run preview
npm run check        # type-check (0 errors expected)
```

Requires Node ≥ 22.12. `ffmpeg` is needed **only** to regenerate media.

---

## Before launch — what the client must supply

Everything below is an empty value today and **renders nothing** until filled in (no "TBC", no invented numbers).

| What | Where |
|---|---|
| Production domain | `SITE_URL=https://… npm run build` (canonical URLs, sitemap, social image) |
| Email, phone, WhatsApp, address, social links | `src/data/site.ts` |
| **Form endpoints** (`request`, `candidate`, `contact`) | `src/data/site.ts → formEndpoint` |
| Logo files (a typographic wordmark stands in) | see *Wordmark* below |

Until `formEndpoint` is set, the forms validate and show their success screen with a visible
**“Preview mode — this submission was not sent”** notice. They POST `multipart/form-data`
(`Accept: application/json`), which suits Formspree, Basin, Web3Forms, Netlify Forms or a bespoke API.
The candidate form uploads a CV, so the endpoint must accept files (PDF/DOC/DOCX ≤ 5 MB).

### Needs client / counsel confirmation (all copy lives in `src/data/`)

- The five workforces and their role lists · the ten sectors (`worlds.ts`, `content.ts`)
- The five process steps and five commitments — they are promises about behaviour
- The policy line **“Nexora never charges candidates”** — grounded in Qatar Labour Law 14/2004 Art. 33 and
  written as company policy; recruitment-licensing position should be reviewed by counsel
- `src/pages/privacy.astro` — a plain-language draft limited to what the forms collect; needs legal review
- The registered activities on the CR are *hospitality services* and *event organisation*. The site markets a
  wider workforce scope on the client's instruction; `about` states this plainly rather than hiding it
- Cultural note: the approved Hospitality scene shows a sparkling pour. The asset is used as supplied; no copy
  names the drink

**Never add** clients, logos, statistics, years of experience, certifications, testimonials, turnaround
promises, payroll/EOR/visa/healthcare claims, or construction — see
`nexora_website_context/01_SOURCE_OF_TRUTH.md`.

---

## Project map

```
media/                       approved originals — never modified (hero/, clouds/, stock/ + stock/SOURCES.md)
nexora_website_context/      the brief
docs/redesign/               CURRENT: 02-DIRECTION-V3 (decisions), 03-BUILD-V3 (engineering). 00/01 = session 2, superseded
docs/implementation/         session 1. 04 (the hero) still applies
scripts/build-media.mjs      hero originals → public/media + src/data/media-manifest.json
scripts/build-stock.mjs      stock originals → public/media/stock, graded to one look (manifest: src/data/stock.json)
scripts/build-clouds.mjs     cloud originals → public/media/clouds (+ copies tinted to the grounds)
scripts/build-wordmark.mjs   font outline → src/data/wordmark.json, public/wordmark.svg, favicon
scripts/build-words.mjs      outlines the gate words → src/data/words.json
src/data/                    ALL copy and configuration (content.ts, worlds.ts, site.ts, stock.json)
src/components/hero/         the film's markup and CSS
src/components/scenes/       the homepage scenes: Portal, Held, Workforces, Sectors, Engagement, Expect,
                             Employers, Candidates, Closing (subpages)
src/scripts/core/            motion (the eases), scroll (Lenis), ticker, env
src/scripts/scenes/          one driver per scene + footer
src/scripts/                 intro, deck, cursor, header, menu, pagehead, reveal, forms, motion toggle
src/pages/                   index, services, industries, about, request, careers, contact, privacy, 404
.qa/                         QA harness: frames.sh (scroll contact sheets), probes, a static server for dist
```

## The hero in one paragraph

The idle loop is a `<video>` drawn into a canvas. **One gesture — a wheel notch, a trackpad flick, a swipe, an
arrow key — plays one whole transition** at the footage's own 24 fps to the next frozen world; the reverse plays
it backwards. Gestures that arrive mid-transition are queued (up to two), speed the playback up and chain
without a pause. The playhead only ever rests on a stop, so the film can never be left between states, and it is
clamped to the frames that have actually arrived, so a slow network makes it lag rather than flash. The entry
clip is joined 20 frames in (0.8 s), just as the spin starts, through a 340 ms cross-fade from the loop. It ends on a
title card: NEXORA knocked out of black, scaled down from inside the X; from there the page scrolls natively,
and scrolling back to the top re-enters the film at that title card. A reload always starts at the top, and the
intro runs on every load. Full detail:
`docs/redesign/01-BUILD.md` §1 and `docs/implementation/04-HERO-IMPLEMENTATION.md`.

Three rendering modes are chosen **before first paint** (inline script in `src/layouts/Base.astro`):

| Mode | When | Hero |
|---|---|---|
| `cinema` | JS on, motion allowed, network OK | the stepped film, after a 5–7.5 s intro that really preloads it and ends through a circular aperture |
| static | reduced motion · Save-Data / 2g–3g · footer “Reduce motion” toggle | six ordinary sections with the high-res stills; loop video never requested; no intro |
| no-JS | scripting off | same as static; header scrolls away; the stack is a list; gates set their word as type |

QA switches: `?nointro` skips the intro · `?stop=N` boots the hero onto stop N (0–6) ·
`[data-hero]` exposes `data-mode` (`idle | film | dip`) and `data-stop`.

## The site after the hero

One continuous film: every scene is born inside the previous one (ERA Residence's principle). Decisions and the
reference behind each: `docs/redesign/02-DIRECTION-V3.md`. Engineering: `docs/redesign/03-BUILD-V3.md`.

```
0  hero          black       the film, unchanged; ends on the NEXORA title card
1  portal        → sky       a sky dome with a lit rim rises out of the title card and becomes the ground
2  the world     sky         "Five worlds, one partner." — press and HOLD the moon: it opens to the whole
                             screen, you fall into the disc, the five worlds burst open one by one, then
                             the answer; let go and it all collapses back into the moon
3  workforces    sky → gold  WORKFORCES knocked out of the sky; fly through the O into a photograph, which
                             shrinks into the top card of the deck
4  the deck      5 colours   throwable cards; the whole scene changes colour with each throw
5  sectors       → sand      a cloud bank rolls over; SECTORS with the Doha skyline in it; fly into the city
6  the index     sand        ten sectors, one at a time: monument name over a picture window
7  engagement    maroon      an arch rises; a colonnade of five lit arches passes sideways; the last is a
                             doorway that opens onto…
8  what to       sand        the five commitments as one centred poem with footnotes
   expect
9  employers     → sky       a photo window grows, then becomes the column of a Love & Money playbook
10 candidates    maroon      a dome rises; the no-fee promise as the headline
11 footer        maroon      the Doha photograph draws in to an arch while the footer assembles
```

## Regenerating media

```
npm run media         # build what is missing
npm run media:force   # rebuild everything (~2 min)
npm run wordmark      # NEXORA outline → wordmark.json, wordmark.svg, favicon
npm run words         # gate word outlines → words.json
npm run stock         # stock derivatives (add a photo: put it in media/stock, list it in src/data/stock.json)
npm run clouds        # cloud derivatives
```

Key facts baked into the pipeline (measured, see `docs/implementation/04`): the `*-final.png` stills are **not**
the frames the videos land on, so rest states use the clips' own last frames and the PNGs are used for the
static hero, the plates and the subpages; untagged clips are treated as BT.709; the human action sits at
x ≈ 0.72 in every scene, which defines both the portrait crop and the 4:5 card crops.

## Wordmark

`NEXORA` is outlined from Instrument Sans 700 into one vector used by the header, the title-card mask and the
footer. To use a real logo, replace `src/data/wordmark.json` (`d`, `width`, `height`, and `anchor` — a point
with clearance `r` that lies solidly *inside* a letter; the title-card zoom scales about it).

## Tested

Chromium (headless) at 1920×1080, 1440×900, 1024×768 and 390×844, every scene captured as scroll contact
sheets with `.qa/frames.sh`. The hero: one wheel gesture = one world through all six stops, the next gesture
after the title card scrolls the page (Lenis), scrolling back returns to the title card without re-entering the
film. The intro on a fresh load, including its aperture ending (timed in-page: opens at ~6.6 s, gone at ~8.5 s).
The hold interaction (dusk, five lines, answer, release back to day). The deck morph and throw. The pointer:
lands exactly on the pointer, and resolves dot / ring / label / hold / drag. Production build served by
`.qa/serve.mjs` with scripts stripped (no-JS) and with reduced motion forced: both render every scene's
content as a styled static document.

**Not tested: Safari / iOS, and real touch hardware.** They cannot be run on this machine. GSAP and Lenis are
well supported there, but check the hold (touch long-press), the pinned scenes and the hero on a real iPhone
and Mac before launch.

Fonts: Noto Serif Display and Archivo (display and text), Instrument Sans (outlined into the wordmark and gate
words only). All SIL OFL, self-hosted via Fontsource.
Photography: Unsplash License, credits in `media/stock/SOURCES.md`. Clouds: client-supplied.
