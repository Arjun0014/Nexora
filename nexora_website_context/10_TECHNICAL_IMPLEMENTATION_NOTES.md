# Technical Implementation Notes

For Claude Code.

These are constraints and implementation considerations, not a fixed stack.

---

# 1. Hero is the performance-critical component

The hero uses:
- looping video
- multiple transitions
- possible frame sequences
- pinned scroll
- text overlays

It must feel smooth before adding decorative effects elsewhere.

Prioritize:
- stable frame delivery
- fast first meaningful render
- no scroll jank
- no layout shift

---

# 2. Motion architecture

Preferred conceptual model:

```text
Idle overview loop
↓
enter scroll narrative
↓
sector resting state
↓
scrub transition
↓
next resting state
...
↓
release pinned hero
```

Each sector has a final still / exact final frame.

The user should never lose the intended freeze composition due to approximate video seeking.

---

# 3. Frame-sequence precedent

The user has previously implemented scroll video by extracting frames and scrubbing them.

That approach is acceptable and may be preferred for deterministic playback.

Potential implementation:
- Canvas
- predecoded image sequence
- segmented loading per transition
- still image during dwell states

Do not preload hundreds of full-resolution frames blindly.

---

# 4. Suggested loading strategy

Initial:
- master poster / still
- overview loop

Then:
- preload first transition

After first transition begins:
- preload next transition

Continue progressively.

Keep the first viewport lightweight enough to load quickly.

---

# 5. Video formats

If using video:
- MP4 / H.264 for broad compatibility
- optional WebM where useful
- muted
- playsinline
- no audio dependency

Hero storytelling must work silently.

---

# 6. Responsive behavior

Do not assume desktop behavior maps directly to mobile.

Potential mobile fallback:
- master still or lighter loop
- vertical sector cards
- sector still images
- swipe navigation
- shortened transitions

Claude Design decides.

---

# 7. Accessibility

Support:
- `prefers-reduced-motion`
- keyboard access
- visible focus
- semantic headings
- contrast
- non-pointer access to draggable content
- text alternatives for meaningful media

The user should be able to understand the company without watching the animations.

---

# 8. Custom cursor

If the Noho-style cursor idea is approved:

- desktop pointer devices only
- never hide essential actions
- do not interfere with native text / form behavior
- disable for touch
- respect reduced motion
- keep pointer latency extremely low

---

# 9. Draggable cards

If the LxL-inspired service deck is approved:

Must support:
- mouse drag
- touch swipe
- keyboard
- button fallback
- accessible reading order

Do not build a “Tinder” interaction that makes service information harder to access.

---

# 10. Hero copy layer

Do not bake text into the videos.

Use HTML text above the visual layer for:
- accessibility
- responsive layout
- SEO
- easy copy changes

The generated images / videos should remain clean.

---

# 11. Navigation

The opening is cinematic, but navigation must remain usable.

Claude Design should decide:
- minimal persistent nav
- delayed nav
- menu trigger
- standard header

Do not sacrifice basic navigation for spectacle.

---

# 12. Do not overanimate the full site

The hero already carries a high motion budget.

After it, animation should become more selective.

Performance and visual hierarchy are part of the design.
