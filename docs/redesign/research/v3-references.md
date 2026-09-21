# Session 3 — reference notes

Each site was opened in a headless browser, captured as scroll contact sheets, and where possible its
production script was read. Principles only; no layout was copied.

## ERA Residence (era-residence.com) — the main reference
Webflow + GSAP 3.15 (ScrollTrigger, SplitText, CustomEase) + Lenis 1.3 + Barba. Script read in full.
- Eases: InOut .75,0,.25,1 · Out .25,1,.5,1 · In .5,0,.75,0 · Ease .25,.1,.25,1 · diveIn .6,0,0,1. Durations .4/.8/1.2, stagger .1.
- Lenis duration 1.2, `1.001 - 2^(-10t)`. `history.scrollRestoration = 'manual'`, scroll to top on load.
- Preloader ends with an ARCH (`--arch-w 24vw → 36vw`, `--arch-y 104vh → 15vh`, then `125vw / -100vh` on diveIn)
  while the hero image scales 0.75 → 1.
- Hero → next: content translates up faster than the background, background scales 1 → 2 about 50% 75%; a giant
  circle rises with curved text on its rim.
- Grounds: aubergine #340C24, powder sky #B5CEDB, cream #F3F3EC — three, recurring.
- Seams hidden by bougainvillea cut-outs on their own parallax; one cloud bank parting onto an aerial photo.
- Image windows grow to full bleed; a pinned section scales to 2x and fades (amenities); horizontal pinned
  section with a drawn map path; arch clip-path opening (`arch-scroll-area`, scale 1 → 1.84); footer image clips
  `inset(0) → inset(8% 22%)` while content scales 0.75 → 1.
- Text: chars rotateX 90 → 0 from x 10rem (A); chars rotateY 90 → 0, yPercent 50 (H); lines masked yPercent 110 (P).
- Snap to `[data-snap]` sections 40 ms after scroll stops (desktop); scroll rail with a 00–100 counter; the
  circular logo badge spins at 30°/s + 10 × Lenis velocity.

## lxlcreative.co.uk
One orange line draws itself down the whole page, threading sections together. Script accents over heavy caps.
Hero image grows from a small frame to full screen. Pinned card stack for services.

## cerebrium.ai
"Click and hold" on the WebGL hero: holding builds velocity (light streaks accelerate), releasing decays it.
Used for the held world.

## unitedcarriers.com
A continuity object (a container) is carried through every scene: reach stacker → truck → road seen from
above → ship. Each section is caused by the last. Used for the photograph that becomes the deck's first card.

## noho.ink
Cursor read from its bundle: a ~1.04vw disc, `gsap.quickTo(x|y, { duration: 0.4, ease: 'power2.out' })`,
`width/height/background` tweened over 0.4 s by `[data-type]` on hovered `.layout` elements, text/icon children
faded in, a 0.9 → 1 pulse on click, and a hover re-sync after scroll (elementFromPoint).

## loveandmoney.com
A pinned "playbook": tall photograph on the left that changes per step (pixel-mosaic dissolve), numbered steps
("01 Find our humans") in the centre, a filmstrip of thumbnails scrolling up the right edge. Used for employers.
