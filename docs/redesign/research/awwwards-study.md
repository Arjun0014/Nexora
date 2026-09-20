# Awwwards study for the Nexora post-hero redesign

Status: IN PROGRESS (site blocks are appended as each site is finished; synthesis is written last).

## Method note

(filled in at the end)

## How to read the site blocks

- All measurements were taken in headless Chromium at 1440x900 (desktop) and 390x844 (phone) on 2026-09-21.
- `vw` values are computed font-size divided by viewport width. `vh` page lengths are `scrollHeight / 900`.
- Tracking is given in em (negative = tighter). `lh` = line-height as a multiple of font-size.
- Colours are computed `background-color` values or pixel samples from screenshots (marked "px").
- "SOTD" = Awwwards Site of the Day. Scores are the Awwwards jury score out of 10 as shown on the detail page.

## Site blocks

### 1. Aspen Search — https://www.aspensearch.com/
1. **What / award**: Executive-search (recruitment) firm for quant finance and tech. SOTD 15 Sep 2026, 7.48. Next.js + Lenis. Closest sector match to Nexora in the whole study.
2. **Pacing**: 12.1 vh desktop, 17.6 vh phone. 7 scenes: hero grid (2.0 vh), positioning + service cells (2.2), clients (1.9), testimonials (1.6), team (2.3), giant-type CTA (1.0), footer (0.9). Never a full-bleed "band": every scene is a set of cells in one continuous grid. It breathes by leaving entire grid cells empty (white), not by adding vertical padding.
3. **Type**: one family, Suisse Intl at weight 450, plus Suisse Intl Mono 400 for labels. Display 180.7 px = 12.55 vw, lh 1.0; section words ("Clients", "Team") same size; uppercase statement lines 150 px = 10.43 vw at lh 0.82; h3 37.9 px = 2.63 vw lh 1.1; body 16 px lh 1.3; mono labels 12 px uppercase lh 1.1. Tracking is a flat -0.04 em (CSS `letter-spacing: -4%`) on everything, including body. Ladder: 12 / 14 / 16 / 24 / 31 / 38 / 80 / 108-181. Display is 11.3x body; nothing between 38 and 80 px, which is what makes the big type read as architecture rather than as "a heading".
4. **Grid**: 6 equal columns (240 px at 1440), zero outer margin, every cell edged by a 1 px #232323 hairline. Cells are square or 2:1. The header is a grid row too: logo cell, live local-time cell (LA/NYC clock), nav cell, theme toggle cell, dark "Contact" cell. Text sits top-left in its cell with ~12 px inset; large words bottom-left. Asymmetry comes from which cells are left empty.
5. **Colour**: #ffffff base, #e0e0e0 and #d9d9d9 grey cells, #232323 charcoal cells, one accent #a1ffcb (mint). Client brand colours (#004b87, #08225a, #009aa6, #262160) appear only inside the active client cell. No page-long grade: colour is distributed per cell like a checkerboard. All transitions are hard cuts on hairlines.
6. **Images**: no normal photography. The brand mark and landscapes are rendered as 1-bit halftone/dither fields on 5 canvases; team portraits are `filter: grayscale(1)` with a mint name plate under each. The dither is the texture that replaces grain.
7. **Transitions / scroll**: Lenis. 12 CSS `position: sticky` elements, 0 GSAP pin-spacers: the giant section words stick inside their cell while neighbouring cells scroll past. CTA scene: the words LET'S / START / A / CONVERSATION each sit in their own black, white or mint tile over the dither field.
8. **Cursor**: native cursor kept; hover feedback is cell-level (cell fills with mint or the client's brand colour, arrow nudges).
9. **Services / process / contact**: services are three charcoal cells stacked in one column, each = tiny mono index (01-03), 38 px title, one paragraph, a generative wireframe figure (overlapping circles, a rotating meridian sphere) and four mono tags with a mint square bullet. No icons, no cards with shadows. No process section. Footer is a cell grid: tagline cell ("Raise your trajectory"), nav cell, two city clocks, email cell, LinkedIn cell, a large charcoal logo cell and a mint "Let's start a conversation" cell crossed by a single diagonal arrow line.
10. **Mobile**: grid drops to 2 columns but keeps its hairlines; display rises to 20.7 vw uppercase at lh 0.82; header stays a grid row with a mint "Menu" cell; service cells stack; team becomes full-width B/W portrait + mint plate. Nothing is removed.
11. **Transferable principle**: a visible, strict modular grid with hairlines and deliberately empty cells is a complete art direction on its own; it reads as "institution" without a single proof point. Solves: *making a new company feel established without proof*, and *footer* (footer as a grid of useful cells: Doha local time, email, registration number, giant mark).
   Caveat for Nexora: Aspen leans on stats (500+, $1M-5M, 19+ years). Remove them and the grid still holds, which is the point.

<!-- APPEND-HERE -->
