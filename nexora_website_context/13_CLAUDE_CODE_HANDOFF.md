# Claude Code Handoff

Implement the approved Claude Design output using this context pack as business and interaction context.

---

## Non-negotiables

- do not invent company facts
- do not reintroduce construction
- preserve the approved hero concept
- preserve exact final frozen compositions
- maintain right-side visual action / left-side text in desktop hero
- neighboring sectors must not appear in close hero scenes
- reduced motion must remain usable
- mobile must be deliberately adapted
- text must remain HTML, not baked into visual assets

---

## Before implementation

Confirm the repository contains:
- final master overview
- overview loop
- five sector stills
- transition videos / sequences
- logo if available

If asset names differ from the suggested manifest, use the real filenames.

---

## Build priority

1. page shell / typography
2. responsive layout
3. hero static states
4. overview idle loop
5. scroll state machine
6. transition scrubbing
7. text transitions
8. post-hero sections
9. optional custom cursor / drag interactions
10. performance pass
11. reduced-motion / mobile pass
12. cross-browser QA

Do not start with decorative microinteractions before the hero is stable.

---

## QA expectations

Test:
- Chromium
- Safari / WebKit
- mobile viewport
- trackpad
- mouse wheel
- touch
- fast scroll
- reverse scroll
- refresh mid-page
- reduced motion
- slow network

The hero should never end up between broken states or show a white / unloaded frame.
