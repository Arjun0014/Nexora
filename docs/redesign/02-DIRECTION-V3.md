# Nexora — post-hero direction, version 3

Supersedes `00-DIRECTION.md` (session 2) for everything after the hero's NEXORA title card. The hero film and the
title-card zoom-out are fixed; everything else was rejected by the client and is rebuilt here from zero.

Evidence: ERA Residence studied from its production script (`initTranistionFlow`, `animateText*`,
`initAllParallax`, eases and durations read directly) and a 54-frame scroll capture; United Carriers,
lxlcreative, Cerebrium, noho.ink and Love & Money captured and read the same way. Notes in
`research/v3-references.md`.

---

## 1. Why the last build failed, in one sentence

It was a list of sections. Each ended on a hard edge and the next started from nothing, so the page read as
"AI made some scrolling blocks". ERA never ends a section: **every scene is born inside the previous one.**

## 2. What ERA actually does (measured, not guessed)

| Device | ERA's implementation | Nexora's use |
|---|---|---|
| Dome rise | the next section is a giant circle rising from below the hero, curved text on its rim; hero content moves up faster than its background, background scales 1 → 2 | **Portal**: our disc rises out of the title card as a sky-coloured dome with a lit amber rim |
| Window → full bleed | a small image in the layout grows (clip inset) to fill the viewport, text then sits over it | the held world's arch window; the employer photo |
| Seam cutouts | bougainvillea PNGs straddle section edges on their own parallax | **clouds** (client-supplied) straddle the seams |
| Cloud curtain | a cloud bank rises over a section and parts onto a photograph | deck → Sectors |
| Scale-out | a pinned section scales to 2x and fades while the next arrives | Doha photograph → sector index |
| Arch rise | a round-topped arch rises and expands until it is the next section's ground | sectors → engagement; the colonnade's last arch → What to expect |
| Footer inset | the last full-bleed image clips inward (`inset(8% 22%)`) while the footer scales in from 0.75 | candidates → footer |
| Text | chars turn in on X/Y (`rotateX 90 → 0`, `x 10rem → 0`), lines slide up out of masks, rules draw with clip-path | everywhere, one vocabulary |
| Grounds | only three, recurring: aubergine, powder sky, cream | sky, limestone, maroon (below) |
| Smoothness | Lenis (duration 1.2, expo), GSAP ScrollTrigger scrub 0.25–0.5 | same stack |

Eases, used for every animation on the site (`src/scripts/core/motion.ts`): `inOut 0.75,0,0.25,1` ·
`out 0.25,1,0.5,1` · `in 0.5,0,0.75,0` · `dive 0.6,0,0,1`. Durations 0.4 / 0.8 / 1.2 s, stagger 0.08.

## 3. Concept — night into day

The hero is a night film: five worlds lit in a dark studio. After the title card the site **rises into a Doha
day**: the disc comes up over the black like a sunrise, clouds pass, and the chapters that follow are set in
daylight grounds, returning to dusk (maroon) for the parts where a visitor commits. Operations run around the
clock; the page does too. It also justifies an evolving palette rather than bands.

Continuity objects, so the page is one film:
- **the circle** — the disc of the hero, the intro's aperture, the portal dome, the hold button, the cursor;
- **the arch** — Gulf architecture's round arch: the held-world window, the colonnade, the arch rises;
- **clouds** — at every seam where the ground changes.

## 4. Colour

| Token | Hex | Role |
|---|---|---|
| `--sky` | `#C4D4DB` | Gulf haze. The portal, the held world, For employers |
| `--sand` | `#EEE7DB` | limestone. Sectors, What to expect |
| `--maroon` | `#4B1426` | deep Qatari maroon. The dark anchor: engagement, candidates, footer |
| `--ink` | `#1C1B2E` | text on light grounds (the hero's navy, darkened) |
| `--bone` | `#F4EFE6` | text on maroon and black |
| `--amber` | `#D09560` | the hero's light. Rims, the progress line, accents on dark; `--amber-deep #8E5A30` on light |

Workforce grounds, one per card, changing the WHOLE section as the stack is thrown: hospitality `#E4CBA2`,
events `#CFBDE4`, facilities `#B4D6CE`, technical `#B2C5DF`, recruitment `#B5DCE7`.

Script, top to bottom: black (film) → sky → the five workforce colours → (clouds) → sand → Doha photograph →
sand → maroon → sand → sky → maroon. Dark returns three times; no two neighbours meet on a straight edge.

## 5. Type — one family per job, nothing else

- **Display: Noto Serif Display**, condensed (`wdth 62.5`), weight 300, UPPERCASE, line-height 0.9. Tall,
  high-contrast, reads as hotel signage. Its **italic** (lowercase, `wdth 75`) is the one accent: one word per
  headline, the way ERA uses its script.
- **Text and labels: Archivo.** Body at normal width, 400. Labels in the **expanded** cut (`wdth 125`), 500,
  10.5–11 px, uppercase, `+0.16em`. This replaces the mono entirely.
- **The wordmark and the zoom words stay Instrument Sans 700**, because they are the same knock-out technique as
  the hero's NEXORA and must match it.

Scale is gapped on purpose: label 11 · body 16 · lead 20 · h3 30–40 · display 6–9vw · monument 12–18vw.

## 6. The homepage, scene by scene

| # | Scene | What happens | Reference |
|---|---|---|---|
| 0 | Hero | unchanged film; ends on NEXORA + "The people behind smooth operations." | — |
| 1 | **Portal** | the title card is pinned; a sky dome with an amber rim rises from below, curved text turning on its rim with scroll velocity; the title card lifts faster than the stage and the stage scales up; clouds rise through the seam. The dome keeps growing until it is the next ground. | ERA hero → benefits dome |
| 2 | **The world, held** | on sky: "Five worlds, *one* partner." An arch window holds the turning disc (the loop, whole, never over-zoomed) and grows as you arrive. **Press and hold** the arch: the disc accelerates the longer you hold, and five lines arrive one by one, a sentence for each world; after all five, the answer. Release and it all eases back. | Cerebrium's hold, ERA window growth |
| 3 | **Workforces gate** | WORKFORCES is knocked out of the sky, a real photograph of service staff visible through it; the camera flies through the O into the photograph at its natural scale; the photograph then **shrinks into the top card** of the deck. | the old gate (kept, client liked it) + United Carriers' object continuity |
| 4 | **Five workforces** | the throwable stack, cards 30% larger, photographs of real people at work; the whole section's ground changes colour with each throw; copy sits tight to the stack. | lxlcreative |
| 5 | **Sectors gate** | a cloud bank rises over the deck and parts onto limestone; SECTORS knocked out with the Doha skyline inside it; fly through into the skyline, shown properly, with "Where our people work." over it; the photograph scales out as the index arrives. | ERA clouds + scale-out |
| 6 | **Ten sectors** | a pinned index: one sector at a time, its name in monument caps overlapping an image window, roles to the left, what we do to the right, a ten-name index along the bottom. The name turns out and the next turns in; the image wipes on a slanted edge. | ERA apartment-type slider |
| 7 | **How an engagement runs** | a maroon arch rises out of the limestone and becomes the ground. A **colonnade** of five lit arches passes sideways, each framing one step, an amber line running along the floor between them with a point of light travelling it. The last arch opens to fill the screen. | ERA arch, lxlcreative line, Gulf architecture |
| 8 | **What to expect** | on limestone: the five commitments stacked centre as a single poem in display caps with footnote numerals; each footnote rises beneath as its line arrives; the three lines we don't cross run as a quiet ribbon. Clouds drift at the edges. | ERA "developer / licence" stack |
| 9 | **For employers** | a photograph window grows to fill the screen, then pins as a Love & Money playbook: tall photograph left that changes per step, the four ways to engage as big numbered steps in the centre, a filmstrip rising on the right; ends on "Request workforce". | Love & Money |
| 10 | **For candidates** | maroon dome: "Looking for work?" with the no-fee policy as the headline promise, and "Register your CV". | ERA dome |
| 11 | **Footer** | the candidate photograph clips inward to a frame while the footer scales in on maroon; contact, the two doors, registry facts, NEXORA bleeding off the bottom. | ERA footer inset |

Global: Lenis smooth scroll; a left-edge progress rail with a 00–100 counter (desktop); the header switches
light/dark as grounds pass beneath it (ERA `initThemeChange`); snap on the full-screen scenes on desktop only.

## 7. Copy changes

- The "Every operation runs on people who turn up." manifesto and "Everything here was carried in by someone."
  are retired with their sections.
- New lines are plain and true. The hold narrative: "A table is served." · "The doors open on time." · "The lobby
  is ready by morning." · "The plant keeps running." · "The right person says yes." → "Behind all five, people.
  Nexora supplies them."
- Claim safety unchanged: no clients, numbers, years, certifications, testimonials, turnaround promises,
  payroll/EOR/visa/healthcare, construction.

## 8. Imagery

Stock is now used (client request), licence-clean only (Unsplash / Pexels), sources in `media/stock/SOURCES.md`,
all graded to one warm, soft look by the media build. Qatar-appropriate: no alcohol, modest dress, no
construction. The CGI stills stay in the hero; the loop reappears only whole, inside the arch.

## 9. The pointer (built last)

Rebuilt on noho.ink's measured model: a 12 px dot whose position eases to the pointer (exponential, tau 90 ms),
so it always lands exactly under the pointer and stops, with no spring and no stretch. Its size, colour and
content morph over 0.4 s by context: a ring on links, a labelled circle on actions ("Hold", "Drag", "Next",
"Open"), the step numeral on commitments, an arrow on the colonnade, hidden over inputs. A 0.9x pulse on click.
After a scroll it re-checks what is under the still pointer.

## 10. Other fixes in this pass

Sound removed entirely · the entry clip starts one second earlier (frame 20) · the intro runs on every load and a
reload always starts at the top · the intro ends through a circular aperture instead of the bronze wall.

## 11. Fallbacks

Reduced motion: no smooth scroll, no pins, no hold acceleration (the lines are shown), static compositions,
clouds still. No JS: every scene's content is real DOM in reading order and renders as a plain, styled document.
