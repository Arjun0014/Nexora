/**
 * 03 Facilities & Support — the shake. A white linen sheet held at two corners by hands we cannot see, caught at
 * the top of the flick: the lower half curling toward us, backlit by the lantern so the weave glows. Dust hangs
 * in a shaft of early light.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, MeshPhysicalMaterial, PlaneGeometry,
  Points, RepeatWrapping, ShaderMaterial, Vector3, type Texture,
} from 'three';
import { canvasTexture, mix, rng, sstep } from '../kit';
import type { Ctx, Tableau } from './types';

const SEG_U = 88, SEG_V = 72;
const W = 2.0, L = 1.9;

function weaveNormal(): Texture {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const r = rng(5);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // a plain weave: alternating over/under threads, with a little irregularity
      const tx = Math.sin((x / w) * Math.PI * 2 * 48) * ((Math.floor(y / 2.67) % 2) ? 1 : -1);
      const ty = Math.sin((y / h) * Math.PI * 2 * 48) * ((Math.floor(x / 2.67) % 2) ? 1 : -1);
      const n = (r() - 0.5) * 0.25;
      const i = (y * w + x) * 4;
      img.data[i] = 128 + (tx * 0.35 + n) * 90;
      img.data[i + 1] = 128 + (ty * 0.35 + n) * 90;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, false);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

export function facilities(ctx: Ctx): Tableau {
  const group = new Group();
  const geo = new PlaneGeometry(W, L, SEG_U, SEG_V);
  const posAttr = geo.attributes.position as BufferAttribute;
  const hubView = { value: new Vector3() };
  const mat = new MeshPhysicalMaterial({
    color: new Color('#d9d5cc'), roughness: 0.92, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new Color('#ffffff'),
    side: DoubleSide, envMap: ctx.mats.porcelain.envMap, envMapIntensity: 0.32, normalMap: weaveNormal(),
  });
  mat.normalScale.set(0.35, 0.35);
  // Translucency: light from the lantern behind the sheet comes through the weave.
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHubView = hubView;
    sh.uniforms.uTrans = { value: new Color(1.0, 0.72, 0.46).multiplyScalar(0.95) };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uHubView;\nuniform vec3 uTrans;')
      .replace('#include <lights_fragment_end>', /* glsl */`#include <lights_fragment_end>
        vec3 toHub = normalize(uHubView + vViewPosition);
        float through = max(0.0, dot(-normal, toHub));
        totalEmissiveRadiance += uTrans * (0.03 + pow(through, 2.0) * 0.42);`);
  };
  const sheet = new Mesh(geo, mat);
  sheet.position.set(0.1, -0.42, 0.1);
  group.add(sheet);
  group.userData.hubView = hubView;
  group.userData.pointScale = (s: number) => { dustMat.uniforms.uScale.value = s; };

  // The sheet's motion is SIMULATED once, here, and recorded: a Verlet cloth held at two corners, shaken out by
  // hands we cannot see, with gravity and air pushing on its surface (the air is what makes a sheet billow).
  // The film then scrubs the recording, so the freeze is a real cloth caught at its most open.
  const sim = { ...ctx.sheet! };
  // The frozen frame was chosen by eye from a contact sheet of the whole recording (.qa/pw/sim-keys.mjs): the sheet
  // opening in the air, one corner still curling under. ?simkey=N overrides it for that comparison.
  const qaKey = Number(new URLSearchParams(location.search).get('simkey'));
  sim.key = Math.min(sim.frames - 2, Number.isFinite(qaKey) && qaKey > 0 ? qaKey : 34);
  group.userData.simFrames = sim.frames;
  const shape = (a: number) => {
    // a ∈ [0, 0.5] → the shake up to the key frame; a ∈ [0.5, 1] → a little further into the float (the camera has
    // gone through the wall before the sheet has settled flat)
    const t = a <= 0.5 ? (a / 0.5) * sim.key : sim.key + ((a - 0.5) / 0.5) * Math.min(12, sim.frames - 1 - sim.key);
    const f0 = Math.floor(t), f1 = Math.min(sim.frames - 1, f0 + 1), k = t - f0;
    const A = sim.data.subarray(f0 * sim.n * 3, (f0 + 1) * sim.n * 3), B = sim.data.subarray(f1 * sim.n * 3, (f1 + 1) * sim.n * 3);
    // upsample the simulated grid onto the render grid (bilinear), so the folds shade smoothly
    for (let j = 0; j <= SEG_V; j++) {
      const gy = (j / SEG_V) * (sim.ny - 1), y0 = Math.floor(gy), y1 = Math.min(sim.ny - 1, y0 + 1), fy = gy - y0;
      for (let i = 0; i <= SEG_U; i++) {
        const gx = (i / SEG_U) * (sim.nx - 1), x0 = Math.floor(gx), x1 = Math.min(sim.nx - 1, x0 + 1), fx = gx - x0;
        const out = j * (SEG_U + 1) + i;
        for (let c = 0; c < 3; c++) {
          const s = (arr: Float32Array, yy: number, xx: number) => arr[(yy * sim.nx + xx) * 3 + c];
          const va = mix(mix(s(A, y0, x0), s(A, y0, x1), fx), mix(s(A, y1, x0), s(A, y1, x1), fx), fy);
          const vb = mix(mix(s(B, y0, x0), s(B, y0, x1), fx), mix(s(B, y1, x0), s(B, y1, x1), fx), fy);
          (posAttr.array as Float32Array)[out * 3 + c] = mix(va, vb, k);
        }
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  };

  // ── dust in a shaft of light ──────────────────────────────────────────────
  const r = rng(33);
  const n = ctx.quality === 'low' ? 220 : 480;
  const dpos = new Float32Array(n * 3), dseed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // concentrated in a slanted band crossing the sheet
    const t = r(), off = (r() - 0.5) * 0.55;
    dpos[i * 3] = -1.4 + t * 2.8 + off * 0.4;
    dpos[i * 3 + 1] = 1.1 - t * 1.9 + off;
    dpos[i * 3 + 2] = -0.4 + r() * 1.0;
    dseed[i] = r();
  }
  const dg = new BufferGeometry();
  dg.setAttribute('position', new BufferAttribute(dpos, 3));
  dg.setAttribute('seed', new BufferAttribute(dseed, 1));
  const dustMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uA: { value: 0.5 }, uScale: { value: 10 }, uLensP: { value: new Vector3(99, 99, 99) }, uLensAmt: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float seed; uniform float uA; uniform float uScale; uniform vec3 uLensP; uniform float uLensAmt; varying float vA;
      void main() {
        vec3 p = position;
        float t = (uA - 0.5) * 2.0 + uLensAmt * max(0.0, 1.0 - distance(position, uLensP) / 0.5);
        p += vec3(sin(seed * 40.0 + t * 1.3) * 0.06, t * (0.04 + seed * 0.06), cos(seed * 23.0 + t) * 0.06);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(14.0, (0.35 + seed * 0.9) * uScale / -mv.z);
        vA = 0.35 + 0.65 * fract(seed * 7.13);
      }`,
    fragmentShader: /* glsl */`varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * smoothstep(0.5, 0.0, d) * vA * 0.9, 1.0); }`,
  });
  const dust = new Points(dg, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  // the shaft itself: a long soft band of light
  const shaftMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uColor: { value: new Color(0.95, 0.9, 0.78) }, uStrength: { value: 0.14 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
      void main() { float across = sin(vUv.x * 3.14159); float along = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        gl_FragColor = vec4(uColor * pow(across, 2.2) * along * uStrength, 1.0); }`,
  });
  const shaft = new Mesh(new PlaneGeometry(0.9, 4.2), shaftMat);
  shaft.position.set(-0.1, 0.1, -0.05);
  shaft.rotation.set(0, 0, 0.98);
  group.add(shaft);

  const key = { color: new Color('#e8fbf7'), pos: new Vector3(-1.4, 3.1, 3.4), target: new Vector3(0, 0, 0), intensity: 9, angle: 0.5, penumbra: 0.8 };

  let lastA = -1;
  const pose = (a: number) => {
    if (Math.abs(a - lastA) > 1e-4) { shape(a); lastA = a; }
    dustMat.uniforms.uA.value = a;
    shaftMat.uniforms.uStrength.value = mix(0.03, 0.065, sstep(0.2, 0.5, a));
  };
  const lens = (p: Vector3 | null, amount: number) => {
    if (p) dustMat.uniforms.uLensP.value.copy(group.worldToLocal(p.clone())); else dustMat.uniforms.uLensP.value.set(99, 99, 99);
    dustMat.uniforms.uLensAmt.value = amount;
  };

  pose(0.5);
  return { id: 'facilities', group, key, pose, lens };
}
