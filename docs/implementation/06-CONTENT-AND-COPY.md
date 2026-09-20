# 06 — Content and Copy

All copy lives in `src/data/*.ts`, never in components, so the client can correct it without touching layout.

## Voice

Short declaratives. Verbs over adjectives. Outcomes over capabilities. People are *people* or *teams*, never
"manpower", "resources" or "units". No "leading", "trusted", "world-class", "solutions-driven", "end-to-end",
"committed to excellence". If a sentence could appear on any staffing website, it is cut.

## Claim-safety rules applied to every line

1. **Confirmed facts only, stated as facts:** legal name, Qatar, CR 250993, established 2026, the two registered
   activities (hospitality services; organisation and management of events).
2. **Intended scope is written as an offer, not a track record:** "We supply…", never "We have supplied…".
3. **No numbers** of any kind about the company. No durations ("within 24 hours"), no availability ("24/7").
4. **Process and commitments are promises about behaviour.** They are marked below as *needs client confirmation*
   because the context pack says to use them only if operationally true.
5. **Not mentioned anywhere:** payroll, HRO, Employer of Record, visa/sponsorship, healthcare staffing, overseas
   recruitment licence, certifications, ISO, safety accreditation, named clients, source countries.
6. **Construction** appears exactly once, in "What we don't do".

## Homepage copy

**Hero — overview**
Label: `Workforce solutions — Doha, Qatar`
H1: **One world. Many workforces.**
Support (visually small): Hospitality, events, facilities, technical and recruitment teams from one Qatar-based partner.
Controls: `Scroll to enter` · `Skip film`

**Hero — worlds**

| # | Title | Line | Link |
|---|---|---|---|
| 01 | Hospitality | Service, kitchen and housekeeping teams, ready when your operation scales. | Hospitality staffing |
| 02 | Events & Promotions | Hosts, registration and brand teams who carry an event from doors to last guest. | Event workforce |
| 03 | Facilities & Support | The people who keep a building immaculate, shift after shift. | Facilities staffing |
| 04 | Specialist & Technical | Technicians and operators for maintenance, utilities and plant support. | Technical workforce |
| 05 | Recruitment & Workforce | We source, assess and coordinate, so the right person is in the right place. | Recruitment |

**Title card**
`NEXORA` · *The people behind **smooth operations**.*
Nexora is a Qatar-based workforce company. We supply and coordinate people for hospitality, events, facilities and
technical operations, and we recruit for businesses that want to hire directly. One partner, five kinds of
workforce, run from Doha.
Facts: **Based in** Doha, Qatar · **Registered** CR 250993 · **Established** 2026 · **Scope** Hospitality · Events ·
Facilities · Technical · Recruitment

**Five workforces** — *Five workforces. One partner.* Hint: `Drag, or use ← →`
Roles per workforce (illustrative of intended scope — *needs client confirmation*):

1. Hospitality — Waiting and service staff · Hosts and reception · Baristas and beverage service · Kitchen stewards
   and commis · Room attendants · Banqueting teams
2. Events & Promotions — Event hosts · Registration and accreditation desks · Ushers and guest guidance · Brand
   ambassadors · Exhibition stand staff · Event runners
3. Facilities & Support — Cleaning teams · Housekeeping attendants · Office and pantry assistants · Porters and
   helpers · Front desk · Supervisors
4. Specialist & Technical — Mechanical, electrical and HVAC technicians · Plant and utilities operators ·
   Instrumentation support · Technical helpers · IT and telecom field support · Warehouse operatives
5. Recruitment & Workforce — Permanent recruitment · Sourcing and assessment · Interview coordination · Onboarding
   support · On-site coordination · Rostering support

**Ways to engage** — Short-term cover · Contract teams · Project-based crews · Permanent recruitment

**Sectors** — *Where our people work.* Ten rows, roles per row in `src/data/sectors.ts`.

**Process** — *How an engagement runs.* (*needs client confirmation*)

| | Step | What happens | You approve |
|---|---|---|---|
| 01 | Brief | Tell us the roles, numbers, dates and location. We ask what is missing and tell you plainly whether we can help. | The scope |
| 02 | Source | We recruit for the specific roles from our candidate network and the market. | The role profiles |
| 03 | Screen | We interview and assess against the role, then present the people who fit. | Who goes forward |
| 04 | Deploy | Terms agreed in writing, team briefed, arrival on site coordinated. | Terms and start date |
| 05 | Support | We stay involved: attendance, replacements, feedback, changes as your needs move. | Any change to the team |

**Plate** — *Time stops. The work doesn't show.* Caption: `Plate 03 — Facilities & Support`

**What to expect** (*needs client confirmation*)
1. **One point of contact.** A named coordinator from brief to deployment. Not a queue.
2. **People briefed for your setting.** Before anyone arrives they know the venue, the standard and who they report to.
3. **Terms before anyone starts.** Roles, rates, hours and duration agreed in writing first.
4. **We stay after deployment.** Attendance, replacements and feedback are ours to handle, so your managers can manage.
5. **Straight answers.** If we cannot staff a requirement well, we say so at the brief.

**What we don't do** — We don't charge candidates a fee, at any stage. · We don't supply construction labour. ·
We don't promise headcount we can't deliver.

**Two doors**
*I need people.* — Tell us the roles, numbers and dates. No commitment; we clarify the rest with you. → `Request workforce`
*I'm looking for work.* — Register once. We contact you when a suitable role arises. It is always free. → `Register your CV`

## Employer form (`/request/`) — from the research pass

Two steps + a short path. No budget, no website, no file upload.

- **Step 1 — The requirement:** workforce (chips, pre-selected from `?workforce=`) · roles (free text with examples) ·
  headcount (`1–5`, `6–20`, `21–50`, `50+`, `Not sure yet`) · start (date or "Flexible") · duration (`One-off event`,
  `Under 3 months`, `3–12 months`, `Ongoing`, `Permanent hire`) · location in Qatar.
- **Step 2 — Your details:** name · company · work email · phone (`+974` default) · preferred channel
  (call / email / WhatsApp) · notes (optional).
- **Short path:** *Prefer a call-back?* name, company, phone or email.
- Under the button: *No commitment. Tell us what you know; we will clarify the rest with you.*
- Success: **Requirement received.** 1 We review your details. 2 A member of our team contacts you to confirm scope,
  roles and timing. 3 You receive a proposal to approve before anything proceeds.
  Deliberately absent: "shortly", "within 24 hours", "pre-vetted".

## Candidate form (`/careers/`)

Framing, stated before the form: *There are no listed vacancies yet. Register once and we will contact you if a
suitable role arises. Registration is not a job offer.*

**Nexora never charges candidates a fee to register, be considered or be placed. If anyone asks you for payment in our
name, please tell us.** — grounded in Qatar Labour Law 14/2004 Art. 33 and ILO guidance, but phrased as *company policy*,
not a legal claim, because Art. 33 literally binds licensed overseas recruiters and Nexora's licence status is
unverified. *Needs client confirmation.*

Fields: full name · email · mobile (`+974` default) · country of residence · nationality (optional) · workforce of
interest · role / skills · experience (range) · availability · CV (PDF, DOC, DOCX, ≤ 5 MB).
**Never asked:** passport, QID, photo, date of birth, religion, marital status, health — "special nature" data under
Qatar's PDPPL (Law 13 of 2016, Art. 16).

Consent (unticked, required): *I consent to Nexora Hospitality and Services W.L.L. storing and using my details and CV
to assess me for work opportunities, and to share them with prospective employers for that purpose. I can withdraw
consent or ask for deletion at any time.* Separate, optional: job alerts.

## Placeholders and how they behave

`src/data/site.ts` holds `email`, `phone`, `whatsapp`, `address`, `social`, `formEndpoint`. All are empty.

- **Empty contact values render nothing.** No "TBC", no lorem, no invented number. The Contact page and footer show
  the two doors and the enquiry form instead; lines appear automatically when values are filled in.
- **Empty `formEndpoint`** → forms validate and show their success panel with a visible
  `Preview mode — this submission was not sent` notice. It is impossible to mistake for a live form.
- **Future proof slots (documented, not rendered):** client logo strip after *What to expect*; case notes on
  `/industries/`; certifications on `/about/`; team on `/about/`; vacancies list on `/careers/`. Each is a component
  stub that returns nothing until its data array is non-empty.

## Cultural note for the client (not a change to the approved asset)

Regional convention on premium Qatar corporate sites avoids alcohol-led hospitality imagery. The approved Hospitality
scene shows a sparkling pour. The asset is locked, so it is used as supplied; **no copy anywhere names the drink**
("a pour", "mid-pour"). If the client wants zero ambiguity, the single thing to regenerate is the bottle shape in that
scene.

## Client confirmation checklist before launch

- [ ] Production domain (`SITE_URL`) · email · phone · WhatsApp · registered address · social links
- [ ] Logo files (or approval of the typographic wordmark)
- [ ] The five workforces and their role lists
- [ ] The ten sectors (especially Oil & Gas, Power & Utilities, IT & Telecom)
- [ ] The five process steps and five commitments are operationally true
- [ ] The no-fee policy statement; recruitment licensing position reviewed by counsel
- [ ] Privacy notice reviewed by counsel; data controller contact
- [ ] Form endpoint (and where CVs are stored)
- [ ] Arabic requirement and timeline
