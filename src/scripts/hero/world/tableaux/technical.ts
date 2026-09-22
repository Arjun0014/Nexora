/**
 * 04 Specialist & Technical — the connection. Two cable ends reaching for each other, not yet touching, a burst of
 * sparks frozen between them; a spanner and a few bolts turning slowly in the cold light of a plant room.
 */
import {
  AdditiveBlending, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, InstancedBufferAttribute,
  InstancedBufferGeometry, Mesh, Path, PlaneGeometry, PointLight, Shape, ShaderMaterial, Vector3,
} from 'three';
import { curve, mix, rng, sstep, tube } from '../kit';
import type { Ctx, Tableau } from './types';

const TS = 2.2;
const GAP = new Vector3(0.02, 0.08, 0.06);

function plug(ctx: Ctx, male: boolean) {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(0.052, 0.058, 0.2, 40), ctx.mats.brass);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const nut = new Mesh(new CylinderGeometry(0.07, 0.07, 0.05, 6), ctx.mats.steel);
  nut.rotation.z = Math.PI / 2; nut.position.x = male ? -0.06 : 0.06;
  g.add(nut);
  const boot = new Mesh(new CylinderGeometry(0.045, 0.038, 0.12, 32), ctx.mats.rubber);
  boot.rotation.z = Math.PI / 2; boot.position.x = male ? -0.15 : 0.15;
  g.add(boot);
  if (male) {
    for (const [y, z] of [[0.018, 0], [-0.012, 0.016], [-0.012, -0.016]]) {
      const pin = new Mesh(new CylinderGeometry(0.0065, 0.0065, 0.07, 12), ctx.mats.copper);
      pin.rotation.z = Math.PI / 2; pin.position.set(0.13, y, z);
      g.add(pin);
    }
  } else {
    const face = new Mesh(new CylinderGeometry(0.047, 0.047, 0.004, 40), ctx.mats.rubber);
    face.rotation.z = Math.PI / 2; face.position.x = -0.101;
    g.add(face);
  }
  return g;
}

function spanner(ctx: Ctx) {
  const g = new Group();
  const ext = { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 3, curveSegments: 32 };
  const handle = new Shape();
  handle.moveTo(-0.34, -0.026); handle.lineTo(0.34, -0.03); handle.lineTo(0.34, 0.03); handle.lineTo(-0.34, 0.026); handle.closePath();
  g.add(new Mesh(new ExtrudeGeometry(handle, ext), ctx.mats.chrome));
  const ring = new Shape(); ring.absarc(0, 0, 0.078, 0, Math.PI * 2, false);
  const hole = new Path();
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2, rr = i % 2 ? 0.042 : 0.049; if (i === 0) hole.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else hole.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ring.holes.push(hole);
  const ringM = new Mesh(new ExtrudeGeometry(ring, ext), ctx.mats.chrome); ringM.position.x = -0.38;
  g.add(ringM);
  // The open end: a C of steel around a square mouth.
  const jawShape = new Shape();
  const a1 = Math.atan2(0.032, Math.sqrt(0.084 * 0.084 - 0.032 * 0.032));
  jawShape.moveTo(0.43 + 0.084 * Math.cos(a1), 0.032);
  jawShape.absarc(0.43, 0, 0.084, a1, Math.PI * 2 - a1, false);
  jawShape.lineTo(0.44, -0.032); jawShape.lineTo(0.44, 0.032); jawShape.closePath();
  g.add(new Mesh(new ExtrudeGeometry(jawShape, ext), ctx.mats.chrome));
  return g;
}

function bolt(ctx: Ctx) {
  const g = new Group();
  const head = new Mesh(new CylinderGeometry(0.034, 0.034, 0.022, 6), ctx.mats.steel);
  const shaft = new Mesh(new CylinderGeometry(0.018, 0.018, 0.1, 16), ctx.mats.steel);
  shaft.position.y = -0.06;
  g.add(head, shaft);
  return g;
}

export function technical(ctx: Ctx): Tableau {
  const group = new Group();
  const r = rng(44);

  // ── the two ends, reaching ───────────────────────────────────────────────
  const left = plug(ctx, true);
  left.position.set(GAP.x - 0.2, GAP.y, GAP.z);
  left.rotation.set(0, 0.12, -0.06);
  const right = plug(ctx, false);
  right.position.set(GAP.x + 0.2, GAP.y + 0.01, GAP.z);
  right.rotation.set(0, -0.1, 0.05);
  group.add(left, right);

  const cableL = curve([
    new Vector3(-2.2, -0.9, -0.5), new Vector3(-1.5, -0.25, -0.2), new Vector3(-1.05, 0.34, 0.1), new Vector3(-0.72, 0.28, 0.14),
    new Vector3(-0.46, 0.1, 0.08), new Vector3(GAP.x - 0.35, GAP.y, GAP.z),
  ], 120);
  const cableR = curve([
    new Vector3(GAP.x + 0.35, GAP.y + 0.01, GAP.z), new Vector3(0.62, 0.02, 0.02), new Vector3(0.9, -0.34, -0.1),
    new Vector3(1.06, -0.8, -0.05), new Vector3(1.5, -1.1, -0.3), new Vector3(2.3, -1.2, -0.6),
  ], 120);
  const cableGeoL = tube(cableL, () => 0.032, 16);
  const cableGeoR = tube(cableR, () => 0.032, 16);
  const cL = new Mesh(cableGeoL, ctx.mats.rubber), cR = new Mesh(cableGeoR, ctx.mats.rubber);
  group.add(cL, cR);

  // ── sparks: GPU streaks, each one a pure function of time since the burst ─
  const N = ctx.quality === 'low' ? 160 : 320;
  const base = new PlaneGeometry(1, 1, 1, 1);
  base.translate(0.5, 0.5, 0);
  const geo = new InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
  const p0 = new Float32Array(N * 3), v0 = new Float32Array(N * 3), data = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const dir = new Vector3(r() - 0.5, (r() - 0.35) * 1.2, r() - 0.5).normalize();
    const sp = 0.6 + Math.pow(r(), 1.6) * 2.4;
    p0.set([GAP.x + (r() - 0.5) * 0.03, GAP.y + (r() - 0.5) * 0.03, GAP.z + (r() - 0.5) * 0.03], i * 3);
    v0.set([dir.x * sp, dir.y * sp, dir.z * sp], i * 3);
    data.set([0.38 + r() * 0.1, 0.35 + r() * 0.9, 0.6 + r() * 1.2, r()], i * 4);
  }
  geo.setAttribute('iP0', new InstancedBufferAttribute(p0, 3));
  geo.setAttribute('iV', new InstancedBufferAttribute(v0, 3));
  geo.setAttribute('iData', new InstancedBufferAttribute(data, 4));
  geo.instanceCount = N;
  const sparkMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uA: { value: 0.5 }, uTS: { value: TS }, uG: { value: 1.6 }, uLensP: { value: new Vector3(99, 99, 99) }, uLensAmt: { value: 0 }, uHot: { value: new Color(1.0, 0.82, 0.55).multiplyScalar(7) }, uCool: { value: new Color(1.0, 0.36, 0.08).multiplyScalar(4.5) } },
    vertexShader: /* glsl */`
      attribute vec3 iP0; attribute vec3 iV; attribute vec4 iData;
      uniform float uA; uniform float uTS; uniform float uG; uniform vec3 uLensP; uniform float uLensAmt;
      varying vec2 vUv; varying float vHeat;
      void main() {
        float t = (uA - iData.x) * uTS + uLensAmt * max(0.0, 1.0 - distance(iP0, uLensP) / 0.7);
        vUv = uv;
        if (t <= 0.0 || t > iData.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vHeat = 0.0; return; }
        float drag = 1.8;
        float k = (1.0 - exp(-t * drag)) / drag;
        vec3 p = iP0 + iV * k - vec3(0.0, 0.5 * uG * t * t, 0.0);
        vec3 vel = iV * exp(-t * drag) - vec3(0.0, uG * t, 0.0);
        vec4 hv = modelViewMatrix * vec4(p, 1.0);
        vec3 vv = (modelViewMatrix * vec4(vel, 0.0)).xyz;
        float speed = length(vv);
        vec3 dir = speed > 1e-4 ? vv / speed : vec3(0.0, 1.0, 0.0);
        float len = min(0.32, speed * 0.075) + 0.012;
        vec3 side = normalize(cross(dir, normalize(-hv.xyz))) * 0.0042 * iData.z;
        vec3 pos = hv.xyz - dir * len * (1.0 - uv.x) + side * (uv.y - 0.5) * 2.0;
        gl_Position = projectionMatrix * vec4(pos, 1.0);
        vHeat = (1.0 - smoothstep(iData.y * 0.35, iData.y, t)) * (0.6 + 0.4 * iData.w);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uHot; uniform vec3 uCool; varying vec2 vUv; varying float vHeat;
      void main() {
        float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float head = smoothstep(0.0, 1.0, vUv.x);
        vec3 c = mix(uCool, uHot, head * vHeat);
        gl_FragColor = vec4(c * pow(across, 1.5) * head * vHeat, 1.0);
      }`,
  });
  const sparks = new Mesh(geo, sparkMat);
  sparks.frustumCulled = false;
  group.add(sparks);

  // the glow at the gap, and the light it throws
  // (not a child of the group: the world hides moments it is not looking at, and a light that comes and goes changes
  // the light count, which makes three.js recompile every shader. The world keeps it in the ring instead.)
  const flash = new PointLight(new Color('#ff8a3d'), 0, 3.2, 1.6);
  flash.position.copy(GAP);

  // ── the spanner and bolts, turning slowly ─────────────────────────────────
  const sp = spanner(ctx);
  sp.position.set(0.52, 0.66, -0.2);
  group.add(sp);
  const bolts = Array.from({ length: 4 }, (_, i) => {
    const b = bolt(ctx);
    b.userData.base = new Vector3(-0.85 + r() * 1.9, -0.5 + r() * 1.2, -0.3 + r() * 0.5);
    b.userData.rot = new Vector3(r() * 6, r() * 6, r() * 6);
    b.userData.i = i;
    group.add(b);
    return b;
  });

  const key = { color: new Color('#bcd4ff'), pos: new Vector3(-1.5, 3.2, 3.3), target: new Vector3(0, 0, 0), intensity: 26, angle: 0.5, penumbra: 0.8 };

  const pose = (a: number) => {
    sparkMat.uniforms.uA.value = a;
    const burst = sstep(0.36, 0.42, a) * (1 - sstep(0.55, 0.95, a));
    flash.intensity = 5.5 * burst;
    // the ends close in as the moment builds, and part after it
    const reach = sstep(0.0, 0.4, a) * (1 - 0.6 * sstep(0.6, 1, a));
    left.position.x = GAP.x - mix(0.36, 0.2, reach);
    right.position.x = GAP.x + mix(0.34, 0.2, reach);
    const t = (a - 0.5) * TS;
    sp.rotation.set(0.5 + t * 0.2, -0.4 + t * 0.35, 0.62 + t * 0.5);
    sp.position.y = 0.66 + t * 0.05;
    for (const b of bolts) {
      const bb = b.userData.base as Vector3, rot = b.userData.rot as Vector3;
      b.position.set(bb.x + t * 0.04 * (b.userData.i - 1.5), bb.y + t * 0.03, bb.z);
      b.rotation.set(rot.x + t * 0.9, rot.y + t * 0.6, rot.z + t * 0.4);
    }
  };
  const lens = (p: Vector3 | null, amount: number) => {
    if (p) sparkMat.uniforms.uLensP.value.copy(group.worldToLocal(p.clone())); else sparkMat.uniforms.uLensP.value.set(99, 99, 99);
    sparkMat.uniforms.uLensAmt.value = amount;
  };

  pose(0.5);
  return { id: 'technical', group, key, pose, lens, lights: [flash] };
}
