/**
 * Homepage + shared copy that is not part of the five-world taxonomy.
 * Anything marked CONFIRM describes behaviour the client must actually stand behind —
 * see docs/implementation/06-CONTENT-AND-COPY.md.
 */
import type { WorldId } from './worlds';

export const statement = {
  label: 'Who we are',
  // The italic span is the one place the display italic is used.
  heading: ['The people behind', 'smooth operations.'],
  emphasis: 'smooth operations.',
  body: 'Nexora is a Qatar-based workforce company. We supply and coordinate people for hospitality, events, facilities and technical operations, and we recruit for businesses that want to hire directly. One partner, five kinds of workforce, run from Doha.',
  facts: [
    { k: 'Based in', v: 'Doha, Qatar' },
    { k: 'Registered', v: 'CR 250993' },
    { k: 'Established', v: '2026' },
    { k: 'Scope', v: 'Hospitality · Events · Facilities · Technical · Recruitment' },
  ],
};

export const engagements = [
  { id: 'short-term', title: 'Short-term cover', body: 'A single event, a seasonal peak, a gap while someone is away. People for days or weeks, stood down when the need ends.' },
  { id: 'contract', title: 'Contract teams', body: 'A standing team on your site for months or longer, supervised and kept at strength by us.' },
  { id: 'project', title: 'Project-based crews', body: 'A defined scope with a start and an end: an opening, a shutdown, a fit-for-purpose crew assembled around it.' },
  { id: 'permanent', title: 'Permanent recruitment', body: 'You hire directly. We search, assess and present the people worth meeting.' },
];

export interface Sector { id: string; name: string; roles: string; body: string; worlds: WorldId[] }

// Construction is excluded. Healthcare is omitted until the client verifies it.
export const sectors: Sector[] = [
  { id: 'hotels', name: 'Hospitality & Hotels', roles: 'Service staff · Housekeeping · Front office · Kitchen support · Banqueting', body: 'Hotels, serviced residences, restaurants and catering operations that need dependable people through every shift and a larger team when occupancy climbs.', worlds: ['hospitality', 'facilities'] },
  { id: 'events', name: 'Events & Exhibitions', roles: 'Hosts · Registration · Ushers · Stand staff · Runners', body: 'Conferences, exhibitions, ceremonies and corporate gatherings, staffed for the run of show and no longer.', worlds: ['events'] },
  { id: 'facilities', name: 'Facilities Management', roles: 'Cleaning teams · Attendants · Porters · Supervisors', body: 'Offices, residences, malls and public buildings. Steady teams, consistent standards, cover handled by us.', worlds: ['facilities'] },
  { id: 'retail', name: 'Retail & Brand Promotion', roles: 'Brand ambassadors · Promoters · Sales support · Merchandisers', body: 'In-store promotions, product launches and seasonal retail peaks, with people who can speak for a brand.', worlds: ['events'] },
  { id: 'oil-gas', name: 'Oil & Gas Operations', roles: 'Technicians · Operators · Technical helpers · Camp support', body: 'Support for operating assets and the facilities around them: maintenance, utilities and camp services. Operations, not construction.', worlds: ['technical', 'facilities'] },
  { id: 'power', name: 'Power & Utilities', roles: 'Electrical technicians · Plant operators · Instrumentation support', body: 'Skilled trades for plants and networks that cannot stop, on contract or for planned work.', worlds: ['technical'] },
  { id: 'manufacturing', name: 'Manufacturing', roles: 'Line operators · Maintenance technicians · Packers · Quality support', body: 'Production, packing and maintenance teams that flex with the order book.', worlds: ['technical'] },
  { id: 'maintenance', name: 'Technical Operations & Maintenance', roles: 'Mechanical · Electrical · HVAC · Plant-room support', body: 'The trades that keep buildings and equipment running, from a single specialist to a standing team.', worlds: ['technical'] },
  { id: 'it-telecom', name: 'IT & Telecommunications', roles: 'Field support · Installation technicians · Service desk staff', body: 'Field and desk-side support for rollouts, installations and day-to-day service.', worlds: ['technical', 'recruitment'] },
  { id: 'logistics', name: 'Logistics & Transport Support', roles: 'Warehouse operatives · Loaders · Dispatch support', body: 'Warehouse and dispatch teams for steady operations and seasonal volume.', worlds: ['technical'] },
];

// CONFIRM: use only if operationally true.
export const process = {
  label: 'How an engagement runs',
  heading: ['From a brief', 'to people on site.'],
  intro: 'Five steps, and at each one you know what we are doing and what you are asked to approve.',
  steps: [
    { n: '01', title: 'Brief', body: 'Tell us the roles, numbers, dates and location. We ask what is missing and tell you plainly whether we can help.', approve: 'The scope' },
    { n: '02', title: 'Source', body: 'We recruit for the specific roles, from our candidate network and from the market.', approve: 'The role profiles' },
    { n: '03', title: 'Screen', body: 'We interview and assess against the role, then present the people who fit.', approve: 'Who goes forward' },
    { n: '04', title: 'Deploy', body: 'Terms are agreed in writing, the team is briefed, and arrival on site is coordinated.', approve: 'Terms and start date' },
    { n: '05', title: 'Support', body: 'We stay involved: attendance, replacements, feedback, and changes as your needs move.', approve: 'Any change to the team' },
  ],
};

export const plate = {
  world: 'facilities' as WorldId,
  line: ['Time stops.', 'The work doesn’t show.'],
  caption: 'Plate 03 — Facilities & Support · linen, mid-fold',
};

// CONFIRM: these are promises about behaviour.
export const commitments = {
  label: 'What to expect',
  heading: ['No numbers to show you yet.', 'So here is how we work.'],
  items: [
    { title: 'One point of contact.', body: 'A named coordinator from brief to deployment. Not a queue.' },
    { title: 'People briefed for your setting.', body: 'Before anyone arrives, they know the venue, the standard and who they report to.' },
    { title: 'Terms before anyone starts.', body: 'Roles, rates, hours and duration agreed in writing first.' },
    { title: 'We stay after deployment.', body: 'Attendance, replacements and feedback are ours to handle, so your managers can manage.' },
    { title: 'Straight answers.', body: 'If we cannot staff a requirement well, we say so at the brief.' },
  ],
  dontLabel: 'What we don’t do',
  donts: [
    'We don’t charge candidates a fee, at any stage.',
    'We don’t supply construction labour.',
    'We don’t promise headcount we can’t deliver.',
  ],
};

export const doors = {
  employer: {
    label: 'For employers',
    heading: ['I need', 'people.'],
    body: 'Tell us the roles, numbers and dates. No commitment; we clarify the rest with you.',
    cta: 'Request workforce',
    href: '/request/',
    cursor: 'Request',
  },
  candidate: {
    label: 'For candidates',
    heading: ['I’m looking', 'for work.'],
    body: 'Register once. We contact you when a suitable role arises. It is always free.',
    cta: 'Register your CV',
    href: '/careers/',
    cursor: 'Apply',
  },
};

export const noFee = {
  heading: 'Nexora never charges candidates.',
  body: 'Not to register, not to be considered, not to be placed. If anyone asks you for payment in our name, please tell us.',
};
