# Hero v8 — the five moments seen through the doorways

Originals, never modified in place. Two of the five come from the site's own photography in `media/stock` (named
`stock/<file>.jpg` in the manifest); the rest are here. Built into `public/media/hero5` by `scripts/build-hero5.mjs`
(marks painted out, an upright crop in the doorway's own shape, the site's grade, a depth map). The manifest is
`src/data/hero5.json`.

Each picture is cropped to `ar` (0.86:1), the shape of the doorway's own view — the cone from the camera at its stop
through the opening — so that what is cropped is very nearly all that is seen. Compose for that: one person, whole,
at work, their place legible around them. Nothing tighter than a half-figure; the doorway crops the last tenth.

All under the **Pexels License** or the **Unsplash License** (both free to use and modify, no attribution required;
credited here anyway). None is Unsplash+.

| World | File | Source | Creator | Licence | Used |
|---|---|---|---|---|---|
| Hospitality | `stock/A1-hospitality-2.jpg` | https://www.pexels.com/photo/man-in-red-uniform-6474521/ | cottonbro studio | Pexels | a doorman in a red tunic and top hat at his post in a hotel lobby, under a chandelier |
| Events & Promotions | `src/px-7648051.jpg` | https://www.pexels.com/photo/7648051/ | RDNE Stock project | Pexels | two hosts laying out name badges along a registration desk |
| Facilities & Support | `stock/B3-facilities-2.jpg` | https://unsplash.com/photos/a-man-in-yellow-gloves-vacuums-a-carpeted-office-floor-CVcIMnH_7so | web seo | Unsplash | a cleaner working a vacuum along the floor of a glass-walled office |
| Specialist & Technical | `src/px-39174676.jpg` | https://www.pexels.com/photo/39174676/ | Vyvan BÙI VY VÂN | Pexels | a technician kneeling at an open electrical panel, checking it against his notes |
| Recruitment & Workforce | `src/px-7643739.jpg` | https://www.pexels.com/photo/7643739/ | RDNE Stock project | Pexels | a woman at a desk taking a page held out to her, an interview under way |

Retouching (claim safety: no third-party names or logos on the site): on the technical photograph the build paints
out a utility company's name on the helmet and on the back of the uniform, the helmet maker's sticker, and the
equipment makers' names and logos in the panel (both contactors, the soft starter). `retouch` in the manifest; the
method is `scripts/retouch.mjs` (masks keyed on the ink, a harmonic fill, the ground's grain); check every patch
before and after with `node .qa/pw/retouch-check.mjs`. The other four carry no legible third-party mark: the only
readable words in the set are the generic "REGISTRATION DESK" card on the events picture.

Replaced in session 8, at the client's request ("the images don't properly represent the workforces, and they are
too zoomed in"): the hospitality close-up of a coffee pour, the events desk in a side room, the housekeeper in a
bedroom, and the handshake over a laptop. Their originals were removed; the two clips they came from are linked in
git history (`05-HERO-V5.md`).

Chosen for Qatar: modest dress, no alcohol, people shown at work with dignity.
Replace any of them with the client's own photography by dropping a file in `src/` and editing the manifest.
