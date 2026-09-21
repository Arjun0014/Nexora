> **Superseded** for everything after the hero by `02-DIRECTION-V3.md` / `03-BUILD-V3.md` (session 3). The hero sections still apply.

# What was built — session 2

Companion to `00-DIRECTION.md` (the decisions) and `research/` (the evidence). This file is the engineering
record: what each part does, why it works the way it does, and what was measured.

---

## 1. The hero, rebuilt as a stepped film

The visuals are unchanged. The engine underneath them is not.

### Stops and legs (`src/scripts/hero/timeline.ts`)

The old timeline measured the hero in `u` — viewport-heights of scroll — and the film was scrubbed against it.
It is now a row of **stops** joined by **legs**:

```
0 overview ─leg 0 (entry)→ 1 Hospitality ─leg 1→ 2 Events ─leg 2→ 3 Facilities
         ─leg 3→ 4 Technical ─leg 4→ 5 Recruitment ─leg 5 (exit: NEXORA mask)→ 6 title card
```

The playhead `p` is a float in `[0, 6]`. An integer means "at rest on that stop"; the fraction is progress
through leg `⌊p⌋`. Legs are **played in time** at the footage's own 24 fps, never scrubbed. The hero element is
now exactly one viewport tall: the page behind it does not grow to make room for scrolling that no longer
happens.

### One gesture, one leg (`src/scripts/hero/input.ts`)

The module turns raw input into discrete step intents, which is the whole of brief A5:

| Device | What arrives | How one intent is recognised |
|---|---|---|
| Mouse wheel | separate notches | notches closer together than 200 ms are one roll of the finger |
| Trackpad | a decaying stream, inertia lasting ~1 s | the whole stream is one intent; a second flick shows up as the deltas **growing again** after they had died down (`mag > floor * 3 + 18`, and at least 260 ms after the last intent) |
| Free-spinning wheel | equal notches that gradually slow | a pause only starts a new gesture when it is long *relative to the stream's own rhythm* (`gap > prevGap * 2.2`), so a wheel coasting to a stop stays one intent |
| Touch | one drag | one intent per touch, fired the moment the swipe passes 26 px |
| Keys | ↓/↑/PageDown/PageUp/Space/Home | one per press; auto-repeat throttled to 420 ms |

Ownership is decided **once per gesture**, not per event. If the hero claims a gesture it cancels every event of
it, inertia tail included, so the tail can never leak into the page as a native scroll. If it does not claim it,
the gesture is the browser's and can never step the hero — even if the page reaches the top while its tail is
still arriving.

### Playing a leg (`src/scripts/hero/index.ts`)

`advance()` moves `p` toward `target` in **wall-clock time**, so a slow device drops frames rather than playing
in slow motion. Up to two further stops may be queued; each queued stop adds 0.85 to the playback speed, and a
change of mind eases velocity through zero (tau 0.13 s) and plays the leg backwards. The playhead is clamped to
the contiguously-loaded range of the sequence in the direction of travel, so a starved network makes the film
lag behind the gesture rather than flash. If frames stay missing for 1.2 s the stage dips through the
divider-wall bronze onto the destination's rest still.

Because `p` only ever comes to rest on an integer, **the film cannot be left between two states** — the
invariant the old auto-settle machinery existed to protect.

### Starting inside the spin (brief A4)

`ENTRY_START_FRAME = 44`. The entry clip's first frames turn at idle speed from one specific pose, which is why
the old build had to race the loop video to its seam (up to 1.6 s of apparently dead scroll) before anything
could move. Frame 44 is inside the motion-blurred spin, where the rotation angle is unreadable, so **any** loop
frame can hand off to it through a 200 ms cross-fade of a frozen copy of the stage. `SETTLE` is deleted. The
skipped frames are never requested — the loader takes a `first` index — which also removes ~2.5 MB from the
entry set.

Coming back the other way, the loop is restarted at 5× and eased to 1× over 1.6 s, so the disc picks the spin up
rather than snapping to a crawl.

### Copy and scrims (brief A1, A2)

World copy is vertically centred in the calm left third, and the scrim became a soft radial pool around it
instead of a full-height bottom band, so the scene keeps its corners. Portrait deliberately keeps a lower-third
block: the portrait crop is built around the action at x ≈ 0.72, which fills the middle of the screen, and
centred copy would sit on the people.

The HUD is gone entirely. Accessibility is carried by the visually-hidden skip link, the footer motion toggle,
the canvas's live `aria-label`, and the fact that every chapter's copy is real DOM in reading order.

### Scrollbars (brief A3)

`scrollbar-width: none` plus `::-webkit-scrollbar { display: none }` on `html, body`. Scrolling by wheel, touch,
keyboard and anchors is untouched.

---

## 2. The intro (brief B1)

`src/components/Intro.astro` + `src/scripts/intro.ts`.

Which version runs is decided **before first paint** by the inline script in `Base.astro`, which sets
`html[data-intro="on" | "short"]`. That is why the film is never visible for a frame first. Without JS the
attribute is never set and the markup never displays.

Progress is real. `heroLoad.progress` is a weighted sum of the poster, the loop video's own bytes (streamed
through `fetch` with `content-length`, then handed to the `<video>` as a blob URL) and the entry frames. What is
*shown* is bounded on both sides:

```
shown = max( monotonic, min(real, elapsed / 5000ms), (elapsed - 5000) / 2500 )
```

so a warm cache still takes five seconds and still shows all five worlds, and a cold network is paced by bytes
and then eased to 1 rather than hanging. Measured on a network throttled to 400 ms per hero frame: 42 → 60 → 74
→ 99%, ending at about 8.5 s.

The composition is Lambert | Lambert's idea — the wordmark *is* the progress bar, tracking open from 0.06em to
0.46em — with Arc'teryx's restraint: one hairline, a mono percentage, the five world names cycling in their own
sector colours, and the corners carrying the legal name, the city and the year. It ends by closing the film's
own divider wall over the field, dropping the black behind it while it cannot be seen, and opening onto the disc
already turning.

---

## 3. The post-hero site

Section-by-section reasoning is in `00-DIRECTION.md` §10. What matters technically:

### The zoom-type gate (`src/scripts/zoom.ts`, `scripts/build-words.mjs`)

The word is **knocked out** of the outgoing chapter's ground on a canvas, so the next chapter is already visible
through its letterforms at rest. Scrolling scales that knock-out about a point inside one letter until the
letter swallows the viewport. This is the hero's own title-card mask, reversed, which is why it stays perfectly
crisp at 50×: there is no rasterised text texture, only a `Path2D` fill.

`scripts/build-words.mjs` outlines WORKFORCES and SECTORS from Instrument Sans 700 and finds the point of
maximum clearance inside the anchor glyph numerically (flatten the outline, then a grid search of
point-in-polygon plus distance-to-edge) — the same method the wordmark uses for the X.

The curve is the measured one: `s = exp(ln(sMax) · p^3.4)` for the type against `1 + 0.9 · p^1.6` for the
picture. Seventy per cent of the move is spent below 2×; the last 15% covers 5× to 30×+. Focus resolves over the
first half of the arrival and then holds sharp — a lens pull, not a fade — done by cross-fading a statically
blurred copy, never by animating a `filter`.

On a narrow screen the word is sized by **height** instead of width and crops, with the anchor letter centred,
because a word this wide would otherwise set at 36 px tall.

### The throwable stack (`src/scripts/deck.ts`)

Drag is 1:1; rotation is `clamp(dx · 0.055, ±14°)` about a pivot below the card (`transform-origin: 50% 140%`),
so it swings as if held at the bottom. Release past 26% of the stack's width **or** above 0.85 px/ms throws it
along the release vector with spin; anything less springs home, critically damped, tau 0.14 s. The card
underneath rises once the top card passes 40% of the threshold, so the stack answers before the throw finishes.
Thrown cards go to the back: the stack is a loop and can never empty.

Verified: throw past threshold advances; a 40 px drag springs back without advancing; a 70 px flick in 24 ms
throws on velocity alone; buttons and arrow keys step both ways; a live region announces each world.

### The turning floor (`src/scripts/turning.ts`)

`playbackRate = clamp(1 + |v| · 2.6, 1, 8)` with `v` in viewport-heights per second, attacked at tau 0.08 s and
released at 0.5 s. Scroll events stop arriving the moment the page settles, so the stored velocity is decayed
by the ticker itself rather than waiting for another event. Measured: 1.0 at rest → 5.9 during a fast scroll →
1.0 again after it settles.

### The pointer follower (`src/scripts/cursor.ts`)

One element that morphs: `dot` → `label` → `arrow` → `drag` → `media`. The native cursor stays visible, as on
noho.ink, so nothing is lost if it fails. Position trails at tau 0.055 s, scale at 0.12, and velocity stretches
the shape along its direction of travel (capped at 1.18) with a counter-rotation on the children so the label
stays readable. Fine pointers only; removed for touch and reduced motion; suppressed over form fields and on
Tab.

### Sound (`src/scripts/sound.ts`)

Synthesised with WebAudio — no files, no licences. A bandpass noise sweep for a throw and for a chapter gate, a
falling sine for a landing, a short blip for a toggle. Off by default, remembered in `localStorage`, never
before a user gesture, never under reduced motion.

Four things speak: throwing a plate, stepping the film (the wall passing the lens), a world freezing (a low
landing), and a chapter gate committing to its move. Each fires once per event, never per frame — the gate
checks that its previous state was `rest` before it plays. With sound off the `AudioContext` is never
constructed at all, so there is no cost to a visitor who never turns it on.

---

## 4. Fallbacks

| Mode | How it is reached | What renders |
|---|---|---|
| `cinema` | JS on, motion allowed, network fine | everything above |
| static | `prefers-reduced-motion`, Save-Data, 2g/3g, or the footer toggle | hero as six ordinary sections with the high-res stills; no intro; no follower; the turning floor shows its poster; the stack is a list; gates are still compositions |
| no-JS | scripting off | the same, plus: the gate's real `<h2>` sets as display type across the picture, and the engagement figure starts on the finished render rather than the blueprint |

Both were checked against the production build through `.qa/serve.mjs`, which strips `<script>` on `?nojs` and
delays hero media on `?slow=N` (CDP network emulation is not allow-listed in the browse daemon).

---

## 5. Measured

- `npm run check` — 0 errors, 0 warnings, 0 hints across 59 files.
- `npm run build` — 9 pages.
- Production payload: **20.8 KB JS** and **17.9 KB CSS** gzipped; `index.html` 14.7 KB gzipped.
- One shared `requestAnimationFrame` loop (`src/scripts/core/ticker.ts`); every module subscribes and
  unsubscribes on an IntersectionObserver, so nothing animates off-screen. Measured 60.5 fps at rest on the
  hero.
- All animation is `transform` / `opacity`, except the engagement figure's five `filter` stages, which change
  once per station rather than per frame.

## 6. Tooling notes for the next session

- **Astro's dev server serves stale scoped CSS** after a component's `<style>` block is edited. It cost time
  twice. Restart it (`npx astro dev stop` then start) whenever a style change does not show, before debugging
  anything else.
- `browse`'s `hover` dispatches element-level events that never reach a `window` listener, so it cannot drive
  anything bound to `mousemove` / `pointermove` on the window. Dispatch a bubbling `MouseEvent` on the element
  under the point instead — `.qa/cursor.js` does exactly that.
- The site scrolls smoothly, so QA must set `document.documentElement.style.scrollBehavior = 'auto'` before
  measuring or screenshotting a scroll position. `.qa/page-sheet.sh` does.
- Cookies ignore the port, so a `?nojs` flag set on one localhost port silently applies on every other. The QA
  server now lets the query override the cookie (`?nojs=0`).
- The Bash tool truncates very long commands; large files are written with the file-write tool, not heredocs.
