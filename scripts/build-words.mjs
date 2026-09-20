#!/usr/bin/env node
/**
 * Outlines the words used by the zoom-type chapter transitions.
 *
 *   npm run words  →  src/data/words.json
 *
 * The transition fills the stage with the outgoing chapter's ground and knocks the word out of it, then scales
 * that knock-out about a point INSIDE one letter until the letter swallows the viewport — so the next chapter
 * is literally revealed through the counter of an O. That needs the same thing the NEXORA title card needs: a
 * point of maximum clearance inside a chosen glyph, found numerically rather than assumed.
 *
 * Shares its geometry with scripts/build-wordmark.mjs; kept separate so the wordmark stays a single fixed asset.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT = path.join(ROOT, 'node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-700-normal.woff');
const SIZE = 1000;
const TRACKING = -0.005; // em — display setting is tighter than the wordmark's

/** word → index of the glyph whose interior the zoom is anchored in (an O gives a counter to fly through). */
const WORDS = [
  { text: 'WORKFORCES', anchorAt: 1 },
  { text: 'SECTORS', anchorAt: 4 },
];

const buf = await readFile(FONT);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const r2 = (n) => Math.round(n * 100) / 100;

function layout(text) {
  const glyphs = font.stringToGlyphs(text);
  const scale = SIZE / font.unitsPerEm;
  let x = 0;
  const paths = [];
  const boxes = [];
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, 0, SIZE);
    paths.push(p);
    const bb = p.getBoundingBox();
    boxes.push({ char: text[i], ...bb });
    let adv = g.advanceWidth * scale + TRACKING * SIZE;
    if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * scale;
    x += adv;
  });
  return { paths, boxes };
}

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

/**
 * The largest circle that fits inside the glyph. For an O that is inside the STROKE, not the counter — which is
 * what we want: the knock-out must stay solid as it grows, so the viewport ends up inside painted area.
 */
function clearance(glyphPath, box) {
  const polys = flatten(glyphPath);
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
  let best = { r: 0, x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };
  for (let gy = box.y1; gy <= box.y2; gy += 3) for (let gx = box.x1; gx <= box.x2; gx += 3) {
    if (!inside(gx, gy)) continue;
    const r = edgeDist(gx, gy);
    if (r > best.r) best = { r, x: gx, y: gy };
  }
  return best;
}

const out = { generated: 'by scripts/build-words.mjs — do not edit by hand', font: 'Instrument Sans 700 (SIL OFL)', words: {} };

for (const spec of WORDS) {
  const { paths, boxes } = layout(spec.text);
  const minX = Math.min(...boxes.map((b) => b.x1));
  const maxX = Math.max(...boxes.map((b) => b.x2));
  const minY = Math.min(...boxes.map((b) => b.y1));
  const maxY = Math.max(...boxes.map((b) => b.y2));
  const toPathData = (p) => p.commands.map((c) => {
    const X = (v) => r2(v - minX), Y = (v) => r2(v - minY);
    switch (c.type) {
      case 'M': return `M${X(c.x)} ${Y(c.y)}`;
      case 'L': return `L${X(c.x)} ${Y(c.y)}`;
      case 'Q': return `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}`;
      case 'C': return `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`;
      case 'Z': return 'Z';
      default: return '';
    }
  }).join('');

  const i = spec.anchorAt;
  const a = clearance(paths[i], boxes[i]);
  out.words[spec.text] = {
    width: r2(maxX - minX),
    height: r2(maxY - minY),
    d: paths.map(toPathData).join(''),
    anchorChar: spec.text[i],
    anchor: { x: r2(a.x - minX), y: r2(a.y - minY), r: r2(a.r) },
  };
  console.log(`${spec.text}: ${r2(maxX - minX)}x${r2(maxY - minY)}, anchor in "${spec.text[i]}" at (${r2(a.x - minX)}, ${r2(a.y - minY)}) r=${r2(a.r)}`);
}

await mkdir(path.join(ROOT, 'src', 'data'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'words.json'), JSON.stringify(out) + '\n');
console.log('→ src/data/words.json');
