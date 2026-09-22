/**
 * The linen's motion: a Verlet cloth run once and recorded frame by frame. Pure maths, no three.js, so it can run
 * in a worker while the intro is up (see sheet.worker.ts) and never blocks the page.
 *
 * Units are metres and seconds: a 2 m sheet held at two corners, shaken out by hands we cannot see, with real
 * gravity and air pushing on its surface along the normal (the air is what makes a sheet billow).
 */
export interface SheetSim { nx: number; ny: number; n: number; frames: number; key: number; data: Float32Array }

const sstep = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function simulateSheet(): SheetSim {
  const nx = 34, ny = 30, n = nx * ny;
  const W0 = 2.0, H0 = 1.75;
  const dx = W0 / (nx - 1), dy = H0 / (ny - 1);
  const pos = new Float32Array(n * 3), prev = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  const idx = (x: number, y: number) => y * nx + x;
  // the hands: up and toward us, a snap back, then they open and settle (one leads the other a little)
  const hand = (t: number, side: -1 | 1): [number, number, number] => {
    const u = Math.max(0, t - (side > 0 ? 0.035 : 0));
    const up = 0.62 * Math.exp(-Math.pow((u - 0.2) / 0.1, 2)) - 0.14 * Math.exp(-Math.pow((u - 0.42) / 0.12, 2));
    const fwd = 0.5 * Math.exp(-Math.pow((u - 0.22) / 0.11, 2));
    const open = 0.1 * sstep(0.1, 0.6, u);
    return [side * (W0 / 2 - 0.12 + open), 0.72 + up, -0.55 + fwd];
  };
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = idx(x, y) * 3;
    const px = -W0 / 2 + x * dx, py = 0.72 - y * dy * 0.98, pz = -0.55 + Math.sin((x / (nx - 1)) * Math.PI) * 0.04;
    pos[i] = prev[i] = px; pos[i + 1] = prev[i + 1] = py; pos[i + 2] = prev[i + 2] = pz;
  }
  const springs: number[] = [];
  const add = (a: number, b: number) => {
    const ax = a * 3, bx = b * 3;
    springs.push(a, b, Math.hypot(pos[bx] - pos[ax], pos[bx + 1] - pos[ax + 1], pos[bx + 2] - pos[ax + 2]));
  };
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    if (x + 1 < nx) add(idx(x, y), idx(x + 1, y));
    if (y + 1 < ny) add(idx(x, y), idx(x, y + 1));
    if (x + 1 < nx && y + 1 < ny) { add(idx(x, y), idx(x + 1, y + 1)); add(idx(x + 1, y), idx(x, y + 1)); }
    if (x + 2 < nx) add(idx(x, y), idx(x + 2, y));
    if (y + 2 < ny) add(idx(x, y), idx(x, y + 2));
  }
  // each hand holds a corner and a little of the edge beside it
  const pinned = new Map<number, [-1 | 1, number]>();
  for (const [x, side] of [[0, -1], [1, -1], [nx - 1, 1], [nx - 2, 1]] as const) pinned.set(idx(x, 0), [side, x === 0 || x === nx - 1 ? 0 : side * -dx]);
  const isPinned = new Uint8Array(n);
  for (const i of pinned.keys()) isPinned[i] = 1;

  const DT = 1 / 240, T = 1.9, REC = 1 / 40;
  const frames: Float32Array[] = [];
  const g = -9.8, air = 2.6, damp = 0.992;
  let nextRec = 0;
  for (let step = 0, t = 0; t <= T; step++, t = step * DT) {
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const xl = Math.max(0, x - 1), xr = Math.min(nx - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(ny - 1, y + 1);
      const a = idx(xr, y) * 3, b = idx(xl, y) * 3, c = idx(x, yd) * 3, d = idx(x, yu) * 3;
      const ux = pos[a] - pos[b], uy = pos[a + 1] - pos[b + 1], uz = pos[a + 2] - pos[b + 2];
      const vx = pos[c] - pos[d], vy = pos[c + 1] - pos[d + 1], vz = pos[c + 2] - pos[d + 2];
      let cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      const l = Math.hypot(cx, cy, cz) || 1; cx /= l; cy /= l; cz /= l;
      const o = idx(x, y) * 3; nrm[o] = cx; nrm[o + 1] = cy; nrm[o + 2] = cz;
    }
    for (let i = 0; i < n; i++) {
      if (isPinned[i]) continue;
      const o = i * 3;
      const vx = (pos[o] - prev[o]) * damp, vy = (pos[o + 1] - prev[o + 1]) * damp, vz = (pos[o + 2] - prev[o + 2]) * damp;
      // air resists motion through the surface, not along it
      const vn = (vx * nrm[o] + vy * nrm[o + 1] + vz * nrm[o + 2]) / DT;
      prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
      pos[o] += vx - air * vn * nrm[o] * DT * DT;
      pos[o + 1] += vy + (g - air * vn * nrm[o + 1]) * DT * DT;
      pos[o + 2] += vz - air * vn * nrm[o + 2] * DT * DT;
    }
    for (const [i, [side, off]] of pinned) {
      const h = hand(t, side), o = i * 3;
      prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
      pos[o] = h[0] + off; pos[o + 1] = h[1]; pos[o + 2] = h[2];
    }
    for (let it = 0; it < 4; it++) {
      for (let s = 0; s < springs.length; s += 3) {
        const a = springs[s], b = springs[s + 1], rest = springs[s + 2];
        const pa = isPinned[a], pb = isPinned[b];
        if (pa && pb) continue;
        const ao = a * 3, bo = b * 3;
        const ex = pos[bo] - pos[ao], ey = pos[bo + 1] - pos[ao + 1], ez = pos[bo + 2] - pos[ao + 2];
        const len = Math.hypot(ex, ey, ez) || 1e-6;
        const diff = (len - rest) / len;
        const ka = pa ? 0 : pb ? 1 : 0.5, kb = pb ? 0 : pa ? 1 : 0.5;
        pos[ao] += ex * diff * ka; pos[ao + 1] += ey * diff * ka; pos[ao + 2] += ez * diff * ka;
        pos[bo] -= ex * diff * kb; pos[bo + 1] -= ey * diff * kb; pos[bo + 2] -= ez * diff * kb;
      }
    }
    if (t >= nextRec - 1e-9) { frames.push(pos.slice()); nextRec += REC; }
  }
  const data = new Float32Array(frames.length * n * 3);
  frames.forEach((f, i) => data.set(f, i * n * 3));
  // The frozen frame was chosen by eye from a contact sheet of the whole recording (.qa/pw/sim-keys.mjs): the sheet
  // opening in the air, one corner still curling under. Re-pick it if anything above changes.
  return { nx, ny, n, frames: frames.length, key: Math.min(frames.length - 2, 34), data };
}
