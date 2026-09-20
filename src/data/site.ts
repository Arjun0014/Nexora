/**
 * Site-wide facts and configuration.
 *
 * RULE: only values confirmed in nexora_website_context/01_SOURCE_OF_TRUTH.md are filled in.
 * Everything the client has not supplied is an EMPTY STRING and renders nothing —
 * no "TBC", no invented numbers. Fill them in here and the UI picks them up.
 */
interface Site {
  name: string; legalName: string; descriptor: string[]; tagline: string; description: string;
  cr: string; country: string; city: string; established: string; foundingDate: string;
  email: string; phone: string; whatsapp: string; address: string[]; social: { label: string; href: string }[];
  formEndpoint: { request: string; candidate: string; contact: string };
  lang: string; dir: 'ltr' | 'rtl';
}

export const site: Site = {
  name: 'Nexora',
  legalName: 'Nexora Hospitality and Services W.L.L.',
  descriptor: ['Hospitality & Services', 'Doha, Qatar'],
  tagline: 'One world. Many workforces.',
  description:
    'Nexora is a Qatar-based workforce company supplying and coordinating hospitality, events, facilities and technical teams, and recruiting for businesses that hire directly.',

  // Confirmed from the Commercial Registration.
  cr: '250993',
  country: 'Qatar',
  city: 'Doha',
  established: '2026',
  foundingDate: '2026-09-07',

  // ── Not yet supplied by the client. Leave empty until real. ──────────────────────────────
  email: '',
  phone: '', // e.g. '+974 4000 0000'
  whatsapp: '', // digits only, e.g. '97440000000'
  address: [], // e.g. ['Building 00, Street 000, Zone 00', 'P.O. Box 0000', 'Doha, Qatar']
  social: [],

  /**
   * Where the two forms POST (multipart FormData). Works with Formspree, Basin, Web3Forms,
   * Netlify Forms or a bespoke API. While empty the forms run in a clearly-labelled preview mode.
   */
  formEndpoint: {
    request: '',
    candidate: '',
    contact: '',
  },

  lang: 'en',
  dir: 'ltr',
};

export const nav = [
  { label: 'Services', href: '/services/' },
  { label: 'Industries', href: '/industries/' },
  { label: 'About', href: '/about/' },
  { label: 'Careers', href: '/careers/' },
] as const;

export const cta = {
  employer: { label: 'Request workforce', href: '/request/' },
  candidate: { label: 'Register your CV', href: '/careers/#register' },
} as const;
