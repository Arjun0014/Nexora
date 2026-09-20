> **PARTLY SUPERSEDED — session 2.** Sections 1, 2, 3, 6, 7 and 8 (the media, the playback technology, the
> derivatives, loading, fit and the exit mask) still describe the build exactly. Sections 4, 5, 9, 10 and 11
> describe the *scrubbed* hero, which was replaced by a gesture-stepped one: see `docs/redesign/01-BUILD.md` §1
> for stops and legs, the input controller, the frame-44 entry and the deletion of SETTLE.

# 04 — Hero Implementation

The hero is the performance-critical component. Every decision below was made after inspecting and measuring the
actual media, not from the filenames.

## 1. What the media actually is

| Asset | Res | Frames | Length | Notes |
|---|---|---|---|---|
| `overview-loop.mp4` | 1920×1080 | 360 @ 24 | 15.0 s | full-range BT.709. One clockwise turn. Last frame ≈ first frame − 1° |
| `overview-to-hospitality.mp4` | 2560×1440 | 192 | 8.0 s | full-range BT.709. Starts on the loop's seam pose |
| 4 × sector clips | 1280×720 | 121 each | 5.0 s | **untagged** colour. action ≈ f0–40, pan ≈ 40–56, wall fully occludes ≈ 56–72, emerge ≈ 72–96, action + freeze ≈ 96–120 |
| 6 × `*-final.png` / `overview-master.png` | 1672×941 | — | — | reference compositions |

### Findings that changed the plan

1. **The PNG stills are not the frames the videos land on.** SSIM between each `*-final.png` and the matching clip's
   last frame is 0.35–0.41 (framing, pose and detail all differ; e.g. Events has different wall positions). Swapping
   to the PNG at rest would be a visible pop — a morph, which the locked rules forbid.
   → **Rest states use the clip's own last frame.** The PNGs are used where continuity with video is irrelevant:
   reduced-motion hero, Save-Data hero, deck cards, plate, subpages, social image.
2. **Clip-to-clip joins are clean.** Last frame of clip *n* vs first frame of clip *n+1*: SSIM 0.94–0.96, best-fit
   scale 1.000, shift 0 px. No correction needed. (Hospitality join 0.85: the entry clip is 1440p, the next is 720p —
   same picture, different sharpness.)
3. **`overview-master.png` is not the loop's first frame** (SSIM 0.39). The poster is therefore extracted from the
   loop itself (frame 0), so poster → video is invisible.
4. **Loop ↔ entry hand-off:** the loop's last frame is the closest match to the entry clip's frame 0 (mean abs error
   8.3 vs 9.9 for loop frame 0; misalignment 0.5% scale / 1 px — negligible). The entry opens with ~10 frames of
   loop-speed rotation and then **spins the opposite way** to the idle loop.
5. **Colour:** untagged HD clips are BT.709 to a browser and BT.601 to ffmpeg. Measured against the tagged entry clip,
   BT.709 matches (R/G means within 0.6 levels). The pipeline forces BT.709 for every derivative.
6. **The action sits at x ≈ 0.72** of the frame in all five close scenes → one portrait crop window serves all of
   them on mobile.

## 2. Playback technology — benchmarked

Chromium, 1280×720, one 121-frame clip, forward + reverse + random scrubbing:

| Approach | Payload | Cost per new frame | Verdict |
|---|---|---|---|
| WebP q70 frames → canvas | 5.4 MB | 9 ms cold decode (p95 10.6), **0.6 ms** once decoded | ✔ chosen |
| JPEG frames → canvas | 8.3 MB | 6.7 ms cold, 4 ms warm | larger, slower warm |
| All-intra H.264, `currentTime` seeking | 4.0 MB | 16 ms mean, 31 ms max, asynchronous | approximate; misses frames under load |
| Normal / GOP-4 H.264 seeking | 1.0 / 2.5 MB | unreliable (`seeked` fires before the frame is presented) | ✘ |
| AVIF frames | ~½ of WebP | 2–3× the decode cost; Safari risk | ✘ not worth it |

**Decision (hybrid):** `<video>` for the idle loop · WebP frame sequences on one `<canvas>` for every transition ·
the clip's exact last frame for rest states. This matches the client's own proven precedent and is deterministic:
frame *n* is always frame *n*.

The video is **drawn into the same canvas** as the frames (`drawImage(video)` on `requestVideoFrameCallback`), so the
whole hero is one render path: no element swap, no compositing difference at the hand-off, and the contain→cover
interpolation below works identically for video and frames.

## 3. Derivatives (`npm run media`)

```
public/media/hero/
  loop-1440.mp4 (4.9 MB)   loop-960.mp4 (2.8 MB)      H.264 high, CRF 25/26, BT.709 tv, faststart, no audio
  poster-1440.webp (118 KB) poster-960.webp (73 KB)   exact loop frame 0
  seq/entry/d        192 × 1280×720 WebP q66   10.8 MB     seq/entry/m        97 × 1024×576 (every 2nd)  4.0 MB
  seq/events/d       121 ×        "             5.2 MB     seq/events/m       121 × 512×640 action crop  2.0 MB
  seq/facilities/d   121                        5.3 MB     seq/facilities/m                              2.1 MB
  seq/technical/d    121                        6.1 MB     seq/technical/m                               2.7 MB
  seq/recruitment/d  121                        5.5 MB     seq/recruitment/m                             2.4 MB
  rest/<world>.webp      1280×720 q84   exact freeze frame (≈ 95 KB)   ← never-blank guarantee
  rest/<world>-hd.webp   1920×1080 Lanczos + light unsharp (≈ 130 KB)  ← "focus settle"
  rest/<world>-m.webp    768×960 portrait crop
public/media/stills/     the reference PNGs → AVIF + WebP at 1672/1200/800 and 4:5 action crops at 720/480
```

Originals in `/media` are never written to.

## 4. Timeline

One number drives everything: **`u`**, the scroll position inside the hero in viewport-heights.

```
u   0.0 ─ 0.4   OVERVIEW      idle loop plays; headline visible
    0.4 ─ 2.4   ENTRY         192 frames        (contain 0.82 → cover as the clip dives)
    2.4 ─ 2.9   REST 01 Hospitality
    2.9 ─ 4.2   → Events      121 frames
    4.2 ─ 4.7   REST 02 Events & Promotions
    4.7 ─ 6.0   → Facilities
    6.0 ─ 6.5   REST 03 Facilities & Support
    6.5 ─ 7.8   → Technical
    7.8 ─ 8.3   REST 04 Specialist & Technical
    8.3 ─ 9.6   → Recruitment
    9.6 ─ 10.1  REST 05 Recruitment & Workforce
   10.1 ─ 11.3  EXIT          NEXORA knock-out scales 60× → 1×
   11.3 ─ 11.6  TITLE         hold, then the sticky stage releases
```

Container height = `(11.6 + 1) × 100lvh`; the stage is `position: sticky; top: 0; height: 100lvh`. On portrait
screens transitions are 0.8× as long (touch scrolling covers distance faster).

Two playheads:

- **target** = `u` from native scroll (no scroll-jacking, no smooth-scroll library).
- **display** chases target with critically-damped smoothing (τ = 110 ms). This is what turns 100 px mouse-wheel
  steps into continuous motion. Rendering reads *display* only.

## 5. State machine

```
            ┌────────── target < 0.4 and display == 0 ◄───────────────┐
            ▼                                                          │
  BOOT ─► IDLE ──target ≥ 0.4──► SETTLE ──loop reaches seam──► SCRUB ──┘
  poster   loop plays,           loop plays fast, then         frames + rest stills;
  drawn    drawn to canvas       eases into the seam pose      display chases target
                                  (time-based, ≤ ~1.2 s)            │
                                                                     ├─ gap > 1.4u or frames missing ─► DIP ─► SCRUB
                                                                     └─ u ≥ 10.1 ─► EXIT (mask canvas) ─► RELEASED
```

- **SETTLE** exists because the user can start scrolling at any rotation angle, but the entry clip starts at one
  pose. The loop's `loop` attribute is removed and `playbackRate` is driven so the remaining rotation completes
  quickly and *decelerates* into the seam (`ended` fires on exactly the last frame). Because the entry clip then
  turns the other way, this reads as anticipation → action, not as a reversal. Fallback if rate control is
  unavailable or takes > 1.6 s: seek to the end once.
- **DIP** is the only non-filmic transition and it is a safety net: the stage fades through the divider-wall bronze
  (`#1d1510`) to the target world's rest still. It is used when the user jumps worlds with the glyph, lands mid-page
  on refresh, or out-scrolls the network. It borrows the wall-wipe's colour so it still feels native.
- **Auto-settle:** if the target stops inside a transition for 160 ms, the scroll position itself is animated to the
  nearer rest (forward once past 12% when moving forward) at the clip's natural 24 fps, so the "action resumes →
  abrupt freeze" beat is always seen at the right speed and **the hero can never be left between states**. Any
  wheel, touch, key or pointer input cancels it instantly.

## 6. Loading — never a blank frame

| When | What | Size |
|---|---|---|
| HTML | poster preloaded (`fetchpriority=high`), drawn to the canvas at once | 118 KB |
| immediately | loop video (`preload=auto`) | 4.9 MB streaming |
| immediately | the 5 rest stills | ~0.5 MB |
| immediately, in order | entry frames (6 parallel) | 10.8 MB |
| entry ≥ 50% | sequence 2 | 5.2 MB |
| on arriving at world *k* | sequence *k+2* (so *k+1* is already in hand) | ~5.5 MB each |
| at rest for 260 ms | that world's `-hd` still — shown only after `img.decode()` resolves | ~130 KB |

Rules: display can never advance past the last **contiguously decoded** frame of a sequence — a slow network makes
the film lag behind the finger, never flash. If a whole sequence is missing when the user is already beyond it, DIP
to the rest still. Frames within ±6 of the playhead are pre-decoded with `img.decode()`. On small screens, sequences
more than two worlds away are released.

`Save-Data`, or `effectiveType` of `2g`/`3g` → **lite mode**: no sequences at all; worlds change by DIP between the
high-res reference stills.

## 7. Fit — one function for every viewport

`fit(e)` interpolates from **contain × 0.82** in landscape (the disc floats, corners free for UI) — **contain × 1.0**
in portrait, where width is the scarce dimension — to **cover** (scenes are full-bleed), driven by `e = smoothstep(0.04, 0.42, entryProgress)`. On landscape it is a gentle push-in that
compounds the clip's own dive; on portrait it is the whole trick that makes a centred disc become a full-screen scene.

Cover uses a **focus-centre** rather than CSS `object-position` semantics, so the full-frame entry (focus 0.72) and
the portrait-cropped sequences (focus 0.5 of a window centred on 0.72) land on exactly the same pixels. Landscape
focus slides from 0.5 (≥ 16:10) to 0.68 (square).

**The surround (as built).** While the frame does not fill the stage, the margins are a wash stretched from the
frame's outermost row/column, blurred *along* that edge only, and the wash runs *under* the feathered band so the
sharp frame dissolves straight into it. Two earlier attempts were measured and rejected: an enlarged blurred copy
read as a ghost halo, and a same-size blurred copy left a brightness step at the frame boundary (up to 2× at a given
x). The feather is tied to whether an edge is actually on stage, not to `e` — in portrait the top and bottom edges
stay visible through most of the push-in.

Canvas backing store is capped at `min(css × dpr, 1920 wide)` — the source is 720p; more pixels buy nothing.

## 8. The exit mask

A second canvas above the media. Per frame: fill studio black, then `destination-out` fill the NEXORA outline
(`Path2D` from `src/data/wordmark.json`) under `scale(S)` about the centre of the **X** crossing, with
`S = exp(lerp(ln 60, 0, easeInOut(t)))` so the zoom is perceptually linear. Vector at every scale: no raster blur, no
giant text layers, one path fill per frame. At `S = 1` the wordmark spans 88% of the stage width. The real heading
is in the DOM (`sr-only`) for assistive tech and search.

## 9. Copy layer

All text is HTML above the canvases. Six `<section>`s (overview + five worlds) exist in the DOM in reading order.
In cinematic mode they are stacked and toggled by the state machine; **without JS or with reduced motion the same
markup lays out as six ordinary full-height sections** with `<img>` backgrounds (the high-res stills). Outgoing copy
leaves as soon as time resumes; incoming copy arrives when the clip is ≥ 88% — lines rise behind a mask and stop
dead, echoing the freeze.

## 10. What testing changed

- **HD overlay race** (found on the throttled server): an `<img>` keeps painting its previous picture until the new
  file arrives, so after a fling the copy said *Facilities* over a *Hospitality* picture. The overlay now stays hidden
  until `decode()` confirms the element shows the current world.
- **Copy during SETTLE:** the playhead is held while the loop races to its seam, but the visitor has already left, so
  the overview copy leaves as soon as SETTLE begins.
- `[data-hero]` carries `data-mode`; `/?nosettle` disables auto-settle for inspection.

## 11. Edge cases covered

Refresh mid-hero (derive world from scroll, show rest still, then load around it) · resize/orientation (progress
preserved, canvas re-measured, frame set switched if the aspect crosses 1.0) · tab hidden (video and RAF paused) ·
`prefers-reduced-motion` toggled at runtime · bfcache restore · video autoplay refused (poster stays; entry still
works from the poster pose) · keyboard-only (glyph buttons, Skip film) · fast fling past several worlds (DIP).
