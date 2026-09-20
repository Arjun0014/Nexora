# Nexora — website

Website for **Nexora Hospitality and Services W.L.L.** (Doha, Qatar · CR 250993).
A cinematic, gesture-stepped hero — *One world, many workforces* — followed by a sequence of art-directed
chapters with two conversion paths: employers request workforce, candidates register a CV.

Static site · Astro 7 · TypeScript · no UI framework · no animation or scroll libraries
(~21 KB of JS, ~18 KB of CSS, gzipped).

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
media/                       approved originals — never modified
nexora_website_context/      the brief
docs/redesign/               CURRENT: 00-DIRECTION (decisions), 01-BUILD (engineering), research/
docs/implementation/         session 1. 04 and 06-10 still apply; 00, 02, 03 and 05 describe the rejected design
scripts/build-media.mjs      originals → public/media + src/data/media-manifest.json
scripts/build-wordmark.mjs   font outline → src/data/wordmark.json, public/wordmark.svg, favicon
scripts/build-words.mjs      outlines the chapter-gate words → src/data/words.json
public/media/                generated derivatives (commit these; CI then needs no ffmpeg)
src/data/                    ALL copy and configuration
src/components/hero/         the film's markup and CSS
src/components/chapters/     the seven post-hero chapters + the zoom gate
src/scripts/hero/            timeline · input · loader · renderer · mask · ui · index (state machine)
src/scripts/                 intro, zoom, deck, turning, cursor, sound, header, menu, reveal, forms, motion
src/pages/                   index, services, industries, about, request, careers, contact, privacy, 404
.qa/                         QA harness: probes, contact-sheet scripts, and a static server for dist
```

## The hero in one paragraph

The idle loop is a `<video>` drawn into a canvas. **One gesture — a wheel notch, a trackpad flick, a swipe, an
arrow key — plays one whole transition** at the footage's own 24 fps to the next frozen world; the reverse plays
it backwards. Gestures that arrive mid-transition are queued (up to two), speed the playback up and chain
without a pause. The playhead only ever rests on a stop, so the film can never be left between states, and it is
clamped to the frames that have actually arrived, so a slow network makes it lag rather than flash. The entry
clip is joined 44 frames in, inside the motion-blurred spin, so any loop frame can hand off to it. It ends on a
title card: NEXORA knocked out of black, scaled down from inside the X; from there the page scrolls natively,
and scrolling back to the top re-enters the film at that title card. Full detail:
`docs/redesign/01-BUILD.md` §1 and `docs/implementation/04-HERO-IMPLEMENTATION.md`.

Three rendering modes are chosen **before first paint** (inline script in `src/layouts/Base.astro`):

| Mode | When | Hero |
|---|---|---|
| `cinema` | JS on, motion allowed, network OK | the stepped film, after a 6.5 s intro that really preloads it |
| static | reduced motion · Save-Data / 2g–3g · footer “Reduce motion” toggle | six ordinary sections with the high-res stills; loop video never requested; no intro |
| no-JS | scripting off | same as static; header scrolls away; the stack is a list; gates set their word as type |

QA switches: `?nointro` skips the intro · `?stop=N` boots the hero onto stop N (0–6) ·
`[data-hero]` exposes `data-mode` (`idle | film | dip`) and `data-stop`.

## The site after the hero

Seven chapters on an evolving, dark-anchored grade — never alternating flat black and flat white. Full
reasoning and the references behind each decision: `docs/redesign/00-DIRECTION.md`.

```
0  title card      studio   end of the film
I  manifesto       ember    what Nexora is + a hairline registry of checkable facts
   ── zoom gate: WORKFORCES, flown through the O ──
II  workforces     deck     five throwable plates; the ground tints to the active world
III the floor      deep     the loop as a live ground, speeding up with scroll velocity
   ── zoom gate: SECTORS, into the light ──
IV  sectors        stone    ten hairline rows; hovering raises the still into the pointer
IV  engagement     linen    five stations; one picture resolving from blueprint to render
V   how we work    ink      five commitments, shouted
VI  two doors      bronze   employer / candidate
VII footer         studio   live Doha time, CR number, policy, toggles, the cropped mark
```

## Regenerating media

```
npm run media         # build what is missing
npm run media:force   # rebuild everything (~2 min)
npm run wordmark      # NEXORA outline → wordmark.json, wordmark.svg, favicon
npm run words         # chapter-gate word outlines → words.json
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

Chromium at 1920×1080, 1440×900, 1024×768 and 390×844: one notch / one flick / one swipe / one key = one world,
in both directions; four notches in a single finger-roll = one step; a free-spinning wheel coasting to a stop =
one step; two flicks 500 ms apart = two worlds with no copy in between; a change of mind mid-transition;
Home; the release to native scroll at the title card and the re-entry from the page. Card stack: throw,
spring-back, velocity flick, buttons, arrow keys, touch drag. Pointer follower: all five states. Zoom gates,
turning floor (1.0 → 5.9 → 1.0 ×), chapter label, sound toggle, motion toggle. Production build served from
`.qa/serve.mjs` with scripts stripped and with hero media throttled to 400 ms per frame.

**Not tested: Safari / iOS** — it cannot be run on this machine, so it has not been checked at all. Only
long-supported APIs are used, and `requestVideoFrameCallback`, `playbackRate` ramping, `color-mix`, View
Transitions and `lvh/svh` are feature-guarded or have fallbacks, but check on a real iPhone and Mac before
launch.

Fonts: Instrument Serif, Instrument Sans and JetBrains Mono (all SIL OFL), self-hosted via Fontsource.
