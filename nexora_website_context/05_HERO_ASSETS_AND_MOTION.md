# Hero Assets and Motion Handoff

This file is for Claude Design and Claude Code.

The actual generated media should be treated as the source of truth for visual continuity.

---

## Expected hero asset set

The project should contain or be supplied with:

### Master
- master circular diorama still
- 15-second seamless rotating overview loop

### Final frozen sector frames
- Hospitality
- Events & Promotions
- Facilities & Support
- Specialist / Technical Workforce
- Recruitment & Workforce Management

### Transition media
- Overview → Hospitality
- Hospitality → Events
- Events → Facilities
- Facilities → Technical
- Technical → Recruitment

The exact filenames are not standardized yet.

Suggested project naming:

```text
/public/media/hero/
  overview-master.webp
  overview-loop.mp4

  hospitality-final.webp
  events-final.webp
  facilities-final.webp
  technical-final.webp
  recruitment-final.webp

  00-overview-to-hospitality.mp4
  01-hospitality-to-events.mp4
  02-events-to-facilities.mp4
  03-facilities-to-technical.mp4
  04-technical-to-recruitment.mp4
```

Do not assume these paths exist until the actual files are copied into the project.

---

## Intended website behavior

### Idle
Before meaningful scroll begins:
- overview loop autoplays
- world rotates slowly and continuously

### Scroll experience
Once the storytelling sequence begins:
- hero becomes a pinned cinematic stage
- user scroll controls progress through transitions
- each sector gets a readable frozen resting state
- text changes with the active sector

### Rest states
Do not immediately move from one transition to the next.

Each final freeze should have enough scroll distance / dwell for the user to:
- understand the world
- read the copy
- choose an action if relevant

---

## User's preferred implementation precedent

The user has previously built scroll-controlled video experiences by:

1. generating video
2. cutting video into frames
3. mapping scroll progress to frame number

This is a preferred interaction model because it provides deterministic scrubbing.

Claude Code may choose a more performant implementation if it preserves the same visual control.

---

## Implementation options

### Option A — frame sequence / canvas
Advantages:
- exact scroll control
- deterministic freeze frames
- no unreliable video seeking

Risks:
- payload size
- memory
- mobile performance

### Option B — video seeking
Advantages:
- fewer files
- strong compression

Risks:
- seeking latency
- inconsistent frame delivery
- Safari quirks

### Option C — hybrid
Likely strong:
- normal video for idle loop
- frame-based or highly controlled playback for scroll transitions
- still images for long resting states

Claude Code should benchmark rather than blindly choosing one.

---

## Performance principles

- preload only what is needed next
- use responsive media
- use modern image formats where practical
- avoid loading every high-resolution transition frame at first paint
- provide a mobile fallback
- provide a reduced-motion path
- prevent layout shifts
- preserve the exact final frozen frames

---

## Reduced motion

For `prefers-reduced-motion`:

Do not force a long scroll-scrub experience.

Possible fallback:
- static overview
- sector stills
- simple crossfade / instant section change
- regular navigation between content blocks

The information should remain fully usable without cinematic motion.

---

## Mobile

The desktop cinematic experience should not be mechanically squeezed into a narrow phone viewport.

Claude Design / Code should decide whether mobile uses:
- simplified hero loop
- static overview + swipe sectors
- shorter transition treatment
- a vertical sector story

Preserve the concept, not necessarily the exact desktop choreography.
