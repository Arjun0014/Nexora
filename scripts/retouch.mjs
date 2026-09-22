// Paint marks out of a photograph (claim safety: no third-party names or logos on the site), keyed on their ink.
//
// A patch is a rectangle in the source and the ink of the mark inside it (`ink` may list several):
//   blue | red | green   saturated ink: that channel stands `t` clear of the other two
//   white                bright neutral ink, whatever the ground round it (lettering printed on cloth)
//   light | dark         ink lighter / darker than the patch's own ground (its median luminance) by `t`
//   grey                 a neutral grey darker than `t` (for `keep`)
// Keying on the ink, not on the rectangle, leaves everything else in the rectangle alone. `keep` optionally names what
// must survive untouched though the mark runs up to it, with the same tests (the grey wall behind a shoulder): the
// hole never grows into it, and it is a mirror to the fill, so it does not bleed into what is painted.
//
// The mark, grown by `grow` px to take in its soft rim and the JPEG's ringing, is refilled by solving Laplace's
// equation inside it with the ground round it as the boundary (a harmonic fill: no seams, no blotches), then given
// back the grain measured on that ground (a robust estimate, so nearby edges do not count as grain).
import sharp from 'sharp';

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const TEST = {
  blue: (r, g, b, t) => b - Math.max(r, g) > t,
  red: (r, g, b, t) => r - Math.max(g, b) > t,
  green: (r, g, b, t) => g - Math.max(r, b) > t,
  white: (r, g, b, t) => Math.min(r, g, b) > t && Math.max(r, g, b) - Math.min(r, g, b) < 44,
  light: (r, g, b, t, ground) => lum(r, g, b) > ground + t,
  dark: (r, g, b, t, ground) => lum(r, g, b) < ground - t,
  grey: (r, g, b, t) => lum(r, g, b) < t && Math.max(r, g, b) - Math.min(r, g, b) < 16,
};
const T = { blue: 24, red: 30, green: 18, white: 185, light: 40, dark: 40, grey: 150 };

/** Returns a PNG buffer. `report`, if given, receives each patch and its work area (for QA overlays). */
export async function retouch(input, patches, report) {
  if (!patches?.length) return input;
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const pt of patches) {
    const r = paint(data, info.width, info.height, pt);
    report?.(pt, r);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}

function paint(px, W, H, pt) {
  const grow = pt.grow ?? 4, pad = grow + 4;
  // The work area: the patch and a margin round it (where the fill's boundary comes from).
  const ax = Math.max(0, pt.x - pad), ay = Math.max(0, pt.y - pad);
  const aw = Math.min(W, pt.x + pt.w + pad) - ax, ah = Math.min(H, pt.y + pt.h + pad) - ay;
  const n = aw * ah;
  const at = (i) => ((ay + ((i / aw) | 0)) * W + ax + (i % aw)) * 3;
  const inPatch = (i) => { const x = (i % aw) + ax, y = ((i / aw) | 0) + ay; return x >= pt.x && x < pt.x + pt.w && y >= pt.y && y < pt.y + pt.h; };
  const rgb = (i) => { const k = at(i); return [px[k], px[k + 1], px[k + 2]]; };

  // 1. the mark, keyed on its ink; what must be kept, if named
  const ls = [];
  for (let i = 0; i < n; i++) if (inPatch(i)) ls.push(lum(...rgb(i)));
  ls.sort((a, b) => a - b);
  const median = ls[ls.length >> 1];
  const is = (tests, i) => { const [r, g, b] = rgb(i); return tests.some((k) => TEST[k](r, g, b, pt.t?.[k] ?? T[k], median)); };
  const inks = [].concat(pt.ink), keep = [].concat(pt.keep ?? []);
  const mark = new Uint8Array(n), foreign = new Uint8Array(n);
  let marked = 0;
  for (let i = 0; i < n; i++) {
    if (inPatch(i) && is(inks, i)) { mark[i] = 1; marked++; }
    else if (keep.length && is(keep, i)) foreign[i] = 1;
  }

  // 2. the hole: the mark grown by a disc of `grow`, never into what is kept or the work area's outer ring
  const hole = new Uint8Array(n);
  const disc = [];
  for (let dy = -grow; dy <= grow; dy++) for (let dx = -grow; dx <= grow; dx++) if (dx * dx + dy * dy <= grow * grow + grow) disc.push([dx, dy]);
  for (let i = 0; i < n; i++) if (mark[i]) {
    const x = i % aw, y = (i / aw) | 0;
    for (const [dx, dy] of disc) {
      const xx = x + dx, yy = y + dy, j = yy * aw + xx;
      if (xx > 0 && yy > 0 && xx < aw - 1 && yy < ah - 1 && (mark[j] || !foreign[j])) hole[j] = 1;
    }
  }
  for (let i = 0; i < n; i++) if (hole[i]) foreign[i] = 0;

  // 3. the harmonic fill: an onion-peel first guess from the ground inward, then successive over-relaxation to
  //    Laplace's equation. Kept neighbours are a mirror (no flux), so the wall never leaks into the shirt.
  const v = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) { const k = at(i); v[0][i] = px[k]; v[1][i] = px[k + 1]; v[2][i] = px[k + 2]; }
  const known = new Uint8Array(n);
  const cells = [];
  for (let i = 0; i < n; i++) { if (hole[i]) cells.push(i); else if (!foreign[i]) known[i] = 1; }
  const N4 = [-1, 1, -aw, aw], N8 = [-1, 1, -aw, aw, -aw - 1, -aw + 1, aw - 1, aw + 1];
  for (;;) {
    const layer = [];
    for (const i of cells) if (!known[i] && N4.some((d) => known[i + d])) layer.push(i);
    if (!layer.length) break;
    for (const i of layer) for (let c = 0; c < 3; c++) {
      let s = 0, m = 0;
      for (const d of N8) if (known[i + d]) { s += v[c][i + d]; m++; }
      v[c][i] = s / m;
    }
    for (const i of layer) known[i] = 1;
  }
  const open = cells.map((i) => N4.map((d) => i + d).filter((j) => !foreign[j]));
  const w = 1.85;
  for (let it = 0; it < 4000; it++) {
    let delta = 0;
    for (let q = 0; q < cells.length; q++) {
      const i = cells[q], nb = open[q];
      if (!nb.length) continue;
      for (let c = 0; c < 3; c++) {
        const a = v[c];
        let s = 0;
        for (const j of nb) s += a[j];
        const nv = (1 - w) * a[i] + (w * s) / nb.length;
        delta = Math.max(delta, Math.abs(nv - a[i]));
        a[i] = nv;
      }
    }
    if (delta < 0.02) break;
  }

  // 4. grain: measured on the ground round the hole (median absolute deviation of a high-pass, so edges and nearby
  //    lettering do not count), given back to the fill as luminance noise
  const res = [];
  const L = (i) => lum(v[0][i], v[1][i], v[2][i]);
  for (const i of cells) {
    const x = i % aw, y = (i / aw) | 0;
    for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
      const xx = x + dx, yy = y + dy, j = yy * aw + xx;
      if (xx > 1 && yy > 1 && xx < aw - 2 && yy < ah - 2 && !hole[j] && !foreign[j] && N8.every((d) => !hole[j + d] && !foreign[j + d])) {
        let s = 0;
        for (const d of N8) s += L(j + d);
        res.push(Math.abs(L(j) - s / 8));
      }
    }
  }
  res.sort((a, b) => a - b);
  // (capped: round small print the ground is mostly edges, and the estimate would turn to sand)
  const sigma = res.length ? Math.min(pt.grain ?? 4, 1.4826 * res[res.length >> 1]) : 0;
  let seed = (pt.x * 73856093) ^ (pt.y * 19349663);
  const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  for (const i of cells) {
    const g = gauss() * sigma, k = at(i);
    for (let c = 0; c < 3; c++) px[k + c] = Math.max(0, Math.min(255, Math.round(v[c][i] + g)));
  }
  return { ax, ay, aw, ah, hole, marked, filled: cells.length, sigma };
}
