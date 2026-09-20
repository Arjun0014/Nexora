# Interaction references: measured behaviour and vanilla-TS build recipes

Research date: 2026-09-21. Method: every site was opened in a real Chromium (gstack `browse`, 1440x900 unless stated), driven with real mouse moves / synthetic pointer events, and captured as timed screenshot sequences; CSS values were read with `getComputedStyle`; the Pinterest video was downloaded and measured frame by frame with Python (PIL/numpy/scipy). Numbers marked "measured" come from pixels or computed styles. Numbers marked "estimate" are read by eye from contact sheets. Anything I could not observe is said so plainly.

Conventions used below: `p` is a normalised progress 0..1, `dt` is the frame delta in seconds, `lerp(a,b,k)=a+(b-a)*k`, `clamp(v,lo,hi)`. Frame-rate-independent smoothing is always written as `k = 1 - Math.exp(-dt / tau)` (tau in seconds) rather than a bare per-frame factor.

Contents: A. Zoomed-typography chapter transition / B. Context-morphing pointer follower / C. Throwable card stack / D. Loader: Arc'teryx System_0 / E. Loader: Lambert + Lambert / Shared motion language.

---

## A. Zoomed-typography transition (Pinterest pin 955748352150878388)

### What it is

The pin is a **video**, not a live site: a 7.03 s, 1280x960, 30 fps screen recording (every 6th frame is a duplicate, so the source was about 25 fps) titled "Photographer Unique Website Design | Sandhill Studio", description "Photography website design inspiration". No login wall blocked it; the media URL was in the page HTML (`https://v1.pinimg.com/videos/mc/720p/e9/c2/d2/e9c2d2ccb882e4436fc80b681f3b4412.mp4`). It is a design concept for a photo-studio site called "Vision", shown as a 16:9 stage floating on a grey backdrop. It cycles through three full-stage hero scenes ("THE ART OF LIFE" > "THE ART OF GOD" > "A WALK IN NATURE") and the only thing being demonstrated is the transition between them. I extracted all 211 frames and measured headline scale (white-stroke run lengths and white-pixel area), background image scale (brute-force similarity search), blur radius (least-squares fit against Gaussian-blurred copies of the settled frame) and brightness per frame.

Layout of every scene (stage = 100% x 100%):
- Full-bleed (or left-half) dark photograph. Very low key: mean luminance of the stage is only 32 to 60 of 255.
- A two-line, all-caps, high-contrast serif headline in white, cap height about 10% of stage height, the block about 38% of stage width. Scene 1 and 2 place it right of centre (left edge at x = 49% of stage), scene 3 left of centre.
- Tiny orange eyebrow label above the headline ("CREATIVE VISION.", about 1.6% of stage height), and a small orange serif side label tucked into the right end of line 2 ("Portraits" + two 1%-high grey lines). Both are **inside the same transformed group as the headline**, so they scale with it.
- Persistent chrome that never moves during a transition: logo + strapline top-left, 4 nav links top-right, address block bottom-left on a slightly lighter footer band (bottom 20% of the stage), an orange 44 px circular arrow button bottom-right.

### State / timeline breakdown (measured)

One full cycle is about 2.2 s in this showreel: settle 0.55-0.7 s, a barely perceptible dwell of 0.3-0.5 s, exit 1.1-1.3 s. Times below are video seconds.

| Phase | Time | What happens |
|---|---|---|
| Rest (scene 1) | 0.00-0.40 | Static. Headline scale 1.00. |
| Creep | 0.40-1.00 | Headline group starts to scale about the **stage centre** (measured anchor x = 51%, y = 51% of stage in scene 1; the image anchor came out at 50% / 40%). Scale 1.05 at 0.60 s, 1.12 at 0.80 s, 1.28 at 1.00 s. Image has only reached 1.04-1.10. |
| Push | 1.00-1.40 | 1.55 at 1.20 s, 1.92 at 1.30 s, 2.7 at 1.40 s. Type starts leaving the stage on the right and bottom. Image 1.18 at 1.27 s, 1.32 at 1.40 s. |
| Whoosh | 1.40-1.70 | 3.2 (1.47 s), 3.8 (1.50), 4.7 (1.53), 6.2 (1.57), 9.5 (1.60), 18.4 (1.67), gone by 1.70. Near the end the scale **doubles every ~70 ms (2 frames)**. A single serif stem is wider than 15% of the stage; the last visible glyph is soft (motion-blur-like). Image 1.5 (1.53 s), 1.68 (1.60), 1.82 (1.67). |
| Mask | 1.70-1.93 | Variant 1 (scene 1 > 2): once the type is gone, the old image blurs heavily, keeps zooming and fades to the stage colour in about 0.2 s; at 1.93 s the stage is pure background (#151515-ish) with only the persistent chrome. That dark beat lasts 2-3 frames (about 0.1 s). Variant 2 (scene 2 > 3, at 4.13 > 4.17 s): **hard cut in one frame** while the type is at about 7x and covers roughly half the stage; the next frame is already the new scene, blurred. Both read as seamless at speed. |
| Arrive | 2.00-2.60 | New scene appears at **scale 1.00 (measured 0.99-1.00, it does not zoom out)**, fully opaque image, blurred. Blur fit for scene 3: sigma 12 px at the cut (on a 1132 px wide stage, i.e. about 1% of stage width), 10 px at +0.10 s, 6 px at +0.17 s, 4 px at +0.27 s, 2 px at +0.40 s, 1 px at +0.55 s, 0 by +0.70 s. That is an ease-out (fast first, long tail). The new headline fades up and sharpens over the same window and starts about 3% small (0.97 > 1.00). |
| Dwell | 2.60-2.75 | Practically none in the reel. The headline is already creeping again by 2.75 s. |
| Exit 2 | 2.75-4.17 | Same curve: 1.09 (3.00 s), 1.18 (3.20), 1.28 (3.33), 1.45 (3.50), 1.64 (3.60), 1.91 (3.73), 2.18 (3.80), 2.64 (3.90), 3.27 (3.97), 3.73 (4.00), 4.36 (4.07), 5.27 (4.10), 6.82 (4.13), cut. Image: 1.10 (3.20), 1.22 (3.47), 1.40 (3.67), 1.66 (3.87), 1.96 (4.00), 2.30 (4.13). |
| Exit 3 | 5.30-6.40 | 1.07 (5.50), 1.14 (5.60), 1.29 (5.73), 1.43 (5.80), 1.57 (5.90), 2.07 (6.00), 2.5 (6.10), 2.86 (6.13), 3.36 (6.17), 4.07 (6.20), 5.07 (6.27), 7.4 (6.30), 16 (6.33), 28 (6.37), gone 6.40. Image 1.10 (5.50), 1.20 (5.73), 1.34 (5.93), 1.44 (6.07), 1.62 (6.20), 1.80 (6.33), 1.92 (6.40). Then the image alone blurs and fades to dark over 0.6 s (6.40-7.00). |

Curve fit. The headline is not on any standard "ease-in on scale". The logarithm of the scale is what eases: `ln(s)` follows roughly `L * p^3` to `L * p^4` with `L = ln(30)`, over `D = 1.2-1.3 s`. In words: 70% of the duration is spent below 2x, the last 15% covers 5x to 30x. The image follows a far gentler law, about `1 + 0.9 * p^1.6`, reaching only 1.8x-2.3x at the swap. The ratio between the two (30x against 2x) is the depth cue: a foreground plane rushing past a camera that is dollying slowly into the background.

### Why it feels expensive

1. **Geometric zoom, not linear zoom.** Because the exponent eases, the type feels like it has mass: a long reluctant push, then it is gone in 5 frames. An ease-in on raw scale looks like a cheap "grow".
2. **Two planes, two speeds, one anchor.** Type 30x, image 2x, both about the stage centre. That is a camera move, not a CSS effect.
3. **The swap is hidden by coverage plus softness, never by a fade to black as a crutch.** Either the giant glyph covers the cut, or the dark beat is 0.1 s. The new scene arrives already in place (scale 1) and only resolves focus, like a lens pulling focus, so the landing is calm.
4. **Persistent chrome.** Logo, nav, address and the arrow button do not move at all. The eye keeps a fixed frame of reference, which makes the violent type move read as deliberate.
5. **Small labels ride inside the headline group.** The eyebrow and side label scale with the headline, so the typographic lock-up stays intact while it flies; nothing is left hanging.

### How to build it in vanilla TS

Data model:

```ts
type ZoomChapter = {
  stage: HTMLElement;      // sticky 100svh container, overflow: clip; contain: layout paint; isolation: isolate
  type: HTMLElement;       // headline lock-up (h2 + eyebrow + side label), will-change: transform
  imgOut: HTMLElement;     // outgoing picture wrapper, will-change: transform, opacity
  inSharp: HTMLElement;    // incoming scene, sharp
  inSoft: HTMLElement;     // incoming scene, pre-blurred copy (see below)
  anchor: { x: number; y: number }; // zoom anchor in stage px (default: stage centre)
};
```

Driver. Two valid choices; use the first between homepage chapters.
- **Scroll-scrubbed**: wrapper `height: 260vh`, inner stage `position: sticky; top: 0; height: 100svh`. `pTarget = clamp((scrollY - top) / (wrapperHeight - innerHeight), 0, 1)`. Never bind transforms to `pTarget` directly (wheel steps are 100 px jumps): `p += (pTarget - p) * (1 - Math.exp(-dt / 0.12))` inside one shared rAF loop, and stop the loop when `abs(pTarget - p) < 0.0005`.
- **Triggered**: when the boundary crosses 60% of the viewport, play `p` from 0 to 1 over 1600 ms with linear time (the curves below already contain the easing), lock scroll for that time only if the hero already does so.

Timeline on `p` (exit takes 0-0.72, swap at 0.72, arrive 0.72-1):

```ts
const S_MAX = 30;
const pe = clamp(p / 0.72, 0, 1);                       // exit progress
const sText = Math.exp(Math.log(S_MAX) * pe ** 3.4);    // 1 -> 30, measured exponent 3-4
const sImg  = 1 + 0.9 * pe ** 1.6;                      // 1 -> 1.9
const typeAlpha = 1 - smoothstep(0.93, 1.0, pe);        // only the last 7%: hides sub-pixel shimmer of 25x glyphs
const pa = clamp((p - 0.72) / 0.28, 0, 1);              // arrive progress
const focus = 1 - (1 - pa) ** 3;                        // ease-out cubic, matches 12px -> 0 in 0.7s with long tail
inSoft.style.opacity  = String(pa <= 0 ? 0 : 1 - focus);
inSharp.style.opacity = String(pa <= 0 ? 0 : 1);        // sharp copy sits under the soft copy
headlineIn.style.transform = `scale(${0.97 + 0.03 * focus})`;
```

Transform pipeline (transform and opacity only):
- Anchor without touching `transform-origin` at runtime: compute once on resize `ox = anchor.x - typeRect.left`, `oy = anchor.y - typeRect.top` and set `type.style.transformOrigin = ox + 'px ' + oy + 'px'`. Then each frame only `type.style.transform = 'translateZ(0) scale(' + sText + ')'`. Same for the image with the same anchor.
- Pick the anchor on purpose. The reference uses the stage centre and whatever glyph happens to be there. For Nexora put the anchor inside a heavy stem or inside a counter (the O of NEXORA is ideal): flying through a counter reveals the next scene through the hole, flying into a stem gives full coverage for the cut. Compute the anchor from a `<span data-zoom-anchor>` around that glyph: `rect.left + rect.width * 0.5`.
- **No animated `filter: blur()`.** Animating a 12 px blur on a full-viewport layer re-runs the filter every frame and drops frames on integrated GPUs. Use two stacked copies of the incoming scene: a sharp one and a soft one, and cross-fade the soft one out with opacity. The soft copy is either (a) the same `<img>` with a *static* `filter: blur(14px)` plus `transform: scale(1.06)` to hide the transparent blur edge (rasterised once, then only opacity changes), or (b) a 48 px wide JPEG of the same image scaled up with `image-rendering: auto` (about 1-2 KB, free blur). The same trick gives the soft headline: a duplicate `aria-hidden` headline with `color: transparent; text-shadow: 0 0 14px rgba(255,255,255,.9)` cross-faded against the real one.
- Outgoing image exit: after the type has cleared (`pe > 0.93`) fade `imgOut` to 0 over the remaining 7%, or skip it and hard-swap at `p = 0.72` if the type is covering more than half the stage at that moment (check the anchor glyph: stem = cover, counter = do the fade).

Crisp giant text (the main pitfall). A composited layer is rasterised once at its painted size, then the GPU scales the texture: at 30x, DOM text turns to mush, and without `will-change` Chrome and Safari re-rasterise every frame and stall. Recipe: lay the lock-up out at **4x size** (`font-size: calc(var(--h) * 4)`) inside a wrapper that carries a constant `scale(0.25)`, and animate the outer scale 1 > 30. The texture is 16x the pixels of the visible headline (a 600x170 px lock-up becomes 2400x680, about 6.5 MB of GPU memory, fine), sharp up to 4x, and beyond 4x it is moving faster than the eye can resolve edges (the reference is soft there too). Keep `will-change: transform` only while `0 < p < 1`; remove it at rest so the text returns to normal subpixel rendering. Safari: add `backface-visibility: hidden` to stop re-raster flicker. Never scale with `font-size` (layout per frame) and never put the huge layer inside an `overflow: hidden` ancestor with `border-radius` (forces a mask layer); use `overflow: clip` on a square-cornered stage.

Other pitfalls: `position: sticky` breaks if any ancestor has `overflow: hidden/auto`; use `100svh` so mobile URL-bar changes do not re-anchor mid-zoom; recompute the anchor on `resize` and on `document.fonts.ready` (the headline box changes when the webfont lands); pause the rAF loop with an IntersectionObserver when the stage is off screen; preload and `img.decode()` the incoming image before `p` can reach 0.6, otherwise the swap reveals an empty box.

### Touch / keyboard / reduced-motion / no-JS plan

- Touch: scroll-scrubbed version works unchanged (native momentum scroll drives `pTarget`). Shorten the wrapper to 200vh on phones and cap `S_MAX` at 18 (narrow viewports clear the type sooner). On low-end devices (`navigator.hardwareConcurrency <= 4` or a dropped-frame counter above 8 in the first transition) fall back to the reduced variant below.
- Keyboard: nothing to operate; Space / PageDown scroll through it. Make sure focusable elements of the incoming chapter are `inert` until `p > 0.72`, and of the outgoing chapter after it, so Tab never lands on an invisible scene. Headline stays a real `<h2>` in the DOM; the soft duplicate is `aria-hidden="true"`.
- Reduced motion: no scaling at all. Collapse the wrapper to normal flow height and cross-fade the two chapters over 300 ms (opacity only) when the boundary passes mid-viewport, or simply stack them as ordinary sections.
- No-JS: both chapters are ordinary stacked sections with their images and headings visible; the sticky stage class is only added by JS (`html.js .zt-wrapper { height: 260vh }`), so nothing is hidden without it.
- What is lost in each fallback: the depth illusion and the focus pull. Content, order and headings are identical.

<!-- APPEND-MARKER -->
