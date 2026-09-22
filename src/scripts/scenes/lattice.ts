/**
 * The lattice the held world turns into (src/scripts/scenes/held.ts).
 *
 * A Penrose rhomb tiling, grown by Robinson-triangle deflation from a wheel of ten triangles, so it is five-fold
 * about its centre exactly like the disc and its five seams. Each rhomb is dressed with Hankin strapwork (lines
 * leave every edge's midpoint at 72° and stop where they meet), which turns the tiling into a girih: ten-point
 * stars, decagons and pentagons that never repeat — the kind of pattern the Darb-e Imam craftsmen set in tile in
 * 1453, five centuries before Penrose.
 *
 * Built once, in lattice units (the wheel has radius 1), and cut into radial bands so a frame draws only the
 * bands it can see, and a growing reveal can stop at any radius.
 *   lines   the strapwork, one continuous line network (every midpoint is shared by two rhombs)
 */
const PHI = (1 + Math.sqrt(5)) / 2;

type V = { x: number; y: number };
type Tri = [0 | 1, V, V, V];

export interface Band { r0: number; r1: number; lines: Path2D }
export interface Layer {
  /** rhomb edge, in lattice units */
  edge: number;
  bands: Band[];
  /** the angle (lattice frame) of the axis that should sit on the disc's first seam */
  axis: number;
}

const v = (x: number, y: number): V => ({ x, y });
const add = (a: V, b: V) => v(a.x + b.x, a.y + b.y);
const sub = (a: V, b: V) => v(a.x - b.x, a.y - b.y);
const mul = (a: V, k: number) => v(a.x * k, a.y * k);
const mid = (a: V, b: V) => v((a.x + b.x) / 2, (a.y + b.y) / 2);
const unit = (a: V) => { const l = Math.hypot(a.x, a.y) || 1; return v(a.x / l, a.y / l); };
const turn = (a: V, t: number) => v(a.x * Math.cos(t) - a.y * Math.sin(t), a.x * Math.sin(t) + a.y * Math.cos(t));
const meet = (p: V, d: V, q: V, e: V): V | null => {
  const den = d.x * e.y - d.y * e.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((q.x - p.x) * e.y - (q.y - p.y) * e.x) / den;
  return add(p, mul(d, t));
};

function wheel(gen: number): Tri[] {
  let tris: Tri[] = [];
  for (let i = 0; i < 10; i++) {
    let b = v(Math.cos(((2 * i - 1) * Math.PI) / 10), Math.sin(((2 * i - 1) * Math.PI) / 10));
    let c = v(Math.cos(((2 * i + 1) * Math.PI) / 10), Math.sin(((2 * i + 1) * Math.PI) / 10));
    if (i % 2 === 0) [b, c] = [c, b];
    tris.push([0, v(0, 0), b, c]);
  }
  for (let g = 0; g < gen; g++) {
    const next: Tri[] = [];
    for (const [col, a, b, c] of tris) {
      if (col === 0) {
        const p = add(a, mul(sub(b, a), 1 / PHI));
        next.push([0, c, p, b], [1, p, c, a]);
      } else {
        const q = add(b, mul(sub(a, b), 1 / PHI)), r = add(b, mul(sub(c, b), 1 / PHI));
        next.push([1, r, c, a], [1, q, r, b], [0, r, q, a]);
      }
    }
    tris = next;
  }
  return tris;
}

/**
 * @param gen    deflations of the wheel; the rhomb edge is PHI^-gen
 * @param bands  number of radial bands between the centre and the rim
 * @param reach  keep only rhombs whose centre is within this radius (the wheel's rim is ragged)
 */
export function buildLayer(gen: number, bands = 14, reach = 0.95, theta = (72 * Math.PI) / 180): Layer {
  const tris = wheel(gen);
  // Two triangles on one base make a rhomb.
  const k = (p: V) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
  const byBase = new Map<string, Tri[]>();
  for (const t of tris) {
    const a = k(t[2]), b = k(t[3]);
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const list = byBase.get(key);
    if (list) list.push(t); else byBase.set(key, [t]);
  }
  const out: Band[] = Array.from({ length: bands }, (_, i) => ({ r0: (i / bands) * reach, r1: ((i + 1) / bands) * reach, lines: new Path2D() }));
  for (const pair of byBase.values()) {
    if (pair.length !== 2) continue;
    const [t1, t2] = pair;
    let poly = [t1[1], t1[2], t2[1], t1[3]];
    const cx = (poly[0].x + poly[2].x) / 2, cy = (poly[0].y + poly[2].y) / 2;
    const d = Math.hypot(cx, cy);
    if (d > reach) continue;
    const area = poly.reduce((s, p, i) => s + (p.x * poly[(i + 1) % 4].y - poly[(i + 1) % 4].x * p.y), 0);
    if (area < 0) poly = [...poly].reverse();
    const band = out[Math.min(bands - 1, Math.floor((d / reach) * bands))];
    for (let i = 0; i < 4; i++) {
      const a = poly[i], b = poly[(i + 1) % 4], c = poly[(i + 2) % 4];
      const m1 = mid(a, b), m2 = mid(b, c);
      const p = meet(m1, turn(unit(sub(b, a)), theta), m2, turn(unit(sub(b, c)), -theta));
      if (!p) continue;
      band.lines.moveTo(m1.x, m1.y); band.lines.lineTo(p.x, p.y); band.lines.lineTo(m2.x, m2.y);
    }
  }
  // The wheel's legs run along 18° + 36°·k; every other one is a five-fold axis of the same kind.
  return { edge: Math.pow(PHI, -gen), bands: out, axis: Math.PI / 10 };
}

