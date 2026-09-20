> **DONE — session 2 (21 Sep 2026).** Every item in this file was addressed. The hero fixes are in
> `docs/redesign/01-BUILD.md` §1, the intro in §2, the redesign in `docs/redesign/00-DIRECTION.md`, and the
> research behind it in `docs/redesign/research/`. This file is kept as the record of what was wrong and why.

# Nexora — Session 2 handoff

Written at the end of session 1 (21 Sep 2026). Session 1 built the whole site; the client reviewed it and
**approved the hero's visuals but rejected almost everything else**. This file gives the next session the technical
state, the client's issues with a diagnosis of each, and the tooling quirks of this machine.

Read order: this file → `nexora_website_context/01_SOURCE_OF_TRUTH.md` (claim guardrails, still binding) →
`docs/implementation/04-HERO-IMPLEMENTATION.md` (how the hero works) → `README.md`.
The other docs in `docs/implementation/` describe the REJECTED post-hero design; treat them as history, and update
them once the new direction is decided.

---

## 1. State of the project

- Astro 7, static output, TypeScript, no UI framework, no animation/scroll libraries. `npm run dev` → :4321.
  `npm run check` = 0 errors. `npm run build` = 9 pages.
- `/media` originals are untouched and must stay that way. Derivatives are in `public/media` (built by
  `npm run media`; needs ffmpeg).
- All copy/config is in `src/data/` (`site.ts`, `worlds.ts`, `content.ts`). Contact details and form endpoints are
  intentionally empty (forms run in a labelled preview mode).

### What is GOOD and must be kept (client likes it)
- The film's look: single-canvas renderer, the floating disc with the blurred "surround wash", the five frozen worlds,
  portrait crops for mobile, the sharp "HD settle" still, and the **NEXORA title-card mask** (pull-back from inside the X).
- The media pipeline and its findings (see §4).
- Static fallbacks: no-JS and reduced-motion render the hero as six ordinary sections using the high-res PNG stills.
- The form engine (`src/scripts/forms.ts`): steps, validation, error summary, `?workforce=`/`?sector=` prefill,
  preview mode, lost-click fix. Keep the logic; restyle freely.
- Claim-safety of the copy (no stats, clients, years, certifications, construction, payroll/EOR/visa/healthcare).

### What is REJECTED
Everything visual after the title card, on the homepage and all subpages: the alternating flat black / flat paper
sections, the layouts, the section concepts, the colour handling, parts of the copy tone. Redesign from scratch.

---

## 2. File map

```
src/components/hero/Hero.astro     hero markup + ALL hero CSS (.ch copy blocks, .hud, scrims, static fallback)
src/scripts/hero/index.ts          state machine: modes idle → settle → scrub, dipTo(), animateTo(), maybeSettle(),
                                   feed() (loading policy), gate() (never enter unloaded frames), updateHD()
src/scripts/hero/timeline.ts       PURE. u = viewport-heights of scroll. DWELL {overview .4, rest .5, title .3},
                                   TRAVEL {entry 2.0, sector 1.3, exit 1.2}, portrait ×0.8. restAt[], locate()
src/scripts/hero/loader.ts         Sequence: ordered loading, contiguous-range bookkeeping, decode look-ahead, release
src/scripts/hero/renderer.ts       canvas sizing, fit(e) contain→cover with focus centre, surround wash + feather
src/scripts/hero/mask.ts           NEXORA knock-out (Path2D from src/data/wordmark.json), exponential zoom about the X
src/scripts/hero/ui.ts             which copy block is active, glyph/numerals/timecode, scrims, canvas aria-label
src/components/home/*.astro        Statement, Workforces (deck), Sectors, Process, PlateBreak, Commitments, Doors  ← REJECTED
src/components/{Header,Footer,MenuSheet,Wordmark}.astro, ui/{Arrow,PageHead}.astro
src/scripts/{deck,cursor,header,menu,reveal,process,plate,forms,motion,app}.ts
src/styles/{tokens,base,forms}.css tokens.css holds palette + type scale
src/pages/                         index, services, industries, about, request, careers, contact, privacy, 404
scripts/build-media.mjs            originals → public/media + src/data/media-manifest.json
scripts/build-wordmark.mjs         Instrument Sans 700 outline → wordmark.json, public/wordmark.svg, favicon
```

QA hooks already in the code: `/?nosettle` (disables auto-settle), `[data-hero][data-mode]`
(`idle | settle | scrub | dip`, with `+auto` while a programmatic scroll runs), footer "Reduce motion" toggle
(`localStorage nx-motion = on|off`, read pre-paint in `src/layouts/Base.astro`).

---

## 3. The client's issues, with diagnosis

### Hero (keep the visuals, fix these)

**H1. World copy must be vertically centred on the left.** Today `.ch { display:flex; align-items:flex-end }` in
`Hero.astro` puts it bottom-left. For the five world chapters in cinema mode use vertical centring in the left ~38%.
Rebalance `.hero__scrim` (it currently has a bottom gradient tuned for bottom copy). Check portrait separately —
centred copy would sit on top of the action there, so portrait probably keeps lower-third copy; decide and verify.
Apply the same to the static fallback. Decide the overview headline placement deliberately (client only named the 5 worlds).

**H2. Remove the HUD.** "Skip film", the pause/timecode button, the wedge glyph, the 01–05 numerals and the
"Scroll to enter" hint all go — the client says they ruin the feel. It is the `.hud` block in `Hero.astro`.
`ui.ts` dereferences `hud` with `!` and updates glyph/jumps/timecode every frame → make it null-safe or delete that
code; `index.ts` wires `[data-jump]`, `[data-skip]`, `[data-pause]`. Accessibility still needs *something*: the
existing visually-hidden "Skip to content" link already jumps past the film, and the footer motion toggle covers
pausing. Keep both.

**H3. Hide the vertical scrollbar** site-wide (`scrollbar-width: none` + `::-webkit-scrollbar { display:none }` on
`html`), keeping scrolling fully functional (wheel, touch, keyboard).

**H4. First transition (overview → Hospitality) does not start properly.** Cause: the SETTLE state. The user can
scroll at any rotation angle, but the entry clip begins at one pose, so the loop video is raced to its seam for up to
1.6 s while the playhead is *held* — scroll appears to do nothing. Then the clip's first ~12 frames are slow,
loop-speed rotation, so even after hand-off little happens.
Client's suggestion (good): **start the entry clip ~2 s in.** Clip facts (192 frames @ 24 fps): 0–12 slow rotation ·
12–24 accelerating · 24–84 heavy motion-blurred spin + dive to the hub · ~96–108 wall wipe · 108–191 Hospitality
action then freeze. Starting at ≈ frame 40–48 lands in the blurred spin, where the rotation angle is unreadable, so:
the seam no longer matters → **delete SETTLE entirely**; hand off from whatever loop frame is showing with a
~120 ms cross-fade into the first blurred frame. Cheapest implementation: no media rebuild — map the entry's local
progress onto `[start..last]` in `renderAt()` and make the loader skip frames `< start` (saves ~2.5 MB). Mobile entry
set has every 2nd frame (97 files) — index accordingly.

**H5. "It takes two scrolls to change world." Must be one; several fast scrolls must also chain smoothly.**
Cause: the hero is *scrubbed* — each transition spans 1.3 viewport-heights of scroll plus 0.5 dwell, and one wheel
notch / flick covers far less. Auto-settle only completes forward after 160 ms idle and only past 12% progress,
otherwise it snaps back. So one gesture ≠ one transition.
Required model: **gesture-stepped, time-played.** One scroll intent (wheel, trackpad flick, touch swipe, ↓/PageDown/
Space) plays the whole transition at natural speed to the next frozen rest; reverse plays it backwards. Input that
arrives *during* a transition is queued: chain the next transition seamlessly, speed playback up (≈1.5–2×) when
something is queued, and for ≥ 3 queued steps cut through the divider-wall "dip" to the final target rather than
grinding through everything. Must never double-fire from one trackpad gesture (inertia emits wheel events for ~1 s —
detect the gesture, don't just debounce) and never get stuck. The title-card exit becomes one more step, after which
native scrolling takes over; scrolling back up from the page re-enters the hero at the title card.
Suggested route (least rewrite): keep the tall sticky container, `timeline.ts`, `renderer`, `loader`, `mask`; add an
input controller that, while the hero is pinned, consumes wheel/touch/keys (non-passive listeners) and drives the
existing `animateTo(tl.restAt[i], seconds)`. The loader's gating still applies: if frames aren't ready, dip to the
rest still. This overrides session 1's "no scroll-jacking" rule — update docs 04/05.

### First load

**L1. A proper 5–7 s loading / intro sequence**, inspired by Arc'teryx System 0 and Lambert | Lambert (restraint,
tiny type, one idea). Make it *useful*: it is the window to really preload the poster, loop video, rest stills and
the entry frames (10.8 MB desktop / 4 MB mobile), which also guarantees H4 is instant. Tie progress to real loading
with a minimum duration; end with a reveal into the rotating disc (iris / mask / wordmark). Show the full version
once per session (sessionStorage), a short version on repeat visits, none under reduced motion. Overrides session
1's "no preloader".

### Everything after the title card

**P1. Redesign from scratch.** The client's words: pure AI slop, the worst kind — flat black sections, flat white
sections. Every section must be re-thought: what it is for, its composition, its imagery, its motion. Study **at
least 20 sites on https://www.awwwards.com/websites/** in a real browser (interact, scroll, note pacing, type,
colour, transitions) before designing. Extract principles; do not copy. The bar is "could win an award".

**P2. Use the three interaction references in the post-hero site** (session 1 under-delivered on all three):
- Zoom transition — https://se.pinterest.com/pin/955748352150878388/ : type scales past the viewport while the
  image zooms, scene swaps while masked, new scene arrives soft and settles. Use between major chapters.
- Multi-use pointer follower — https://noho.ink/ : a follower that morphs with context (dot → label → arrows →
  media preview). Session 1 only trails a small text chip beside the native cursor (`cursor.ts`). Fine pointers
  only, off for touch/reduced motion, never over form fields.
- Tinder-style service cards — https://www.lxlcreative.co.uk/ : a physical, throwable stack. Session 1's `deck.ts`
  works mechanically (drag/keys/buttons, list fallback) but the presentation was rejected.

**P3. Rotating-world background section.** Reuse `public/media/hero/loop-1440.mp4` (already cached from the hero;
15 s seamless clockwise turn) as a slightly zoomed, continuously rotating background for one section while content
scrolls over it. Scroll velocity drives rotation speed: `playbackRate = 1 + k·|scroll velocity|`, clamped (Chrome's
max is 16; keep ≤ ~8), damped back to 1× when scrolling stops. It should feel as if the video responds to scroll
while really only the content moves. Video cannot play backwards — speed up forwards in both directions. Pause
off-screen; poster under reduced motion; scrim for legibility.

**P4. Copy the client called stupid — remove or rewrite:**
- "Ten sectors. / Construction isn't one." → hard-coded heading in `src/components/home/Sectors.astro`
- "Time stops. / The work doesn't show." → `plate.line` in `src/data/content.ts`
The same "clever-negative" voice appears elsewhere and should be reviewed in the same pass: commitments heading
"No numbers to show you yet. So here is how we work." (`content.ts`), services lead "Construction labour is not
among them." and industries "Not on this list" block, 404 "Time stopped. So did this page." Aim: confident, plain,
positive. Claim-safety rules still apply.

**P5. Colour.** Design a deliberate palette / colour grade across sections — consistent or evolving, but beautiful
and intentional, not black-then-white. Tokens live in `src/styles/tokens.css`. Useful raw material, sampled from the
footage: common warm light `#c28456`; hospitality gold `#d9a45b`, events violet `#b07ce0`, facilities teal
`#5fb8ae`, technical blue `#5b9be0` (+ orange `#e0793a`), recruitment cyan `#4fc3e8`; the loop's backdrop is warm
brown on the left (`#271c17`) and cool navy on the right (`#121924`).
**Stock imagery is now allowed** (session 1 forbade it): licence-clean only (Unsplash / Pexels or similar), saved
into the repo with a sources file; GCC-appropriate — no alcohol, modest dress, no construction sites, mixed
nationalities shown with dignity, Doha/Qatar context where possible; grade it to sit with the hero footage.

---

## 4. Media facts that must not be re-learned the hard way

- The `*-final.png` stills are **reference compositions, not the frames the videos land on** (SSIM 0.35–0.41). Swapping
  to them at rest would pop. Rest states use each clip's own last frame (`public/media/hero/rest/*`); the PNGs
  (1672×941, sharper) are for non-continuous uses: static hero, cards, plates, subpages.
- `overview-master.png` is not the loop's first frame; the poster is extracted from the loop.
- Clip-to-clip joins are clean (SSIM 0.94–0.96, zero offset). Sector clips: 121 frames; action ≈ 0–40, pan 40–56,
  wall fully occludes ≈ 56–72, emerge 72–96, action + freeze 96–120.
- Untagged clips are treated as BT.709 everywhere so video, frames and stills match.
- The human action sits at x ≈ 0.72 in every scene → one 4:5 portrait crop serves mobile.
- Benchmark: WebP frames on canvas = 0.6 ms per decoded frame (9 ms cold); video seeking is slower and approximate.
- Payload if a visitor watches the whole film: ≈ 38 MB desktop, ≈ 17 MB mobile, loaded progressively.

---

## 5. Tooling quirks on this machine (will save an hour)

- **gstack `/browse` is mandatory for web browsing** (user's global CLAUDE.md). On this PC the username equals the
  computer name (`AJ\AJ`), which breaks browse's ACL step. Every browse command needs
  `export USERNAME='AJ\AJ'` and must run with the sandbox disabled. If it says "Another instance is starting the
  server" forever: `icacls "C:\Web UI\Nexora\.gstack" /reset /T` (PowerShell), then retry.
- The browse daemon occasionally restarts: you are back on `about:blank` at 1280×720. Re-set the viewport and `goto`.
- CDP network / media emulation is not allow-listed in browse. To test no-JS and slow networks, serve `dist/` from a
  tiny Node static server that strips `<script>` when `?nojs` is present and delays `/hero/seq/` responses.
- `npx astro dev --background --port 4321`, stop with `npx astro dev stop`. **The dev server served stale CSS/JS twice**
  after edits — if a change doesn't show, restart it before debugging.
- Astro scoped styles don't reach a child component's element unless the child spreads `...rest`
  (`Wordmark.astro`, `Arrow.astro` already do).
- ffmpeg here has no glob input (use `%02d`); sharp honours only one `resize` per pipeline (extract first, then resize).
- **Context discipline:** session 1 ran to 67% context, mostly from screenshots and dumps. Montage screenshots into
  small contact sheets (ffmpeg `tile`), keep `browse js` probes to a few fields, never print `document.body` text,
  read files with offset/limit.
- Not yet tested anywhere: Safari / iOS.
