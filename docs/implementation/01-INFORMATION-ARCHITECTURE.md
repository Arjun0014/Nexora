# 01 — Information Architecture

## Model chosen: cinematic homepage + a small set of functional pages

The context pack offered three models. Decision: **Model C (hybrid)**.

- A pure single page cannot carry two conversion flows (a two-step employer form and a CV upload) without turning
  the end of a cinematic page into a form wall, and it gives search engines one URL for everything.
- A deep multi-page site (one page per service, per sector) would be thin filler: there are no projects, team
  profiles or vacancies to put on those pages yet. Thin pages make a new company look *smaller*.

So the homepage tells the whole story and the subpages exist only where a visitor has a job to do.

## Sitemap

```
/                 Home — film, title card, workforces, sectors, process, commitments, two doors
/services/        The five workforces in depth + the four ways to engage (anchors per item)
/industries/      Ten sectors, each with the roles typically supplied
/about/           Who Nexora is, how it works, legal identity, what it does not do
/request/         EMPLOYER conversion — two-step requirement form + quick call-back path
/careers/         CANDIDATE conversion — how it works, no-fee policy, registration + CV
/contact/         General enquiries; routes people to the right door
/privacy/         Plain-language notice covering exactly what the two forms collect
/404
```

`/request/` is named for the action, not the audience, because it is the primary CTA label everywhere
("Request workforce").

## Two axes instead of one mixed list

The content brief lists eight "services" that mix *who is supplied* with *how they are engaged*. Splitting them makes
both lists shorter and both clearer:

**Workforces — who** (the five hero worlds, used everywhere as the primary taxonomy)

1. Hospitality
2. Events & Promotions
3. Facilities & Support
4. Specialist & Technical
5. Recruitment & Workforce Management *(the capability that sits behind the other four)*

**Engagements — how**

- Short-term cover (events, peaks, absence)
- Contract teams (long-term, on-site)
- Project-based crews (defined scope and end date)
- Permanent recruitment (we find, you hire)

**Sectors — where** (ten, construction excluded, healthcare omitted until verified)

Hospitality & Hotels · Events & Exhibitions · Facilities Management · Retail & Brand Promotion ·
Oil & Gas Operations · Power & Utilities · Manufacturing · Technical Operations & Maintenance ·
IT & Telecommunications · Logistics & Transport Support

## Navigation

**Header (all pages)** — wordmark left with a two-line descriptor (`Hospitality & Services` / `Doha, Qatar`);
right: `Services · Industries · About · Careers` as 11px uppercase text links, then one bordered text button
**Request workforce**. No hamburger on desktop, no mega-menu: four links do not need one.

- Over the hero the header is transparent and the descriptor is visible.
- After the hero it becomes a slim bar, hides on scroll-down and returns on scroll-up (it never hides while a form
  field is focused).
- It switches ink automatically between light-on-dark and dark-on-paper based on the section beneath it
  (`data-theme` on sections + IntersectionObserver).

**Mobile** — wordmark + `Menu` text button. The menu is a full-screen studio-black sheet: the four links set in the
display serif at large size, numbered 01–04, the two CTAs pinned at the bottom. Focus is trapped, `Esc` closes, the
page behind is inert.

**Hero-only navigation** — the five-wedge progress glyph (see `04`). Each wedge is a real button; plus a
**Skip film** control so an employer in a hurry reaches the content in one action.

**Footer** — Workforces (5 links to `/services/#…`), Company, For candidates, legal identity line, language note.

**Skip link** — first focusable element on every page: "Skip to content". On the homepage it targets the title
card, i.e. past the film.

## Journeys

**Employer** (primary)

```
Hero world copy ──► "Hospitality staffing →" ─┐
Header CTA (always visible) ──────────────────┤
Deck detail panel "Request this workforce" ───┼──► /request/?workforce=hospitality
Two doors: "I need people" ───────────────────┤        step 1 The requirement (pre-selected from the query)
Services / Industries page CTAs ──────────────┘        step 2 Your details
                                                       └─► success: what happens next (3 steps, no time promise)
```

The `workforce` / `sector` query parameter pre-selects the matching chip so context is never lost between pages.

**Candidate** (secondary, never hidden)

```
Header "Careers" · Two doors "I'm looking for work" · Footer
   └─► /careers/  honest framing (no listed vacancies yet; registration is not a job offer)
                  no-fee policy → registration form → CV upload → consent → success
```

**Everyone else** → `/contact/`, which immediately offers the two doors before the general form, so mis-routed
employers and candidates self-correct.

## Language

English only at launch. **No Arabic toggle is rendered** — a dead toggle is worse than none. The build is RTL-ready:
logical CSS properties throughout (`margin-inline`, `inset-inline-start`, `text-align: start`), `lang`/`dir` set on
`<html>` from one config value, and Arabic companion faces chosen (`03`). The hero composition is never mirrored in
RTL; only the copy column alignment would change.
