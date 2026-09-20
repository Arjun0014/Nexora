/**
 * The five workforces — the site's primary taxonomy and the five worlds of the hero.
 * Role lists describe INTENDED scope (client brief) and need client confirmation before launch.
 */
export type WorldId = 'hospitality' | 'events' | 'facilities' | 'technical' | 'recruitment';

export interface World {
  id: WorldId;
  n: string;
  title: string;
  /** Title broken for large stacked setting. */
  titleLines: string[];
  short: string;
  /** One outcome sentence, used over the hero scene. */
  line: string;
  /** Longer description for the deck panel and the services page. */
  body: string;
  roles: string[];
  linkLabel: string;
  /** Describes the frozen scene for assistive tech. */
  alt: string;
  /** What is caught mid-air — used in captions. */
  frozen: string;
  /** object-position for wide crops of the reference still. */
  focus: string;
}

export const worlds: World[] = [
  {
    id: 'hospitality',
    n: '01',
    title: 'Hospitality',
    titleLines: ['Hospitality'],
    short: 'Hospitality',
    line: 'Service, kitchen and housekeeping teams, ready when your operation scales.',
    body: 'Hotels, restaurants and venues run on people who notice things. We supply front-of-house, kitchen and housekeeping teams for a single service, a season or the long term, briefed on your standards before they arrive.',
    roles: ['Waiting and service staff', 'Hosts and reception', 'Baristas and beverage service', 'Kitchen stewards and commis', 'Room attendants', 'Banqueting teams'],
    linkLabel: 'Hospitality staffing',
    alt: 'A waiter frozen mid-pour at a candle-lit table, the stream of liquid suspended in the air.',
    frozen: 'a pour, suspended',
    focus: '70% 50%',
  },
  {
    id: 'events',
    n: '02',
    title: 'Events & Promotions',
    titleLines: ['Events &', 'Promotions'],
    short: 'Events',
    line: 'Hosts, registration and brand teams who carry an event from doors to last guest.',
    body: 'Conferences, exhibitions, launches and activations. We provide the hosts, registration desks, ushers and brand teams that guests actually meet, scaled to the run of show and stood down when it ends.',
    roles: ['Event hosts', 'Registration and accreditation desks', 'Ushers and guest guidance', 'Brand ambassadors', 'Exhibition stand staff', 'Event runners'],
    linkLabel: 'Event workforce',
    alt: 'An event host frozen while handing a lanyard to a guest, the ribbon curved in mid-air between their hands.',
    frozen: 'a lanyard, mid-handover',
    focus: '73% 50%',
  },
  {
    id: 'facilities',
    n: '03',
    title: 'Facilities & Support',
    titleLines: ['Facilities', '& Support'],
    short: 'Facilities',
    line: 'The people who keep a building immaculate, shift after shift.',
    body: 'Housekeeping, cleaning and support staff for hotels, offices, residences and public spaces. Steady teams, supervised, with cover arranged by us when someone is away.',
    roles: ['Cleaning teams', 'Housekeeping attendants', 'Office and pantry assistants', 'Porters and helpers', 'Front desk', 'Supervisors'],
    linkLabel: 'Facilities staffing',
    alt: 'A housekeeping attendant frozen while unfolding fresh linen, the white fabric hanging in the air beside a service trolley.',
    frozen: 'linen, mid-fold',
    focus: '76% 50%',
  },
  {
    id: 'technical',
    n: '04',
    title: 'Specialist & Technical',
    titleLines: ['Specialist', '& Technical'],
    short: 'Technical',
    line: 'Technicians and operators for maintenance, utilities and plant support.',
    body: 'Skilled people for operating environments: maintenance, utilities, plant rooms, production and logistics. Operations and upkeep, not construction. Matched on trade and experience, deployed for a shutdown, a project or an ongoing contract.',
    roles: ['Mechanical, electrical and HVAC technicians', 'Plant and utilities operators', 'Instrumentation support', 'Technical helpers', 'IT and telecom field support', 'Warehouse operatives'],
    linkLabel: 'Technical workforce',
    alt: 'A technician kneeling at an open equipment panel, frozen mid-adjustment with a cable hanging in the air.',
    frozen: 'a connection, mid-adjustment',
    focus: '78% 50%',
  },
  {
    id: 'recruitment',
    n: '05',
    title: 'Recruitment & Workforce',
    titleLines: ['Recruitment', '& Workforce'],
    short: 'Recruitment',
    line: 'We source, assess and coordinate, so the right person is in the right place.',
    body: 'The capability behind the other four. When you want to hire directly, we search, assess and present candidates. When our people are on your site, we coordinate them: who is where, when, and who covers.',
    roles: ['Permanent recruitment', 'Sourcing and assessment', 'Interview coordination', 'Onboarding support', 'On-site coordination', 'Rostering support'],
    linkLabel: 'Recruitment',
    alt: 'A recruiter frozen while passing a document across a desk to a candidate, the page floating between their hands.',
    frozen: 'a document, mid-air',
    focus: '72% 50%',
  },
];

export const worldById = Object.fromEntries(worlds.map((w) => [w.id, w])) as Record<WorldId, World>;

export const overview = {
  label: 'Workforce solutions — Doha, Qatar',
  headline: ['One world.', 'Many workforces.'],
  support: 'Hospitality, events, facilities, technical and recruitment teams from one Qatar-based partner.',
  alt: 'A circular architectural model divided into five lit sectors — a restaurant, an event hall, a lobby, a plant room and an office — turning slowly in a dark studio.',
};
