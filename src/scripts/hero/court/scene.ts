/**
 * The court: one world under a latticed dome. A round limestone court with a pool at its heart; five doorways in the
 * ring wall, each opening onto a world of work; above, two brass shells of eight-point stars that the sun comes
 * through as a rain of light. Metres, y up, the court's centre at the origin; world k's doorway on the axis at angle
 * k·72° measured from +z toward +x.
 */
import * as THREE from 'three/webgpu';
import {
  Fn, abs, max, min, vec2, vec3, vec4, float, fract, positionWorld, cos, sin, texture, uv, color, normalMap, reflector, mix,
  smoothstep, uniform, length, floor, hash, instanceIndex, instancedArray, cameraPosition, normalize, dot, clamp, pow, atan,
  step, time,
} from 'three/tsl';

export const COURT = {
  R: 18, wallH: 9, // the ring wall
  domeBase: 9, rise: 4.8, // the dome springs from the wall head
  pool: 6.2,
  door: { span: 4.2, spring: 5.4, apex: 7.3, reveal: 1.5, frame: 1.3 },
  room: 1.6, // how far behind the doorway's face the world's image hangs
};
export const DOORS = 5;
export const doorAngle = (k: number) => (k * 2 * Math.PI) / DOORS;
/** A point on the court at angle a (from +z toward +x), radius r, height y. */
export const at = (a: number, r: number, y: number) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);

export type Tex = { col: THREE.Texture; nrm: THREE.Texture; arm: THREE.Texture };

/** The lattice: eight-point stars on a square grid (negative = a hole), with small squares at the cell corners. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const starLattice = Fn(([p, cell, rot, hole]: any[]) => {
  const c = cos(rot), s = sin(rot);
  const q = vec2(p.x.mul(c).sub(p.y.mul(s)), p.x.mul(s).add(p.y.mul(c))).div(cell);
  const f = fract(q).sub(0.5);
  const a = max(abs(f.x), abs(f.y)).sub(hole);
  const b = max(abs(f.x.add(f.y)), abs(f.x.sub(f.y))).mul(0.7071).sub(hole);
  const g = fract(q.add(0.5)).sub(0.5);
  const corner = max(abs(g.x), abs(g.y)).sub(hole.mul(0.3));
  return min(min(a, b), corner);
});

/** The two shells (outer, inner): height at radius r, and their patterns. */
const Q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
export const SHELLS = [
  { lift: 0.8, riseK: 1.0, cell: Number(Q.get('c1') ?? 0.78), rot: 0.0, hole: 0.25 },
  { lift: 0.15, riseK: 0.94, cell: Number(Q.get('c2') ?? 1.22), rot: Math.PI / 8, hole: 0.28 },
];

function pbr(t: Tex, size: number, tint: THREE.ColorRepresentation, o: { normal?: number; side?: THREE.Side; rough?: number } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ side: o.side ?? THREE.FrontSide });
  const u = uv().mul(1 / size);
  m.colorNode = texture(t.col, u).rgb.mul(color(new THREE.Color(tint)));
  m.normalNode = normalMap(texture(t.nrm, u), vec2(o.normal ?? 0.8));
  const arm = texture(t.arm, u);
  m.roughnessNode = arm.g.mul(o.rough ?? 1).clamp(0.05, 1);
  m.aoNode = arm.r;
  return m;
}

/** World-space UVs in metres, by the dominant axis of each vertex normal. */
export function worldUV(g: THREE.BufferGeometry, scale = 1) {
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const a = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
    a[i * 2] = u * scale; a[i * 2 + 1] = v * scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(a, 2));
  return g;
}

/** Cylindrical UVs (arc length, height) in metres. */
function ringUV(g: THREE.BufferGeometry) {
  const p = g.getAttribute('position');
  const a = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); a[i * 2] = Math.atan2(x, z) * Math.hypot(x, z); a[i * 2 + 1] = p.getY(i); }
  g.setAttribute('uv', new THREE.BufferAttribute(a, 2));
  return g;
}

/** A two-centred arch from the left springing to the right. */
export function archCurve(span: number, spring: number, apex: number, segs = 28): THREE.Vector2[] {
  const w = span, d = apex - spring;
  const c = (d * d - (w * w) / 4) / w;
  const r = c + w / 2;
  const a0 = Math.PI, a1 = Math.atan2(d, -c);
  const left: THREE.Vector2[] = [];
  for (let i = 0; i <= segs; i++) { const a = a0 + (a1 - a0) * (i / segs); left.push(new THREE.Vector2(c + r * Math.cos(a), spring + r * Math.sin(a))); }
  const right = left.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y));
  return [...left, ...right];
}

/** A wall panel with an arched opening from the floor, extruded toward -z (court face at z = 0). */
function portalGeometry(o: { width: number; height: number; span: number; spring: number; apex: number; depth: number; bevel?: number }) {
  const { width: W, height: H, span, spring, apex, depth } = o;
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(-span / 2, 0);
  for (const p of archCurve(span, spring, apex)) s.lineTo(p.x, p.y);
  s.lineTo(span / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
  const b = o.bevel ?? 0.025;
  const g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -depth + b);
  return g;
}

/** The inside of an arch run back by `depth` (jambs and soffit), facing the axis. */
function revealGeometry(span: number, spring: number, apex: number, depth: number) {
  const curve = [new THREE.Vector2(-span / 2, 0), ...archCurve(span, spring, apex, 28), new THREE.Vector2(span / 2, 0)];
  const pos: number[] = [], nrm: number[] = [], uvs: number[] = [], idx: number[] = [];
  let len = 0;
  curve.forEach((p, i) => {
    if (i) len += p.distanceTo(curve[i - 1]);
    const a = curve[Math.max(0, i - 1)], b = curve[Math.min(curve.length - 1, i + 1)];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    for (const z of [0, -depth]) { pos.push(p.x, p.y, z); nrm.push(t.y, -t.x, 0); uvs.push(len, -z); }
  });
  for (let i = 0; i < curve.length - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

function place<T extends THREE.Object3D>(o: T, a: number, r: number, y = 0): T {
  o.position.copy(at(a, r, y));
  o.rotation.y = a + Math.PI; // local +z faces the court's centre
  return o;
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, cast = true, receive = true) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = cast; o.receiveShadow = receive;
  return o;
}

export interface Room {
  k: number;
  group: THREE.Group;
  /** uniforms of the world's picture */
  lean: ReturnType<typeof uniform>;
  glow: ReturnType<typeof uniform>;
}

export interface Court {
  root: THREE.Group;
  rooms: Room[];
  /** the dust: a uniform for how much time is running (0 = frozen), one for the sun direction */
  dust: { mesh: THREE.Object3D; run: ReturnType<typeof uniform> };
  sunDir: ReturnType<typeof uniform>;
  water: THREE.Mesh;
}

export interface Pictures { photos: THREE.Texture[]; depths: THREE.Texture[]; aspect: number }

export function buildCourt(tex: Record<string, Tex>, pics: Pictures, scene: THREE.Scene, q: { reflect: number; dust: number }): Court {
  const C = COURT, D = C.door;
  const root = new THREE.Group();
  const sunDir = uniform(new THREE.Vector3(0.3, 0.9, 0.3).normalize());

  // ── materials ───────────────────────────────────────────────────────────────────────────
  // one material per surface (each distinct material is a shader to compile while the intro is up)
  const stone = pbr(tex.stone, 2.23, 0xf8efe3, { normal: 0.7, side: THREE.DoubleSide });
  const plaster = pbr(tex.plaster, 2.0, 0xfff5e8, { normal: 0.58, side: THREE.DoubleSide });
  // the floor: limestone slabs laid in rings round the pool, joints cut in
  const floorM = pbr(tex.smooth, 3.0, 0xf5ecdf, { normal: 0.4 });
  {
    const p = positionWorld.xz;
    const r = length(p);
    const ring = r.div(1.25);
    const ringI = floor(ring);
    const arc = atan(p.x, p.y).mul(r).div(1.45).add(hash(ringI).mul(7));
    const jr = smoothstep(0.0, 0.035, abs(fract(ring).sub(0.5)).mul(-1).add(0.5));
    const ja = smoothstep(0.0, 0.03, abs(fract(arc).sub(0.5)).mul(-1).add(0.5));
    const joint = min(jr, ja);
    const slab = hash(ringI.mul(131).add(floor(arc))).mul(0.06).add(0.97);
    floorM.colorNode = floorM.colorNode!.mul(slab).mul(mix(float(0.72), float(1), joint));
  }
  // the ring wall: plaster over coursed stone (a course line every 0.62 m)
  const wallM = plaster;
  {
    const y = positionWorld.y;
    const course = smoothstep(0.0, 0.018, abs(fract(y.div(0.62)).sub(0.5)).mul(-1).add(0.5));
    wallM.colorNode = wallM.colorNode!.mul(mix(float(0.86), float(1), course));
  }

  // ── floor and pool ──────────────────────────────────────────────────────────────────────
  const fs = new THREE.Shape(); fs.absarc(0, 0, C.R + 3, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, C.pool, 0, Math.PI * 2, true); fs.holes.push(hole);
  const floorG = new THREE.ShapeGeometry(fs, 120); floorG.rotateX(-Math.PI / 2);
  root.add(mesh(floorG, floorM, false, true));
  const bed = new THREE.CircleGeometry(C.pool, 96); bed.rotateX(-Math.PI / 2); bed.translate(0, -0.55, 0); worldUV(bed);
  root.add(mesh(bed, stone, false, true));
  const side = new THREE.CylinderGeometry(C.pool, C.pool, 0.55, 120, 1, true); side.translate(0, -0.275, 0); ringUV(side);
  root.add(mesh(side, stone, false, true));
  const lip = new THREE.LatheGeometry([[0, 0], [0.34, 0], [0.34, 0.08], [0.3, 0.12], [0.04, 0.12], [0, 0.08]].map(([d, y]) => new THREE.Vector2(C.pool - 0.02 + d, y)), 160);
  worldUV(lip);
  root.add(mesh(lip, stone));
  // water: a dark mirror for the dome
  const refl = reflector({ resolutionScale: q.reflect });
  refl.target.rotateX(-Math.PI / 2);
  refl.target.position.y = -0.1;
  scene.add(refl.target);
  const wp = positionWorld.xz;
  const rip = sin(wp.x.mul(0.8).add(time.mul(0.4))).mul(cos(wp.y.mul(0.6).sub(time.mul(0.3)))).mul(0.0025);
  refl.uvNode = refl.uvNode!.add(vec2(rip, rip.mul(0.7)));
  const waterM = new THREE.MeshBasicNodeMaterial();
  const view = normalize(cameraPosition.sub(positionWorld));
  const fres = pow(float(1).sub(clamp(view.y, 0, 1)), 3).mul(0.6).add(0.4);
  waterM.colorNode = mix(color(new THREE.Color(0x2a3b3d)), refl.rgb, fres);
  const water = new THREE.Mesh(new THREE.CircleGeometry(C.pool, 120).rotateX(-Math.PI / 2).translate(0, -0.1, 0), waterM);
  root.add(water);

  // ── the ring wall and the five doorways ─────────────────────────────────────────────────
  const halfW = D.span / 2 + D.frame;
  const half = Math.asin(halfW / C.R);
  for (let k = 0; k < DOORS; k++) {
    const a0 = doorAngle(k) + half, a1 = doorAngle(k + 1) - half;
    const w = new THREE.CylinderGeometry(C.R, C.R, C.wallH, 72, 1, true, a0, a1 - a0);
    w.translate(0, C.wallH / 2, 0); ringUV(w);
    root.add(mesh(w, wallM));
    // plinth moulding along the foot of the wall
    const pl = new THREE.CylinderGeometry(C.R - 0.1, C.R - 0.1, 0.42, 72, 1, true, a0, a1 - a0); pl.translate(0, 0.21, 0); ringUV(pl);
    root.add(mesh(pl, stone, false, true));
  }
  // cornice ring at the wall head, where the dome springs
  const cornice = new THREE.LatheGeometry([[0, -0.9], [0.06, -0.86], [0.12, -0.6], [0.32, -0.4], [0.42, -0.1], [0.42, 0.25], [0.0, 0.25]].map(([d, y]) => new THREE.Vector2(C.R - d, C.wallH + y)), 200);
  ringUV(cornice);
  root.add(mesh(cornice, stone));

  const rooms: Room[] = [];
  const roomM = new THREE.MeshStandardNodeMaterial({ color: 0x8a7560, roughness: 0.9, side: THREE.BackSide });
  for (let k = 0; k < DOORS; k++) {
    const g = place(new THREE.Group(), doorAngle(k), C.R - 0.35);
    root.add(g);
    const face = portalGeometry({ width: halfW * 2, height: C.wallH - 0.9, span: D.span, spring: D.spring, apex: D.apex, depth: D.reveal, bevel: 0.03 });
    worldUV(face);
    g.add(mesh(face, stone));
    // a stepped inner order round the opening
    const order = portalGeometry({ width: D.span + 0.7, height: D.apex + 0.45, span: D.span, spring: D.spring, apex: D.apex, depth: 0.12, bevel: 0.02 });
    order.translate(0, 0, 0.12); worldUV(order);
    g.add(mesh(order, stone));
    const rv = revealGeometry(D.span, D.spring, D.apex, D.reveal); worldUV(rv);
    g.add(mesh(rv, plaster));
    const step = new THREE.BoxGeometry(D.span + 0.5, 0.14, 0.7); step.translate(0, 0.07, -D.reveal / 2); worldUV(step);
    g.add(mesh(step, stone));
    // the world: its picture hung in the room beyond, with depth, lit from within
    const lean = uniform(new THREE.Vector2(0, 0));
    const glow = uniform(1);
    const m = new THREE.MeshBasicNodeMaterial();
    const photo = pics.photos[k], dep = pics.depths[k];
    const u0 = uv();
    const d = texture(dep, u0).r;
    const puv = u0.add(lean.mul(d.sub(0.45)));
    const img = texture(photo, puv).rgb;
    // the room's own light: a touch brighter at the heart, falling off to its edges
    const vign = smoothstep(0.95, 0.35, length(u0.sub(vec2(0.5, 0.55)).mul(vec2(1.2, 1.0))));
    m.colorNode = img.mul(mix(float(0.78), float(1.06), vign)).mul(glow);
    // sized to fill the doorway seen from its stop (about ten metres back), with room for the pointer's lean
    const H = 10.6, W = H * pics.aspect;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), m);
    pic.position.set(0, 3.7, -D.reveal - C.room);
    g.add(pic);
    // the room's sides and floor, dim and warm, so the picture sits in a space
    const box = new THREE.BoxGeometry(W * 1.02, H, C.room + 0.1);
    box.translate(0, 3.7, -D.reveal - C.room / 2);
    const roomMesh = mesh(box, roomM, false, true);
    g.add(roomMesh);
    rooms.push({ k, group: g, lean, glow });
  }

  // ── the dome: two brass lattice shells on a ring beam ───────────────────────────────────
  const capGeo = (rise: number, y0: number) => {
    const Rc = C.R + 0.6, rs = (Rc * Rc + rise * rise) / (2 * rise);
    const g = new THREE.SphereGeometry(rs, 180, 48, 0, Math.PI * 2, 0, Math.asin(Rc / rs));
    g.translate(0, y0 + rise - rs, 0);
    return g;
  };
  for (const [i, sh] of SHELLS.entries()) {
    const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, metalness: 0.55, roughness: 0.48 });
    m.colorNode = color(new THREE.Color(i ? 0xc8ae84 : 0xb99a6c));
    const dd = starLattice(positionWorld.xz, float(sh.cell), float(sh.rot), float(sh.hole));
    m.maskNode = dd.greaterThan(0);
    m.maskShadowNode = dd.greaterThan(0);
    root.add(mesh(capGeo(C.rise * sh.riseK, C.domeBase + sh.lift), m));
  }
  const beam = new THREE.CylinderGeometry(C.R + 0.7, C.R + 0.7, 1.0, 180, 1, true); beam.translate(0, C.domeBase + 0.5, 0); ringUV(beam);
  root.add(mesh(beam, stone));
  const soffit = new THREE.RingGeometry(C.R - 0.45, C.R + 0.7, 180, 1); soffit.rotateX(Math.PI / 2); soffit.translate(0, C.domeBase, 0); worldUV(soffit);
  root.add(mesh(soffit, stone));

  // ── dust in the air: motes that shine only where a beam of sun comes through both shells ─
  const N = q.dust;
  const seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (C.R - 1.5);
    seed[i * 4] = Math.sin(a) * r; seed[i * 4 + 1] = 0.4 + Math.random() * (C.domeBase - 0.8); seed[i * 4 + 2] = Math.cos(a) * r; seed[i * 4 + 3] = Math.random();
  }
  const home = instancedArray(seed, 'vec4');
  const run = uniform(1);
  const dustT = uniform(0);
  const dm = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const h = home.toAttribute();
  const drift = vec3(sin(dustT.mul(0.13).add(h.w.mul(40))).mul(0.35), sin(dustT.mul(0.07).add(h.w.mul(17))).mul(0.25), cos(dustT.mul(0.11).add(h.w.mul(29))).mul(0.35));
  const P = h.xyz.add(drift);
  dm.positionNode = P;
  // follow the ray from the mote to the sun up to each shell; lit only if both are open there
  const litThrough = (lift: number, riseK: number, cell: number, rot: number, holeR: number) => {
    const y = float(C.domeBase + lift + C.rise * riseK * 0.6);
    const t = y.sub(P.y).div(max(sunDir.y, 0.05));
    const hit = P.xz.add(sunDir.xz.mul(t));
    return step(0, starLattice(hit, float(cell), float(rot), float(holeR)).negate());
  };
  const lit = litThrough(SHELLS[0].lift, SHELLS[0].riseK, SHELLS[0].cell, SHELLS[0].rot, SHELLS[0].hole)
    .mul(litThrough(SHELLS[1].lift, SHELLS[1].riseK, SHELLS[1].cell, SHELLS[1].rot, SHELLS[1].hole));
  const twinkle = sin(dustT.mul(1.7).add(h.w.mul(90))).mul(0.3).add(0.7);
  const disc = smoothstep(0.5, 0.0, length(uv().sub(0.5)));
  dm.colorNode = vec4(color(new THREE.Color(0xfff1d6)).mul(lit).mul(twinkle).mul(disc).mul(0.9), 1);
  dm.scaleNode = float(0.035).add(h.w.mul(0.03));
  const dust = new THREE.Sprite(dm);
  dust.count = N;
  dust.frustumCulled = false;
  // (not yet drawn: in the scene pass it pollutes the GI targets, and an MRT override breaks the reflector's pass)
  void instanceIndex; void dot;
  (dust as unknown as { userData: { t: typeof dustT } }).userData.t = dustT;

  return { root, rooms, dust: { mesh: dust, run }, sunDir, water };
}
