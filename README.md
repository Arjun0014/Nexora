# Nexora — website

Website for **Nexora Hospitality and Services W.L.L.** (Doha, Qatar · CR 250993).
A cinematic, scroll-scrubbed hero — *One world, many workforces* — followed by an editorial site with two
conversion paths: employers request workforce, candidates register a CV.

Static site · Astro 7 · TypeScript · no UI framework · no animation or scroll libraries (~15 KB of JS, gzipped).

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
- The registered activities on the CR are *hospitality services* and *event organisation*. The site markets a wider
  workforce scope on the client's instruction and deliberately does **not** list registered activities
- Cultural note: the approved Hospitality scene shows a sparkling pour. The asset is used as supplied; no copy names
  the drink. See `docs/implementation/06-CONTENT-AND-COPY.md`

**Never add** clients, logos, statistics, years of experience, certifications, testimonials, turnaround promises,
payroll/EOR/visa/healthcare claims, or construction — see `nexora_website_context/01_SOURCE_OF_TRUTH.md`.

---

## Project map

```
media/                       approved originals — never modified
nexora_website_context/      the brief
docs/implementation/         design + engineering decisions (start with 00 and 04)
scripts/build-media.mjs      originals → public/media + src/data/media-manifest.json
scripts/build-wordmark.mjs   font outline → src/data/wordmark.json, public/wordmark.svg, favicon
public/media/                generated derivatives (commit these; CI then needs no ffmpeg)
src/data/                    ALL copy and configuration
src/components/hero/         the film's markup and CSS
src/scripts/hero/            timeline · loader · renderer · mask · ui · index (state machine)
src/scripts/                 deck, cursor, header, menu, reveal, process, plate, forms, motion
src/pages/                   index, services, industries, about, request, careers, contact, privacy, 404
```

## The hero in one paragraph

The idle loop is a `<video>` drawn into a canvas. Scrolling scrubs WebP frame sequences on that same canvas; each
world rests on the exact frame its clip freezes on, then a sharper still fades in. If you stop mid-transition the film
finishes the move itself at 24 fps. Jumps, refreshes and slow networks fall back to a fade through the divider-wall
bronze onto a rest still, so the stage is never blank and never stuck between states. It ends on a title card: NEXORA
knocked out of black, scaled down from inside the X. Full detail: `docs/implementation/04-HERO-IMPLEMENTATION.md`.

Three rendering modes are chosen **before first paint** (inline script in `src/layouts/Base.astro`):

| Mode | When | Hero |
|---|---|---|
| `cinema` | JS on, motion allowed, network OK | pinned, scrubbed film |
| static | reduced motion · Save-Data / 2g–3g · footer “Reduce motion” toggle | six ordinary sections with the high-res stills; loop video never requested |
| no-JS | scripting off | same as static; header scrolls away; deck is a list |

QA switches: `/?nosettle` parks the playhead wherever you scroll (inspect mid-transition frames);
`[data-hero]` exposes `data-mode` = `idle | settle | scrub | dip | …+auto`.

## Regenerating media

```
npm run media         # build what is missing
npm run media:force   # rebuild everything (~2 min)
npm run wordmark
```

Key facts baked into the pipeline (measured, see doc 04): the `*-final.png` stills are **not** the frames the videos
land on, so rest states use the clips' own last frames and the PNGs are used for the static hero, deck, plates and
subpages; untagged clips are treated as BT.709; the human action sits at x ≈ 0.72 in every scene, which defines the
portrait crop.

## Wordmark

`NEXORA` is outlined from Instrument Sans 700 into one vector used by the header, the title-card mask and the footer.
To use a real logo, replace `src/data/wordmark.json` (`d`, `width`, `height`, and `anchor` — a point with clearance
`r` that lies solidly *inside* a letter; the title-card zoom scales about it).

## Tested

Chromium at 2560×1080, 1920×1080, 1440×900, 1024×768, 820×1180, 844×390, 390×844: forward/reverse scrub, fling,
stop-mid-transition (auto-settle), refresh mid-film, world jumps, Skip film, return to idle, throttled network
(450 ms per frame), JS disabled, reduced motion, keyboard (deck, menu sheet, forms), form validation and submit.

**Not yet tested: Safari / iOS** (not runnable on the build machine). Only long-supported APIs are used and
`requestVideoFrameCallback`, `playbackRate` ramping, View Transitions and `lvh/svh` are feature-guarded, but check on a
real iPhone and Mac before launch.

Fonts: Instrument Serif and Instrument Sans (SIL OFL), self-hosted via Fontsource.
