# The hero, version 8: wider doorways, truer work, and the film upright

Branch `hero-v4` (still off `main`). v8 keeps v7's turning court (`07-HERO-V7.md`) and answers what the client asked
for on 23 Sep 2026, then lays the film out for phones and tablets — the first version that does.

## 0. What the client said

1. "The doors showcasing each workforce: can we make the doors bigger? Right now what's behind, we are seeing a
   glimpse only. If it's more clear it will be better to understand what's behind it."
2. "Change all these images used for the workforces in the hero except Specialist & Technical — that's the only good
   one. The rest don't properly represent the workforces."
3. "Not too zoomed in images can be used… also the door is small, so both might help. Make sure no unnecessary space
   is left in the doorway when the image is zoomed out."
4. "Now you can go ahead and implement for phones as well once all these are done."

## 1. The doorways, and what is behind them

The doorway was 4.2 m wide in an 18 m court; it is now **6.2 m** (the arch springs lower, at 5.0 m, and its crown
stands at 7.5 m). Five of them still leave 14 m of plain wall between each pair — the wall each world's words stand
on, and the wall that wipes the view between two doorways.

That alone was not the whole of the "glimpse" problem. A doorway is a window: all you ever see of the world beyond is
the cone from the eye, at its stop, through the opening. v7 hung each picture 3.1 m behind the face and sized it to
cover any angle, so **42% of every photograph was behind the wall** — cropped away, but still composed for, so the
subject sat in the middle of a frame you could not see. v8 measures that cone and cuts the picture to it:

| | v7 | v8 |
|---|---|---|
| opening | 4.2 × 7.3 m | 6.2 × 7.5 m |
| picture hangs | 3.1 m behind the face | 2.5 m behind |
| of the picture's width, seen | 58% | 83% |
| of the source photograph, seen | about a third | about half |

The photographs are now cropped to `ar` 0.86:1 — the shape of that cone (`src/data/hero5.json`) — so what is cropped
is very nearly all that is seen, and the picture is fitted into the opening as CSS `cover` would fit it: nothing
stretched, no wall left showing inside the arch, at any angle the film reaches. The crop is taken at the full height
of the source, so nothing is enlarged: the subject is as big as the photographer left it.

## 2. The five photographs

Four of the five are replaced. The technical one stays, because it is the one the client named as right — and it is
the yardstick the others are now chosen by: **one person, whole, at work, with their place legible around them.**

| World | was | is |
|---|---|---|
| Hospitality | a close-up of hands pouring coffee | a doorman in a red tunic at his post in a hotel lobby, under a chandelier |
| Events & Promotions | three people beside a table in a side room | two hosts laying out name badges along a registration desk |
| Facilities & Support | a housekeeper making a bed in a bedroom | a cleaner working the floor of a glass-walled office |
| Specialist & Technical | *(unchanged)* | a technician kneeling at an open electrical panel |
| Recruitment & Workforce | a cropped handshake over a laptop | a woman at a desk taking a page held out to her |

Two come from the site's own photography (`media/stock`), two are new; all are Pexels or Unsplash Licence, none is
Unsplash+, and the only readable words anywhere in the set are the generic "REGISTRATION DESK" card (credits and the
claim-safety notes: `media/hero5/SOURCES.md`). The grade carries a little more contrast than the site's flat stock
grade: seen through a doorway, under the court's bloom and its rain of light, a picture with lifted blacks goes to
haze.

## 3. The film upright (phones and tablets)

Until now the film was laid out for wide screens only. Upright, it is framed the other way about: there is no room
beside a doorway for words, so **the doorway stands squarely across the top of the screen and the words stand on the
floor below it**, on the doorway's own ground line (`--door-bottom`, published by the canvas).

- **At a doorway** the camera is level, ten metres back, and the opening runs from a tenth to about three fifths of
  the height. The sun comes down to 36° and stays behind the doorway, so the wall's shade reaches past us and the
  floor under the words is plain stone; the picture beyond is made to cast a shadow, so no beam comes through the
  opening to fall across them. The world beyond is a lit picture and loses nothing by it.
- **The first screen** keeps its turn. The dome fills the top, the doorways pass through the middle, the pool holds
  the centre, and the title stands on the floor before it — two lines now, fitted to the margins and capped by the
  pool's near rim.
- **The ring of names** has no room for five names on a phone, so it becomes the five doorways numbered, with the
  mark still riding under the one you face. Each is a button, and says its world's name to a screen reader; the name
  itself is said by the words at each stop.
- A phone on its side (390 px of height) pitches the first screen down a little, so the floor in front of the pool
  keeps its band for the title.

One swipe still plays exactly one leg, and the swipe after the title card scrolls the page (`.qa/pw/touch-film.mjs`).

## 4. Engineering notes (on top of 07)

| Where | What |
|---|---|
| `court/scene.ts` | `COURT.door` widened; `COURT.stop` holds where the camera stands at a doorway, so the picture can be cut to what that camera sees; the picture's size is computed from that cone and the photograph fitted into it (`cover`); `Room.pic` is exposed so the film can make a world hold its light back. |
| `court/index.ts` | poses take the screen's shape (`ar`): under 0.92 the film is framed upright (`UP`). `doorPose`, `overviewPose`, `sunAt` and `publish()` all branch on it; a squat screen pitches the first screen down. |
| `ui.ts` | `fit()` sizes the title from the type itself (measured with a Range — the display lines are blocks that fill the width) and stacks two lines when upright; the height cap follows the screen's shape. |
| `Hero.astro` | the upright rules now hang the copy off `--door-bottom` (the v5 `--arch-bottom` was still there, which is what put the words over the picture); the ring loses its names upright; a tighter block for phones under 620 px. |
| `scripts/build-hero5.mjs` | `ar` comes from the manifest; a source may be named `stock/<file>.jpg` to take the site's own photography. |
| `.qa/pw/hero5-audit.mjs` | knows the upright layout: the words must stand clear *below* the doorway there, not beside it. |

## 5. Checked

- Layout audit, every stop on all eleven profiles (desktop, wide, laptop, short, tablet, tablet landscape, iPhone 13,
  iPhone SE, Pixel 7, Galaxy S9+, iPhone landscape): all clear.
- Touch: one swipe one leg, on a real GPU, through the whole film and out into the page.
- `tsc` clean, `npm run build` clean.
- Stills and the social image regenerated from the live court.

## 6. Open

- Performance on a real phone is untested: the device profiles run on this machine's GPU. The court starts at
  medium/low there and the governor steps it down as before.
- Dust motes in the beams: still built, not drawn (06 §6).
- The Held scene still shows the old diorama inside its moon.
- Not tested: Safari/iOS; Firefox's WebGPU.
- The workforce cards further down the page still use the older photographs for hospitality and events; the hero and
  the cards could be made one set if the client wants that.
