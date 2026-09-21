/**
 * Licence-clean photography, as ready-to-use image attributes. The manifest is src/data/stock.json; the files are
 * built into public/media/stock by `npm run stock` (graded to one look). Credits: media/stock/SOURCES.md.
 */
import manifest from './stock.json';

export interface Photo {
  /** landscape, 1400w */
  src: string;
  srcset: string;
  /** 4:5 crop, same pixels as a cover-fitted landscape at `focus` */
  card: string;
  cardSrcset: string;
  focus: string;
  alt: string;
}

type Entry = { file: string; focus: string; alt: string };
const BASE = '/media/stock';

const photo = (e: Entry): Photo => ({
  src: `${BASE}/${e.file}-1400.webp`,
  srcset: [800, 1400, 2400].map((w) => `${BASE}/${e.file}-${w}.webp ${w}w`).join(', '),
  card: `${BASE}/${e.file}-card-960.webp`,
  cardSrcset: [640, 960].map((w) => `${BASE}/${e.file}-card-${w}.webp ${w}w`).join(', '),
  focus: e.focus,
  alt: e.alt,
});

const group = <K extends string>(g: Record<K, Entry>) =>
  Object.fromEntries(Object.entries(g).map(([k, v]) => [k, photo(v as Entry)])) as Record<K, Photo>;

const { _: _note, ...groups } = manifest;
export const stock = {
  workforces: group(groups.workforces),
  sectors: group(groups.sectors),
  doha: group(groups.doha),
  steps: group(groups.steps),
  engage: group(groups.engage),
  doors: group(groups.doors),
};
