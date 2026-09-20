#!/usr/bin/env node
/**
 * Outlines the NEXORA wordmark so the header, the hero's title-card mask and the footer
 * all use one identical vector (no logo files were supplied by the client).
 *
 *   npm run wordmark  →  src/data/wordmark.json
 *
 * The title-card zoom needs a point that is solidly INSIDE a letter, as close to the optical
 * centre of the word as possible, so that scaling the knock-out about that point makes the
 * viewport sit entirely within the glyph. The crossing of the X is ideal; this script finds
 * the point of maximum clearance inside the X numerically rather than assuming it.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT = path.join(ROOT, 'node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-700-normal.woff');
const TEXT = 'NEXORA';
const SIZE = 1000; // units per em of the output coordinate space
const TRACKING = 0.02; // em

const buf = await readFile(FONT);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

// Lay the glyphs out by hand so tracking and kerning are explicit and identical everywhere.
const glyphs = font.stringToGlyphs(TEXT);
const scale = SIZE / font.unitsPerEm;
let x = 0;
const paths = [];
const boxes = [];
glyphs.forEach((g, i) => {
  const p = g.getPath(x, 0, SIZE);
  paths.push(p);
  const bb = p.getBoundingBox();
  boxes.push({ char: TEXT[i], x1: bb.x1, x2: bb.x2, y1: bb.y1, y2: bb.y2 });
  let adv = g.advanceWidth * scale + TRACKING * SIZE;
  if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * scale;
  x += adv;
});

// Tight bounds → translate so the word starts at 0,0.
const minX = Math.min(...boxes.map((b) => b.x1));
const maxX = Math.max(...boxes.map((b) => b.x2));
const minY = Math.min(...boxes.map((b) => b.y1));
const maxY = Math.max(...boxes.map((b) => b.y2));
const W = maxX - minX;
const H = maxY - minY;

const r2 = (n) => Math.round(n * 100) / 100;
function toPathData(p) {
  return p.commands.map((c) => {
    const X = (v) => r2(v - minX);
    const Y = (v) => r2(v - minY);
    switch (c.type) {
      case 'M': return `M${X(c.x)} ${Y(c.y)}`;
      case 'L': return `L${X(c.x)} ${Y(c.y)}`;
      case 'Q': return `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}`;
      case 'C': return `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`;
      case 'Z': return 'Z';
      default: return '';
    }
  }).join('');
}
const d = paths.map(toPathData).join('');

// ---- find the point of maximum clearance inside the X -------------------------------------
// Flatten the X outline to polygons and brute-force a grid: even-odd point-in-polygon + distance to edges.
const xi = TEXT.indexOf('X');
function flatten(p) {
  const polys = []; let cur = []; let last = { x: 0, y: 0 };
  for (const c of p.commands) {
    if (c.type === 'M') { if (cur.length) polys.push(cur); cur = [{ x: c.x, y: c.y }]; last = c; }
    else if (c.type === 'L') { cur.push({ x: c.x, y: c.y }); last = c; }
    else if (c.type === 'Q') { for (let t = 0.25; t <= 1; t += 0.25) { const u = 1 - t; cur.push({ x: u * u * last.x + 2 * u * t * c.x1 + t * t * c.x, y: u * u * last.y + 2 * u * t * c.y1 + t * t * c.y }); } last = c; }
    else if (c.type === 'C') { for (let t = 0.25; t <= 1; t += 0.25) { const u = 1 - t; cur.push({ x: u ** 3 * last.x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x, y: u ** 3 * last.y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y }); } last = c; }
    else if (c.type === 'Z') { if (cur.length) polys.push(cur); cur = []; }
  }
  if (cur.length) polys.push(cur);
  return polys;
}
const polys = flatten(paths[xi]);
const inside = (px, py) => {
  let c = false;
  for (const poly of polys) for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};
const edgeDist = (px, py) => {
  let best = Infinity;
  for (const poly of polys) for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const dx = b.x - a.x, dy = b.y - a.y; const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
    best = Math.min(best, Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)));
  }
  return best;
};
const bx = boxes[xi];
let best = { r: 0, x: (bx.x1 + bx.x2) / 2, y: (bx.y1 + bx.y2) / 2 };
for (let gy = bx.y1; gy <= bx.y2; gy += 4) for (let gx = bx.x1; gx <= bx.x2; gx += 4) {
  if (!inside(gx, gy)) continue;
  const r = edgeDist(gx, gy);
  if (r > best.r) best = { r, x: gx, y: gy };
}

const out = {
  generated: 'by scripts/build-wordmark.mjs — do not edit by hand',
  text: TEXT,
  font: 'Instrument Sans 700 (SIL OFL)',
  width: r2(W),
  height: r2(H),
  d,
  /** Point of maximum clearance inside the X, and that clearance radius, in the same units as width/height. */
  anchor: { x: r2(best.x - minX), y: r2(best.y - minY), r: r2(best.r) },
};
await mkdir(path.join(ROOT, 'src', 'data'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'wordmark.json'), JSON.stringify(out) + '\n');

// Standalone copy used as a CSS mask by the static (no-JS / reduced-motion) title card.
await mkdir(path.join(ROOT, 'public'), { recursive: true });
await writeFile(
  path.join(ROOT, 'public', 'wordmark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${out.width} ${out.height}"><path d="${d}"/></svg>\n`,
);

// Favicon: the N of the wordmark on studio black.
const nPath = toPathData(paths[0]);
const nb = boxes[0];
const nw = nb.x2 - nb.x1, nh = nb.y2 - nb.y1, pad = nh * 0.42, side = nh + pad * 2;
await writeFile(
  path.join(ROOT, 'public', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(side)} ${r2(side)}"><rect width="100%" height="100%" rx="${r2(side * 0.16)}" fill="#0b0a09"/><path transform="translate(${r2((side - nw) / 2 - (nb.x1 - minX))} ${r2(pad - (nb.y1 - minY))})" d="${nPath}" fill="#c48a55"/></svg>\n`,
);
console.log(`wordmark ${out.width}×${out.height}, path ${d.length} chars, anchor (${out.anchor.x}, ${out.anchor.y}) clearance r=${out.anchor.r}`);
console.log(`→ scale needed for a 16:9 stage at 88% width: ~${Math.ceil((Math.hypot(1, 9 / 16) / 2) / (0.88 * out.anchor.r / out.width))}×`);
