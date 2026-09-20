You are taking over the Nexora website (C:\Web UI\Nexora). A previous session built the whole site. I reviewed it:
the cinematic hero's VISUALS are good and must be preserved, but the hero has interaction bugs, and EVERYTHING after
the hero is rejected and must be redesigned from scratch. Your job is to fix the hero and rebuild the rest of the site
to a standard that could genuinely win an Awwwards Site of the Day: modern, polished, art-directed.

Do not start coding immediately.

==================================================
STEP 0 — GET CONTEXT (read, don't skim)
==================================================

1. docs/HANDOFF.md ← start here. It has the file map, a technical diagnosis of every issue below, the media facts
   that were learned the hard way, and the tooling quirks of this machine (READ §5 before you touch the browser).
2. nexora_website_context/01_SOURCE_OF_TRUTH.md, 02_BUSINESS_CONTEXT.md, 04_HERO_EXPERIENCE_LOCKED.md,
   09_BRAND_COPY_DIRECTION.md. The business guardrails are still binding.
3. docs/implementation/04-HERO-IMPLEMENTATION.md (how the hero works) and README.md.
   The other docs in docs/implementation/ describe the REJECTED design. Treat them as history.
4. Run the site (npm run dev) and look at it in the browser yourself before forming opinions. Look at the hero, then
   everything below it, on desktop and mobile.

Stack: Astro 7, TypeScript, vanilla modules, no UI framework. All copy is in src/data/. Originals in /media must never
be modified (derivatives go in public/media via npm run media). Do not regenerate or replace the hero media.

==================================================
PART A — HERO FIXES (keep the look, fix the behaviour)
==================================================

A1. In all five world scenes (Hospitality, Events & Promotions, Facilities & Support, Specialist & Technical,
Recruitment & Workforce) the copy is currently bottom-leftED on the left. Rebalance
the scrim for it. Decide portrait/mobile deliberately (centred copy may collide with the action there) and verify.

A2. Remove the hero HUD completely: "Skip film", the pause/timecode control, the wedge glyph, the 01–05 world
selector and the "Scroll to enter" hint. They ruin the fee non-visual means (the
existing visually-hidden skip link and the footer motion toggle).

A3. Hide the vertical scrollbar site-wide. Scrolling must still work by wheel, touch and keyboard.

A4. The first transition (rotating overview → Hospitality) does not activate properly on scroll. It feels dead.
Start that transition clip about 2 seconds in, so we go st and the transition reads
better. (Handoff H4 explains the cause, the SETTLE state, and why starting in the motion-blurred spin lets you
delete it.)

A5. Moving between worlds currently takes TWO scrolls. It must transition to the next
world, played smoothly at natural speed (and one scroll back = the reverse). Multiple fast scrolls must also be
handled gracefully: they should chain and flow from one wo double-firing from
trackpad inertia, skipped states, or ever getting stuck between states. The title-card exit is one more step,
after which normal scrolling takes over. (Handoff H5: moveture-stepped, time-played
transitions with an input queue. This overrides the previous "no scroll-jacking" decision.)

==================================================
PART B — LOADING / INTRO SEQUENCE (new)
==================================================

B1. When the site first loads, show a properly designed 5–7 se Take inspiration from:
https://arcteryx.com/us/en/explore/system0/?ref=siteinspire
https://lambert-lambert.com/?ref=siteinspire
Make it earn its time: use it to actually preload the hero (poster, loop, rest stills, entry frames) so the first
transition is instant, tie progress to real loading with ath a real reveal into the
rotating world. Full version once per session, shorter on repeat visits, none under reduced motion.

==================================================
PART C — REDESIGN EVERYTHING AFTER THE HERO, FROM SCRATCH
==================================================

My verdict on what exists now: everything after the hero videotitle is unacceptable.
Flat black backgrounds in some places, flat white in others. It is AI slop of the worst kind. Except for the hero and
the video, all of it goes. Every section must be re-thought fr, imagery, typography,
colour, motion. This applies to the homepage AND the subpages (services, industries, about, request, careers,
contact, privacy, 404).

C1. RESEARCH FIRST. Go to https://www.awwwards.com/websites/ aevel sites in a real
browser. Open them, scroll them, interact with them. Note what makes them feel expensive: pacing, type scale and
pairing, grid, colour grading, image treatment, transitionsor behaviour, how they
present services/process/contact, how they handle mobile. Write down principles per site and which Nexora
problem each one solves. Extract principles, never copy la

C2. Use these three interaction references IN the post-hero si last time): - Zoomed typography transition between chapters: https://se.pinterest.com/pin/955748352150878388/ - Multi-use pointer follower that morphs with context: htt - Tinder-style throwable service cards: https://www.lxlcreative.co.uk/
Each must feel physical and finished, work with touch and JS / with reduced motion.

C3. Use the main rotating loop video as the BACKGROUND of one in, continuously
rotating behind the content. When the user scrolls, the rotation speeds up; when they stop, it eases back to
normal speed. It should feel as if the video is changing wonly the content is
moving over it. (Handoff P3 has the playbackRate approach and its limits.)

C4. COLOUR. Think properly about the palette across the whole page. I want a consistent or deliberately evolving,
beautiful colour grade from section to section, not black- imagery, download
it: licence-clean only (Unsplash/Pexels or similar), saved in the repo with a sources file, graded to sit with
the hero footage, and appropriate for a premium Qatar busis, no construction sites).

C5. COPY. Remove or rewrite lines that read as stupid, specifi
a) "Ten sectors. Construction isn't one."
b) "Time stops. The work doesn't show."
and review everything else written in that same clever-negative voice (handoff P4 lists the others). Voice:
confident, plain, positive, concrete. Still never invent c years of experience,
certifications, testimonials, turnaround promises, or payroll/EOR/visa/healthcare capabilities; construction stays
excluded; contact details stay empty until supplied.

C6. The site must still answer: what Nexora is, what workforce how an engagement works,
why contact them, how an employer submits a requirement, how a candidate registers. Keep the two conversion
flows and the existing form engine logic (src/scripts/formhe new design.

==================================================
HOW TO WORK
==================================================

- Order: context → look at the current site → Awwwards research → write a NEW design direction
  (docs/redesign/, short and decision-dense: concept, palette,eprint with the reference
  that inspired each decision, motion rules, responsive plan) → then implement. Do NOT stop for my approval after the
  plan. Proceed to build.
- Fix Part A and build Part B first so the hero is solid, then Part C.
- Use the browser continuously while building and judge your o looks like a template or
  like the rejected version, throw it away and redo it. Do not settle for the first acceptable layout.
- Avoid: alternating flat dark/light bands, centred generic henters, gradient blobs,
  glassmorphism, pill-shaped everything, generic corporate stock, meaningless animation.
- You may use at most 2 subagents, only for genuinely separabldy, so its screenshots do
  not fill your context). Keep your own context lean: contact-sheet montages instead of many screenshots, short JS
  probes, partial file reads. The last session ran out of room
- Technical quality still applies: semantic HTML, keyboard access, prefers-reduced-motion, touch alternatives,
  no layout shift, progressive media loading, performant anima metadata, npm run check
  clean, production build passing.
- Test: 1920×1080, 1440×900, 1024×768, tablet portrait, 390×84e rapid wheel bursts,
  touch swipes, keyboard; single scroll, many fast scrolls, reverse, refresh mid-page, slow network, reduced motion,
  no-JS. The hero must never stick between states or show an unot be run on this
  machine, so say so rather than claiming it.
- When done: update README.md and docs to match what you actuay what was verified, what
  was not, and what you chose to leave.
  UserPromptSubmit hook error
  Failed with non-blocking status code: Error: Bun not found. Please install Bun: https://bun.sh

I'll start with the handoff document and the project layout, as the brief asks.

Searched for 1 pattern, read 7 files, ran 2 shell commands  
● Skill(browse) Successfully loaded skill · 3 tools allowed
Ran 1 shell command
I've read the handoff, guardrails, hero doc, and README. Now sw the current site before forming opinions — holding off on the available gstack upgrade (1.42 → 1.87) since the handoff's browse workarounds are tuned to the current version.  
Read 1 file, ran 4 shell commands  
Hero looks as described (good visuals, bottom-left copy, HUD clutter). Now capturing everything after the hero as a contact sheet to judge the rejectesections.
Read 1 file, ran 2 shell commands
The current site has strong hero visuals but flat, plain secti list rows. Now I'll launch two background research subagents(an Awwwards study and a deep-dive on five interaction/loader references) with separate browser instances, while I review the hero code to fix Part A.
● 2 background agents launched (↓ to manage) Awwwards study of 22+ sites
Interaction reference deep-dive  
Both research agents are running in the background. Now reading the hero code for Part A.  
Read 4 files  
Now the hero markup/CSS and the renderer surface.  
Read 4 files, ran 3 shell commands  
Inspecting the entry clip frame by frame to pick the exact hand-off frame for A4 (where the blurred spin begins but the disc still matches the loop's scale).

Read 1 file, ran 1 shell command

I'm replacing the scrubbed tall-container hero with a 100svh ste machine: one gesture advances one leg at natural speed,queued gestures chain with a speed boost, reversals ease through zero, and native scroll resumes after the title card. Writing the new timeline model now.
Input controller written (gesture detection for wheel inertia, touch, keys). Now rewriting the hero's UI layer and state machine around it.

do local commits on main checkpoints and also push to this repo in the end
https://github.com/Arjun0014/Nexora
UserPromptSubmit hook error
Failed with non-blocking status code: Error: Bun not found. Please install Bun: https://bun.sh

Noted: I'll initialise git now, commit on main at each main checkpoint, and push to github.com/Arjun0014/Nexora at the end. Checking repo size, git identity and the remote's state first.

Read 1 file, ran 4 shell commands

Baseline commit is in place. Now the new hero state machine (replaces the scrub/settle logic).

● Background command "Check repo size, git identity and remote state" completed (exit code 0)
UserPromptSubmit hook error
Failed with non-blocking status code: Error: Bun not found. Please install Bun: https://bun.sh

● Update(src\scripts\hero\index.ts)
Added 2 lines, removed 1 line
// The sharper still fades in once a freeze has been held for a moment ("focus settle").
let hdWorld = -1, hdLoaded = -1;
function updateHD(now: number) {
const still = mode === 'film' && !dipping && !narrow && p >= 1 && (!moving() || (p > WORLD_COUNT && target === TITLE_STOP));
// Held through the exit leg too, in both directions: it is the same frozen picture behind the knock-out.
const still = mode === 'film' && !dipping && !narrow && p >= 1 && (!moving() || p >= WORLD_COUNT);
if (!still) { if (hd.dataset.on === 'true') hd.dataset.on = 'false'; return; }
if (now - restSince < 260) return;
const world = worldAtStop(Math.round(p));

Now the hero markup and CSS: remove the HUD, add the cross-fade ghost canvas, one-screen stage, vertically centred world copy with a rebalanced scrim.

Made 2 scratchpad edits +153, read 1 file, ran 3 shell commands

Hero engine rewritten (A2/A4/A5) and hero markup patched (A1/A2). Now adding the site-wide scrollbar hide (A3), then type-checking and testing in the browser.
Forward and reverse steps both complete (stop 0 → 1 → 0). Checking the hand-off visually now.

Read 1 file, ran 5 shell commands

Free-spin now resolves to a single step. Checking the three-notch chain, which hadn't landed within my sampling window.

Ran 6 shell commands

All hero interaction gesture tests pass. Next I'll visually verify A1 by checking world copy placement across viewports using the ?stop=N QA switch to jump straight to each stop.

● Write(.qa\worlds-sheet.sh)
Wrote 21 lines to .qa\worlds-sheet.sh
#!/usr/bin/env bash

# Contact sheet of the six hero stops at one viewport. usage: worlds-sheet.sh 1440x900 [stops...]

export USERNAME='AJ\AJ'
B="$HOME/.claude/skills/gstack/browse/dist/browse"
S="/c/Users/aswin/AppData/Local/Temp/claude/C--Web-UI-Nexora/e7c072ca-79ed-45e2-931c-923e72be638c/scratchpad/cur"
VP="${1:-1440x900}"; shift
STOPS="${@:-0 1 2 3 4 5}"
cd "/c/Web UI/Nexora" || exit 1
mkdir -p "$S"; rm -f "$S"/w*.png
$B viewport "$VP" >/dev/null 2>&1
… +11 lines

Ran 1 shell command

● Agent "Interaction reference deep-dive" failed: Agent terminated early due to an API error: You've hit your session limit · resets 3:30am (Asia/Kolkata) (error type rate_limit, HTTP 429, request id req_011CfFMJ4PsASDgBjSd3LjEj, model sent to the API: claude-fable-5-1)
UserPromptSubmit hook error
Failed with non-blocking status code: Error: Bun not found. Please install Bun: https://bun.sh

● Agent "Awwwards study of 22+ sites" failed: Agent terminated early due to an API error: You've hit your session limit · resets 3:30am (Asia/Kolkata) (error type rate_limit, HTTP 429, request id req_011CfFMJVq5B6fk84qhyUMfa, model sent to the API: claude-fable-5-1)
UserPromptSubmit hook error
Failed with non-blocking status code: Error: Bun not found. Please install Bun: https://bun.sh
You've hit your session limit · resets 3:30am (Asia/Kolkata)
