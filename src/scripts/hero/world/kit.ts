/**
 * Small geometry and texture kit for the hero world. Everything the scene shows is built here from code:
 * no model files, no image files, so the whole world arrives with the script and can never be half-loaded.
 */
import {
  BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, LinearMipmapLinearFilter,
  SRGBColorSpace, Vector2, Vector3, type Texture,
} from 'three';

/** Deterministic random numbers: the frozen moments are the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOut = (t: number) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/** ERA's `inOut` (0.75, 0, 0.25, 1), the site's camera ease, as a cheap closed form that is close enough. */
export const camEase = (t: number) => { t = clamp01(t); const a = t * t * t * (t * (6 * t - 15) + 10); return a; };

/** Rotation-minimising frames along a polyline (parallel transport), so tubes and ribbons never twist on their own. */
export function frames(points: Vector3[]) {
  const n = points.length;
  const T: Vector3[] = [], N: Vector3[] = [], B: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    T.push(new Vector3().subVectors(b, a).normalize());
  }
  // A first normal perpendicular to the first tangent.
  const t0 = T[0];
  const ref = Math.abs(t0.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  N.push(new Vector3().crossVectors(t0, ref).normalize());
  B.push(new Vector3().crossVectors(t0, N[0]).normalize());
  for (let i = 1; i < n; i++) {
    const axis = new Vector3().crossVectors(T[i - 1], T[i]);
    const nn = N[i - 1].clone();
    const len = axis.length();
    if (len > 1e-6) {
      axis.divideScalar(len);
      const ang = Math.acos(Math.min(1, Math.max(-1, T[i - 1].dot(T[i]))));
      nn.applyAxisAngle(axis, ang);
    }
    N.push(nn.normalize());
    B.push(new Vector3().crossVectors(T[i], nn).normalize());
  }
  return { T, N, B };
}

/**
 * A tube whose radius varies along its length. Vertices are laid out ring after ring, so a draw range can
 * reveal the tube progressively from its start (a pour arriving, an ink line being written).
 */
export function tube(points: Vector3[], radius: (s: number, i: number) => number, radial = 12, caps = true) {
  const n = points.length;
  const { N, B } = frames(points);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const along: number[] = [];
  // cumulative length for uv.y / along
  const L: number[] = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = L[n - 1] || 1;
  for (let i = 0; i < n; i++) {
    const s = L[i] / total;
    const r = radius(s, i);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a), si = Math.sin(a);
      const nx = N[i].x * c + B[i].x * si, ny = N[i].y * c + B[i].y * si, nz = N[i].z * c + B[i].z * si;
      pos.push(points[i].x + nx * r, points[i].y + ny * r, points[i].z + nz * r);
      nor.push(nx, ny, nz);
      uv.push(j / radial, s);
      along.push(s);
    }
  }
  const idx: number[] = [];
  const row = radial + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j, b = (i + 1) * row + j, c = (i + 1) * row + j + 1, d = i * row + j + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  if (caps) {
    // Round-ish end caps: a fan to a point just beyond each end.
    for (const end of [0, n - 1]) {
      const dir = end === 0 ? points[0].clone().sub(points[1]).normalize() : points[n - 1].clone().sub(points[n - 2]).normalize();
      const r = radius(end === 0 ? 0 : 1, end);
      const tip = points[end].clone().addScaledVector(dir, r * 0.9);
      const ti = pos.length / 3;
      pos.push(tip.x, tip.y, tip.z); nor.push(dir.x, dir.y, dir.z); uv.push(0.5, end === 0 ? 0 : 1); along.push(end === 0 ? 0 : 1);
      for (let j = 0; j < radial; j++) {
        const a = end * row + j, b = end * row + j + 1;
        if (end === 0) idx.push(ti, b, a); else idx.push(ti, a, b);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute('along', new BufferAttribute(new Float32Array(along), 1));
  g.setIndex(idx);
  // Indices for the body only (6 per quad): lets callers reveal the tube to a fraction of its length.
  g.userData.bodyIndexPerRow = radial * 6;
  g.userData.rows = n - 1;
  return g;
}

/** Sample a smooth curve through control points. */
export function curve(ctrl: Vector3[], samples: number, closed = false, tension = 0.5) {
  const c = new CatmullRomCurve3(ctrl, closed, 'catmullrom', tension);
  return c.getSpacedPoints(samples);
}

/** A lathe profile helper that smooths a coarse outline (x = radius, y = height) with Catmull-Rom. */
export function profile(pts: [number, number][], samples = 96) {
  const c = new CatmullRomCurve3(pts.map(([r, y]) => new Vector3(r, y, 0)), false, 'centripetal');
  return c.getSpacedPoints(samples).map((p) => new Vector2(Math.max(0, p.x), p.y));
}

/**
 * A flat ribbon along a polyline: two vertices per sample, twisted by `twist(s)` about the tangent.
 * Width may vary. Normals are the ribbon's face normal (the material is double-sided).
 */
export function ribbon(points: Vector3[], width: (s: number) => number, twist: (s: number) => number = () => 0, up?: Vector3) {
  const n = points.length;
  const { T, N, B } = frames(points);
  if (up) {
    // Re-seed the frame so the ribbon's flat side starts facing `up`.
    for (let i = 0; i < n; i++) {
      const b = new Vector3().crossVectors(T[i], up).normalize();
      if (b.lengthSq() > 0.5) { B[i].copy(b); N[i].crossVectors(B[i], T[i]).normalize(); }
    }
  }
  const pos = new Float32Array(n * 2 * 3), nor = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2);
  let L = 0;
  for (let i = 0; i < n; i++) {
    if (i) L += points[i].distanceTo(points[i - 1]);
  }
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i) acc += points[i].distanceTo(points[i - 1]);
    const s = acc / (L || 1);
    const tw = twist(s);
    const side = N[i].clone().multiplyScalar(Math.cos(tw)).addScaledVector(B[i], Math.sin(tw));
    const face = new Vector3().crossVectors(T[i], side).normalize();
    const w = width(s) / 2;
    for (let k = 0; k < 2; k++) {
      const sgn = k ? 1 : -1;
      const o = (i * 2 + k) * 3;
      pos[o] = points[i].x + side.x * w * sgn; pos[o + 1] = points[i].y + side.y * w * sgn; pos[o + 2] = points[i].z + side.z * w * sgn;
      nor[o] = face.x; nor[o + 1] = face.y; nor[o + 2] = face.z;
      uv[(i * 2 + k) * 2] = k; uv[(i * 2 + k) * 2 + 1] = acc;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.userData.length = L;
  return g;
}

/** Rewrite a ribbon's vertices in place (same sample count), for ribbons that move with time. */
export function updateRibbon(g: BufferGeometry, points: Vector3[], width: (s: number) => number, twist: (s: number) => number = () => 0) {
  const fresh = ribbon(points, width, twist);
  (g.attributes.position as BufferAttribute).copyArray(fresh.attributes.position.array as Float32Array);
  (g.attributes.normal as BufferAttribute).copyArray(fresh.attributes.normal.array as Float32Array);
  (g.attributes.uv as BufferAttribute).copyArray(fresh.attributes.uv.array as Float32Array);
  g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.uv.needsUpdate = true;
  g.computeBoundingSphere();
  fresh.dispose();
}

/** A canvas drawn once into a texture. */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true): Texture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export const col = (hex: string, k = 1) => new Color(hex).multiplyScalar(k);

/** The brand's display face, set the way the site sets it (condensed light capitals, italic accent). */
export const DISPLAY = '"Noto Serif Display Variable", "Times New Roman", serif';
export const LABEL = '"Archivo Variable", system-ui, sans-serif';

export async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`300 extra-condensed 100px ${DISPLAY}`),
      document.fonts.load(`italic 300 condensed 100px ${DISPLAY}`),
      document.fonts.load(`500 expanded 40px ${LABEL}`),
      document.fonts.load(`400 40px ${LABEL}`),
    ]);
  } catch { /* the fallback serif still renders */ }
}
