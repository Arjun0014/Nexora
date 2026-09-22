# Hero v5 — the five moments

Originals, never modified in place. For the two clips only the frame used is kept (the clips are 56 MB; re-download
them from the links below to choose another moment, and give `time` in the manifest instead). Built into `public/media/hero5` by `scripts/build-hero5.mjs` (frame pulled from a
clip, marks painted out, 0.9:1 crop round the action, the site's grade, a depth map). The manifest is
`src/data/hero5.json`.

All under the **Pexels License** (free to use and modify, no attribution required; credited here anyway).

| World | File | Source | Creator | Used |
|---|---|---|---|---|
| Hospitality | `src/px-v5988416-2.2s.jpg` (frame at 2.2 s of the 4K clip) | https://www.pexels.com/video/person-pouring-coffee-into-dallah-5988416/ | Tima Miroshnichenko | frame at 2.2 s: Arabic coffee poured from a dallah |
| Events & Promotions | `src/px-7648057.jpg` | https://www.pexels.com/photo/7648057/ | RDNE Stock project | a registration desk at a conference |
| Facilities & Support | `src/px-v9472830-4.15s.jpg` (frame at 4.15 s of the 4K clip) | https://www.pexels.com/video/two-women-in-white-aprons-are-making-a-bed-9472830/ | Liliana Drew | frame at 4.15 s: a housekeeper lifting a sheet |
| Specialist & Technical | `src/px-39174676.jpg` | https://www.pexels.com/photo/39174676/ | Vyvan BÙI VY VÂN | an engineer inspecting an electrical panel |
| Recruitment & Workforce | `src/px-5673488.jpg` | https://www.pexels.com/photo/5673488/ | Sora Shimazaki | a handshake over a desk |

Retouching (claim safety: no third-party names or logos on the site): on the technical photograph the build paints
out a utility company's name on the helmet and on the back of the uniform, the helmet maker's sticker, and the
equipment makers' names and logos in the panel (both contactors, the soft starter). `retouch` in the manifest; the
method is `scripts/retouch.mjs` (masks keyed on the ink, a harmonic fill, the ground's grain); check every patch
before and after with `node .qa/pw/retouch-check.mjs`.

Chosen for Qatar: modest dress, no alcohol (the pour is gahwa), people shown at work with dignity.
Replace any of them with the client's own photography by dropping a file in `src/` and editing the manifest.
