# Nexora — post-hero design direction

Written after studying the sites in `research/awwwards-study.md` and the interaction references in
`research/interaction-references.md`. Every decision below names the evidence behind it.
This replaces `docs/implementation/00`, `02`, `03` and `05`; those describe the rejected build.

---

## 1. What was wrong with the rejected build

It was a stack of independent bands: flat black, flat cream, flat black. Each band was centred, symmetrical and
separated from its neighbours by a hard edge. Nothing carried over a boundary, so the page read as a slide deck
of an agency template — and because the company has no proof to show (no clients, no statistics, no case
studies), those templates had nothing to fill them with.

The award-level sites solve exactly this. Three findings decide the whole direction:

- **Aspen Search** (SOTD, executive search): a strict visible grid with hairlines and deliberately *empty* cells
  is a complete art direction on its own. It reads as an institution with zero proof points.
- **United Carriers** (SOTD, freight): the page has a **continuity object** that travels through it and *causes*
  the section changes — the truck drives off and the ground it stood on rises to become the next section. The
  hero world is revisited mid-page at a different scale, so the page is one film, not a hero plus a brochure.
- **ERA Residence** (Site of the Month; sells 25 unbuilt apartments using only renders): section colours are
  **sampled from the imagery**, a dark anchor colour recurs four times down the page, and every seam is hidden
  by an overlapping foreground element or a shaped clip. Never a band boundary.

## 2. Concept — inside the disc

The hero ends with the camera inside the fifth world and the NEXORA title card. The site does not then cut to a
brochure: **we stay inside the model.** The circular diorama is the continuity object. It returns at three
scales:

| Where | Scale | What it does |
|---|---|---|
| Hero | the whole disc, rotating | the film |
| Chapter II, workforces | one wedge per card | the five worlds become throwable plates |
| Chapter III, the floor keeps turning | zoomed past the rim, behind the content | the loop video as a live ground |

Everything else is set on surfaces sampled out of that model: bronze base, warm studio light, the pale marble of
the Facilities floor. One lit space, with the camera moving through it.

Working line: **One world. Many workforces.** — unchanged; it is the concept and it is true.

## 3. Colour — an evolving grade, dark-anchored

Rejected: black band, white band, black band. Adopted: ERA's model — sample the imagery, rotate the grounds, let
dark recur, hide every seam.

Sampled from the footage: warm light `#c28456` · hospitality gold `#d9a45b` · events violet `#b07ce0` ·
facilities teal `#5fb8ae` · technical blue `#5b9be0` with orange `#e0793a` · recruitment cyan `#4fc3e8` · the
loop's backdrop, warm brown `#271c17` on the left and cool navy `#121924` on the right · divider-wall bronze
`#1d1510`.

The page script, top to bottom:

| # | Chapter | Ground | Note |
|---|---|---|---|
| 0 | Title card (end of film) | `#0b0a09` studio | the anchor |
| I | Manifesto — what Nexora is | `#17110c` ember, warm bronze light from the left | dark, warm |
| II | Five workforces (card stack) | per active world: a 6% tint of that world's colour over `#12100e` | the ground changes as cards are thrown — the colour event of the page |
| III | The floor keeps turning | `#0d1219` navy-black, video at 18% | dark, cool: the far side of the loop's own backdrop |
| IV | Sectors, then how an engagement runs | `#ded5c8` stone into `#e7e0d4` linen | the one light chapter: entered through a zoom-type transition, left through a rising arch |
| V | How we work (shouted lines) | `#12110f` ink with a bronze floor-glow | dark returns |
| VI | Two doors | `#1a1209` bronze-lit | warm dark |
| VII | Footer | `#0b0a09` studio | back to the anchor |

Dark at 0, I, II, III, V, VI and VII; light once, at IV — the reverse of the rejected alternation. No seam is a
straight horizontal line: I → II is a zoom-type transition, III → IV is the same transition into light, IV → V
is an arch clip rising out of the stone (ERA), V → VI is a bronze light bloom, and VI → VII has the footer's
wordmark already bleeding up into VI.

One accent per chapter, never two. Stone chapters mark with `--bronze-deep #7a4e2a`.

## 4. Type

Keep Instrument Serif for display and Instrument Sans for text; **add a mono for labels and metadata.** Every one
of the seven studied sites uses a mono or a tiny tracked-caps face for labels — the cheapest "institution"
signal there is (Aspen: Suisse Mono; United Carriers: Steinhart Mono; Lama Lama: Sometype Mono in square
brackets). We use **JetBrains Mono 400/500** at 10–12 px, `+0.14em`, uppercase.

The ladder is deliberately **gapped** (Aspen has nothing between 38 px and 80 px; Kononenko nothing between 14
and 30). You either read a caption or you read a monument:

```
label     11px  mono, +0.14em, uppercase
body      16px  /1.62
lead      20-22px /1.45
h3        30-38px serif
--- nothing here, on purpose ---
display   7.5-9vw  serif  lh 0.92  -0.02em
monument  14-22vw  serif  lh 0.82  -0.03em      one sentence = a whole scene
```

Rules taken from the study: display lines end in a full stop (Lama Lama); the last line of a statement drops to
50% opacity (White Desert); numerals are mono, in brackets — `(03)` — never in a coloured circle (Truck'N Roll,
Kononenko).

## 5. Composition

A **12-column grid with a visible 1 px hairline system** and deliberately empty cells (Aspen). Text blocks are
narrow — 3 to 4 columns — placed hard left or at column 7, never centred, except in the two shouting scenes.
Margins stay thin so content runs close to the edges and the empty cells do the breathing.

Pacing follows Truck'N Roll's dense/sparse alternation — every dense scene is followed by one that is a single
sentence:

```
I     manifesto       dense   statement + registry facts in a hairline table
II    workforces      dense   five cards, drag
III   floor turning   SPARSE  one sentence over moving video
IV-a  sectors         dense   ten rows in the hairline grid
IV-b  engagement      medium  five stations along a path
V     how we work     SPARSE  five shouted lines
VI    doors           medium  two
VII   footer          dense   a grid of useful cells
```

## 6. Motion, and the three required interactions

Shared motion language, so nothing looks borrowed:

```
--ease-freeze  cubic-bezier(0.16, 1, 0.3, 1)    arrivals: fast, then a dead stop (the film's own freeze)
--ease-io      cubic-bezier(0.65, 0, 0.35, 1)   symmetric moves
--ease-throw   cubic-bezier(0.22, 1, 0.36, 1)   cards leaving
180ms state · 520ms reveal · 760ms type
```

**A. Zoom-type chapter transition** (the Pinterest reference, measured frame by frame — see
`research/interaction-references.md`). Used exactly twice: I → II and III → IV. The measured curve is what makes
it read as a camera move rather than a CSS grow: the *logarithm* of the type's scale eases,
`s = exp(ln(30) * p^3.4)`, while the image behind it only reaches 1.9x. Seventy per cent of the duration is
spent below 2x; the last 15% covers 5x to 30x. The anchor is a glyph, not the viewport centre: we fly through
the counter of an **O**, so the next chapter is revealed through the hole. The incoming scene arrives already at
scale 1.0 and only resolves focus (12 px to 0 over 700 ms, ease-out) — a lens pulling focus, not a fade-in.
Built from two stacked copies, sharp and statically blurred, cross-faded on opacity (never an animated
`filter: blur()`), with the lock-up laid out at 4x inside a `scale(0.25)` wrapper so the GPU texture stays sharp.

**B. Pointer follower that morphs with context** (noho.ink: a 15 px dot, `border-radius: 100%`,
`z-index: 99999`, holding an icon child that swaps; the **native cursor is kept** — `cursor: auto` — and we keep
it too). States: `dot` 15 px → `label` (a pill carrying a word: the active world, "Drag", "Open") → `arrow`
(direction, on the stack and the gallery) → `drag` (open hand to grabbing, squashed along the drag axis) →
`media` (a 160 px preview of the sector still on sector rows). Trail: `k = 1 - exp(-dt/0.055)` on position, a
slower `0.12` on scale, and a velocity stretch capped at 1.18. Fine pointers only; gone for touch and reduced
motion; never over form fields.

**C. Throwable workforce cards** (lxlcreative: a pinned stack of 4:5 cards about 354x443, label bottom-left,
arrow bottom-right, each layer slightly rotated and scaled). Ours is genuinely physical rather than
scroll-driven: the drag follows the pointer 1:1, `rotation = clamp(dx * 0.055, ±14°)` about a pivot below the
card; releasing past 26% of the card's width **or** above 0.85 px/ms throws it along the release vector with
spin, and anything less springs back, critically damped, tau 0.14 s. The card underneath rises a level once the
top card passes 40% of the threshold, so the stack answers before the throw finishes. Thrown cards go to the
back, so the stack is a loop and can never empty. Keyboard: arrow keys on the focused stack plus two real
buttons. Touch uses the same pointer path. Without JS it is a plain list of five figures.

**D. The floor keeps turning** (brief C3). The loop video, zoomed to 1.35 and cropped past the rim, plays behind
the chapter. `playbackRate = clamp(1 + |v| * k, 1, 8)` with `v` the scroll velocity in viewport-heights per
second, damped back to 1x with tau 0.5 s. Video cannot play backwards, so scrolling up also speeds it forwards —
which is exactly why the crop sits past the rim, where the direction of rotation is unreadable. Paused
off-screen; a poster under reduced motion.

**E. Loading / intro** (brief B1). Arc'teryx System_0 is a black field with one 9 px tracked-caps line
assembling word by word; Lambert | Lambert is a white field where the **wordmark itself is the progress bar**,
its two halves drifting apart as the site loads. Both are one idea, tiny type, no spinner. Ours: studio black;
the five world names cycling in their own colours as real load progress passes each fifth; a hairline growing to
the measure's full width; a tiny mono percentage; and NEXORA tracking open from `0.02em` to `0.42em`. Progress
is the film's own bytes — poster, the loop video through a streamed `fetch` with `content-length`, and the 148
entry frames — so the first transition afterwards is instant. Minimum 5.0 s, maximum 7.5 s. It ends by opening
the hairline vertically into a full-height band (the divider-wall wipe of the film, reused) onto the disc
already turning. Full version once per session (`sessionStorage`), a 900 ms wipe on repeat visits, nothing at
all under reduced motion.

**F. Sound** — not in the brief; included because it differentiates and costs nothing. Every UI sound is
**synthesised with the WebAudio API**: no files, no licence, about 1.5 KB of code. A soft 1.2 kHz sine blip when
a card is thrown, a filtered noise sweep on chapter transitions, a low 80 Hz thud when a card lands. **Off by
default**, toggled in the footer, remembered in `localStorage`, never before a user gesture, never under reduced
motion.

## 7. Copy

The clever-negative voice goes, everywhere (brief C5). Confident, plain, positive, concrete:

| Was | Becomes |
|---|---|
| Ten sectors. Construction isn't one. | Ten sectors we staff. — the exclusion becomes a plain line at the foot of the chapter |
| Time stops. The work doesn't show. | Everything here was carried in by someone. |
| No numbers to show you yet. So here is how we work. | How we work. |
| services lead: Construction labour is not among them. | deleted; the scope line says what we do supply |
| industries: Not on this list | Something not listed? |
| 404: Time stopped. So did this page. | This page isn't here. |

Claim safety is unchanged and absolute: no clients, logos, statistics, years, certifications, testimonials,
turnaround promises, payroll / EOR / visa / healthcare, no construction; contact details stay empty until
supplied. Credibility comes from **specifics instead of statistics** (White Desert): the CR number, the
establishment date, the Doha location, Qatar Labour Law art. 33 behind the no-fee policy, and the named steps of
an engagement — every one of which is true today.

## 8. Imagery

The six approved CGI stills and the loop are the brand and carry every chapter. No stock photography: the
study's strongest sites (Aspen, United Carriers, Kononenko) use almost none either, and mixing graded stock into
this footage is the fastest route back to "template". Texture comes instead from a 2.4% film grain (a 180x180
tile generated at build), a halftone dot field over the ember ground (Lama Lama's trick, so a dark ground is
never actually flat) and hairlines.

Every image is masked by the grid, never floated on a shadow, and is either full-bleed, a 4:5 plate, or a small
3:2 detail crop.

## 9. Responsive

- **1280 and up** — the full 12-column grid with hairlines; follower on; cards dragged.
- **768–1279** — 8 columns; monuments drop from 22vw to 16vw; the stack keeps drag but sits above the copy.
- **Under 768** — single column, 1.25rem margin; monuments 20vw (Aspen goes *up* to 20.7vw on phones: big type
  is more mobile-appropriate, not less); follower off; cards keep touch drag with larger arrows; the turning
  floor plays at 960p; the hero keeps its lower-third copy.
- **Reduced motion** — no zoom transitions (a cross-fade instead), no follower, no video (poster), no intro, no
  sound; the card stack becomes a list.

## 10. Section-by-section blueprint

| # | Section | What it is | Reference behind it |
|---|---|---|---|
| I | **Manifesto** | Full-height ember scene. The statement as a monument on the left in 4 columns; beside it a hairline registry table (Based in / Registered / Established / Scope) in 12 px mono — Kononenko's credentials table. A 3:2 detail crop of the disc's rim sits in an otherwise empty cell. The chapter ends by flying through the O of a word. | Kononenko · Truck'N Roll · Pinterest |
| II | **Five workforces** | The throwable stack. Left: the world name in display serif, one outcome line, the roles in mono, and "Request this workforce". Right: the plate. The ground tints to the active world; a `(02/05)` counter in mono. | lxlcreative · ERA · noho |
| III | **The floor keeps turning** | One sentence at 14vw over the zoomed, scroll-reactive loop; a caption; and the four engagement types as hairline rows sliding over the moving ground. | brief C3 · Truck'N Roll · United Carriers |
| IV-a | **Ten sectors** | The Aspen grid: ten hairline rows, each with an index, a name and its roles in mono. Hovering a row raises a 160 px still into the follower and lifts the row's ground. Stone. | Aspen Search |
| IV-b | **How an engagement runs** | Kononenko's increasing fidelity: one scene, five stations along a drawn path, the illustration resolving from blueprint linework to the lit still as the stations pass. No numbered boxes. | Kononenko · United Carriers |
| V | **How we work** | Five commitments, each a shouted line at 9vw arriving on its own scroll beat, the small print beneath in mono. The three "we don't" lines are a quiet hairline footnote. | Truck'N Roll |
| VI | **Two doors** | Employer and candidate, two full-height panels lit from the floor in bronze; the follower becomes a labelled arrow over each. | Lama Lama |
| VII | **Footer** | A grid of useful cells: live Doha time, the CR number, the registered name, the two doors, the no-fee policy, the motion and sound toggles, and NEXORA at 17vw bleeding off the bottom edge. | Aspen · White Desert · Kononenko |

Subpages inherit the system: a monument head on the ember ground, then the same grid. **Services** is the five
worlds at full depth, one chapter each, alternating ember and stone. **Industries** is the sector grid,
expanded. **About** is the manifesto plus the registry and the policy. **Request**, **Careers** and **Contact**
put the existing form engine on stone, styled as the hairline grid with 64 px transparent inputs and mono labels
(Truck'N Roll's form). **Privacy** is a single measure column on stone. **404** is a monument line with the
footer rising underneath.
