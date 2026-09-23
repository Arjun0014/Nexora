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
  /** What the world's film shows, as a short caption. */
  frozen: string;
  /** Describes the world's film in the hero's doorway, for assistive tech and its static poster (the `alt` above
   *  describes the older rendered stills). */
  moment: string;
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
    frozen: 'a guest, checking in',
    moment: 'A receptionist in a red blazer answers the phone at a hotel reception desk as a guest signs in.',
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
    frozen: 'guests, being signed in',
    moment: 'Event hosts sign guests in at a conference: one checks names on a clipboard while another hands out lanyards.',
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
    frozen: 'an office, being cleaned',
    moment: 'A cleaning crew in orange overalls vacuums the floor and wipes down an office kitchen and dining area.',
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
    frozen: 'a weld, under way',
    moment: 'A welder bends over his workbench in a dim workshop, sparks and blue light around him.',
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
    frozen: 'an interview, going well',
    moment: 'Two candidates smile across the table from their interviewer, an interview going well.',
    focus: '72% 50%',
  },
];

export const worldById = Object.fromEntries(worlds.map((w) => [w.id, w])) as Record<WorldId, World>;

export const overview = {
  label: 'Workforce solutions — Doha, Qatar',
  /** Set as one line in the film (the lines only break in the static reading); `many` is the italic accent. */
  headline: ['One world,', 'many workforces.'],
  support: 'Hospitality, events, facilities, technical and recruitment teams from one Qatar-based partner.',
  alt: 'A limestone court under a latticed brass dome, turning slowly about its pool; five tall doorways open onto five films of people at work.',
};
