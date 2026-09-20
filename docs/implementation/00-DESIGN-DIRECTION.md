> **SUPERSEDED — session 1.** The client rejected the post-hero design this file describes. It is kept only as
> a record of what was tried. The current direction is `docs/redesign/00-DIRECTION.md` and the current build is
> `docs/redesign/01-BUILD.md`.

# 00 — Design Direction

## The idea in one line

**The hero is the film. The rest of the site is the programme that accompanies it.**

The diorama hero is a cold open: no logo lock-up, almost no UI, one visual idea. It ends the way films do — with a
title card. Everything after that is an editorial programme: numbered chapters, hairline rules, very large serif
statements set against very small sans labels, and the approved stills used as plates rather than decoration.

This gives the site two registers that belong to one system:

| | Cinema (hero) | Programme (everything after) |
|---|---|---|
| Surface | Studio black, full-bleed image | Studio black **and** warm paper, hard cuts between them |
| Type | Tiny UI at the four corners, one headline | Huge serif statements, 11px uppercase labels |
| Motion | Scroll = time. Everything moves | Almost nothing moves. One interaction per section |
| Colour | The five sector palettes, from the footage | Bronze only; sector colour appears only when a sector is "active" |

## What was learned from the references (principles, not layouts)

| Reference | What was actually observed | What Nexora takes | What Nexora leaves |
|---|---|---|---|
| Arc'teryx System 0 | Fixed 100vh stage. One short headline. Wordmark + two-line descriptor top-left, a five-word text nav, no bar, no buttons. The "system" is a hairline diagram with numerals I–V. | UI lives at the corners at ~11px. A five-part diagram *is* the navigation → our five-wedge progress glyph. | Wheel-hijacked chapter stepping. We keep native scroll. |
| Lambert \| Lambert | Image at wildly varied scale; entire UI is a centred wordmark tag and a caption chip under each image. | Caption chips under plates; never let type compete with an approved still. | Horizontal-only navigation. |
| Love + Money | One hard colour field, then a calm system. A pinned three-column layout stays constant while only numeral / title / image swap. 96px titles against 9px body. | Constant layout + swapping content for the Process chapter. Hard dark↔paper cuts. Extreme scale contrast. | Loud flat colour. Our colour comes from the footage. |
| Pinterest zoom | Calm → type scales past the viewport while image zooms → near-black masked beat → new scene arrives soft → calm. ~1.5s / 0.7s / 0.3s. | Type as a transition mask, used **once**: the hero exit. Inverted (see below). | Repeating it between sections. |
| Noho | A 15px dot that scales and reveals an arrow glyph: the cursor *becomes* the carousel control / drag hint. | A contextual label that appears only where an affordance is otherwise invisible (DRAG on the deck). | Replacing the native cursor. Ours augments it. |
| LxL Creative | Pinned stage; 411×514 portrait cards stacked in one spot beside a static text block; cards carry only a label. | Tactile portrait deck for the five workforces. | Cards as the only carrier of information. Ours drive a real detail panel and degrade to a plain list. |
| Wings MEA | Early employer/candidate split; industries → services → consultation form → values → careers. Also: broken "0+ Years / 0+ Clients" counters on the live homepage. | The two-sided journey and the content depth. | Everything visual, all claims, the stat counters, budget/website form fields. |

## The signature move: the title card

The open question in the brief was the hero → website hand-off. Decision: **the film ends on a title card, and the
world you were just inside turns out to be inside the company's name.**

At the end of the Recruitment dwell a studio-black layer closes in from beyond the viewport. It is the word
**NEXORA** cut out of black, scaled ~60× so the viewport sits entirely inside the crossing of the **X**. As the user
scrolls it scales down to 1× and comes to rest as a full-width wordmark whose letters are windows onto the frozen
scene. Under it: *The people behind smooth operations.*

Why this and not the alternatives in the idea bank:

- It is the Pinterest technique (type as mask, calm → aggressive → calm) but **reversed into a pull-back reveal**, which
  is a camera move, so it belongs to the film rather than being a web effect bolted on afterwards.
- It solves "cinematic experience ends, normal page suddenly appears": the last frame of the film *is* the first
  element of the page, and it scrolls away like any other block.
- It justifies the hero's restraint. The wordmark stays tiny for eleven screens because the title is being saved.
- It needs no sixth video clip and hides nothing generative, so it cannot break.

## Rhythm of the homepage

`motion → stillness → interaction → information → stillness → information → conversion`

1. **Hero** — motion (dark)
2. **Title card + statement** — stillness (dark)
3. **Five workforces** — the one tactile interaction: the deck (dark)
4. **Sectors** — dense typographic index (paper) ← hard cut
5. **How an engagement runs** — pinned numeral, constant layout (paper)
6. **Plate** — one full-bleed approved still, one sentence (dark) ← hard cut
7. **What to expect** — commitments instead of statistics (paper)
8. **Two doors** — employers / candidates (dark)
9. **Footer** — cropped giant wordmark, legal identity

No section uses more than one dominant behaviour. Sections 4, 5 and 7 are deliberately quiet: the hero has already
spent the motion budget.

## Credibility without fabrication

The company was established on 07 September 2026. The site does not hide that; it says **Established 2026** and makes
newness read as confidence. In place of numbers, logos and testimonials it uses:

1. **Verifiable legal identity** — full legal name and CR 250993 in the statement block, About page and footer.
2. **A transparent process** with what the client approves at each step.
3. **Written commitments** ("What to expect") phrased as behaviours, not superlatives.
4. **A "what we don't do" block** — no candidate fees, no construction labour.
5. **Craft.** A new company that ships this level of finish is signalling how it operates.

Structural slots for future proof (client logos, case notes, certifications) are documented in
`06-CONTENT-AND-COPY.md` but are **not rendered** until real content exists. Nothing on the site says "coming soon".

## Anti-patterns explicitly rejected

Centred hero copy over the disc · alternating image/text rows · icon grids · stat counters · gradient blobs ·
glass cards · pill-shaped everything · a floating WhatsApp bubble · a dead Arabic toggle · stock photography ·
scroll-jacking · a cursor that replaces the pointer.
