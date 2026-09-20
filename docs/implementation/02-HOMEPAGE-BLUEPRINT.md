> **SUPERSEDED — session 1.** The client rejected the post-hero design this file describes. It is kept only as
> a record of what was tried. The current direction is `docs/redesign/00-DIRECTION.md` and the current build is
> `docs/redesign/01-BUILD.md`.

# 02 — Homepage Blueprint

Each section states **why it exists**, **what it says**, **how it behaves**, and **how it adapts**.
Copy is in `06`; motion detail in `05`; the hero's internals in `04`.

---

## 0. Hero — *One world, many workforces* (dark, pinned, ~11.6 viewport-heights of scroll)

**Why** The brand's entire differentiation. It answers "what is Nexora?" without a paragraph: one company, five
kinds of workforce.

**Layout (desktop)** UI sits only at the four corners; the centre belongs to the image.

```
┌───────────────────────────────────────────────────────────────┐
│ NEXORA                                Services Industries …   │
│ Hospitality & Services                       [Request workforce]
│ Doha, Qatar                                                   │
│                     (  the rotating world  )                  │
│                                                               │
│ Workforce solutions — Qatar                                   │
│ One world.                                     ◔ 00 / 05      │
│ Many workforces.                        Scroll to enter · Skip│
└───────────────────────────────────────────────────────────────┘
```

Inside a world the copy moves to the protected left 38%: numeral `01 / 05`, the sector title in the display serif
stacked over two or three lines, one outcome sentence, one quiet link. A left-edge scrim (studio black → transparent
at 46%) guarantees contrast without touching the right-side action.

**Behaviour** Scroll is time. Transitions scrub; rest states hold; if the user stops mid-transition the film finishes
the move on its own at natural speed (`04`). A five-wedge glyph shows position and is the keyboard/pointer way to
jump between worlds. A small timecode runs while time moves and stops when it freezes — the only ornament, and it
explains the mechanic.

**Exit** The title card (`00`, `05`).

**Adapts** Portrait: disc contained in the upper half, headline beneath it; worlds use a portrait crop centred on the
human action with copy over a bottom scrim. Reduced motion / no JS / Save-Data: see `07` and `09`.

---

## 1. Title card + statement (dark)

**Why** Ends the film, names the company, states the positioning. It is the hinge between the two registers.

**Says** `NEXORA` (windows onto the last frozen frame) · *The people behind smooth operations.* · a three-sentence
definition of the company · four facts set as a definition list: **Based in** Doha, Qatar · **Registered** CR 250993 ·
**Established** 2026 · **Scope** Hospitality, events, facilities, technical, recruitment.

**Behaviour** The wordmark is the resting state of the hero's pinned stage and scrolls away with it. The statement
block below is ordinary flow. Lines reveal once, on entry. Nothing else moves — this is the stillness beat.

---

## 2. Five workforces — the deck (dark)

**Why** The service presentation, and the one place the site is *tactile*. It re-uses the five approved reference
stills at full quality (the hero shows video-resolution frames; here the 1672px originals get their moment), cropped
4:5 onto the human action.

**Layout** Left 5/12: numeral, title, outcome line, description, "Typical roles" as a comma-free stacked list,
link **Request this workforce →**. Right 6/12: the deck — three cards visible, the top one 4:5 at ~min(34vw, 62vh)
tall, the two beneath offset and rotated 3° / −2°. Under the deck: `← →` buttons and `02 / 05`.

**Behaviour** Drag or flick the top card past 28% of its width (or 0.5 px/ms) and it leaves with rotation, returning
to the back of the stack; the next card springs forward and the panel cross-fades to its content. The numeral and
hairline take that sector's accent. Arrow keys, the two buttons and swipe do the same thing. A `DRAG` label trails
the native cursor while it is over the deck — the affordance is otherwise invisible, which is the cursor's reason to
exist.

**Accessible structure** Underneath it is an `<ol>` of five `<article>`s, each with its own heading, text, roles
and link. JS upgrades it to a deck; without JS or with reduced motion it renders as that list in a two-column grid.
The detail panel is `aria-live="polite"`; the deck is `role="group"` with `aria-roledescription="carousel"`.

Below the deck, one quiet row of four definitions: **the ways to engage** (short-term cover · contract teams ·
project-based crews · permanent recruitment) linking to `/services/#engage`.

---

## 3. Sectors — the index (paper) ← hard cut from dark

**Why** Employers self-identify by sector before they read anything else. Wings' strongest content is
sector-specific; this matches that clarity in a tenth of the space.

**Layout** A typographic index: ten rows, each `numeral · sector name (display serif, ~clamp(1.75rem, 3.4vw, 3.25rem)) · roles`.
Hairline between rows. No images, no icons — after the deck, the eye needs type.

**Behaviour** On hover/focus a row's name shifts 12px inline-start→end and its roles line goes from 55% to 100% ink;
the others dim to 35%. Rows are links to `/industries/#sector`. On touch all roles are simply visible.

---

## 4. How an engagement runs (paper)

**Why** Procurement people need to know what happens after they send a requirement. It is also the most credible
thing a new company can publish, because it is a promise about behaviour rather than a claim about history.

**Says** Five steps — Brief · Source · Screen · Deploy · Support — each with two sentences and **what you approve** at
that step.

**Layout / behaviour** Love + Money's constant-layout idea: a sticky left column holds a very large numeral and the
step name; the right column scrolls the five steps. As each step crosses the middle of the viewport the numeral
changes (vertical slide, hard stop). CSS `position: sticky` + one IntersectionObserver. On mobile the numeral sits
inline above each step and nothing is sticky.

---

## 5. Plate (dark) ← hard cut

**Why** A breath. After two information sections, one approved still at full bleed with a single sentence —
Lambert's lesson that the image can simply be allowed to be there.

**Shows** The Facilities still (the calmest, most spacious composition), `object-position` biased to the action,
with a caption chip bottom-left: `Plate 03 — Facilities & Support · time stopped mid-fold`. One line of display type
across the calm left side.

**Behaviour** A slow 1.06→1.0 scale tied to scroll position while it crosses the viewport. Nothing else.

---

## 6. What to expect (paper)

**Why** The "why Nexora" section, without superlatives or numbers.

**Says** Five commitments written as plain behaviours, then a short **What we don't do** list.

**Layout** A two-column staggered list: commitment title in the display serif, one sentence beneath, hairlines.
No cards. The "don't" list is set smaller, in a bordered block — deliberately unglamorous.

---

## 7. Two doors (dark)

**Why** The conversion moment, for both audiences, with an unmistakable hierarchy.

**Layout** Two full-height panels split 7/5. Left (primary): **I need people.** → `/request/`. Right (secondary):
**I'm looking for work.** → `/careers/`. Each has two lines of expectation-setting microcopy. The whole panel is the
link. On hover the panel fills with bronze (employers) or lifts to a lighter black (candidates) and the arrow
travels.

---

## 8. Footer (dark)

Giant `NEXORA` wordmark (same vector as the title card) cropped by the bottom edge of the page · three link columns ·
legal line: `© 2026 Nexora Hospitality and Services W.L.L. · Commercial Registration No. 250993 · Doha, Qatar` ·
contact lines render only when real values exist in `src/data/site.ts`.
