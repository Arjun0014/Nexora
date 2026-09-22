/**
 * 01 Hospitality — the pour. A brass dallah held by nobody, tipped over a porcelain finjan; the gahwa is caught
 * in the air as a stream of light, beading as it lands, a crown of drops rising from the cup. Cardamom hangs
 * where it was thrown.
 */
import {
  Color, DynamicDrawUsage, Group, InstancedMesh, LatheGeometry, Mesh, Object3D, SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import { curve, mix, profile, rng, sstep, tube } from '../kit';
import type { Ctx, Particle, Tableau } from './types';

const GOLD_LIGHT = new Color(1.0, 0.66, 0.26).multiplyScalar(5.2);
const TIP = { x: -0.74, y: 0.86 }; // spout tip, upright, in the dallah's frame
const PIVOT = new Vector3(0.44, 0.3, 0);
const PIVOT_Y = 0.45;
const CUP = new Vector3(-0.66, -0.8, 0.06);
const KEY_TILT = 0.92;
const G = 1.35; // gravity in tableau units per (action-second)²
const TS = 2.2; // action-seconds per unit of a

function dallah(ctx: Ctx) {
  const g = new Group();
  const body = new LatheGeometry(profile([
    [0, 0], [0.27, 0], [0.3, 0.012], [0.305, 0.034], [0.288, 0.05],
    [0.31, 0.09], [0.338, 0.17], [0.334, 0.25], [0.3, 0.32], [0.232, 0.39], [0.165, 0.44],
    [0.132, 0.47], [0.136, 0.5],
    [0.172, 0.54], [0.232, 0.59], [0.27, 0.625], [0.282, 0.645],
    [0.266, 0.656], [0.24, 0.666],
    [0.2, 0.7], [0.15, 0.76], [0.102, 0.83], [0.066, 0.884],
    [0.05, 0.9], [0.062, 0.92], [0.05, 0.946],
    [0.034, 0.97], [0.018, 1.0], [0.006, 1.04], [0, 1.062],
  ], 150), 72);
  g.add(new Mesh(body, ctx.mats.brass));
  // Engraved bands: thin rings of darker brass where a smith would put them.
  for (const [y, r, t] of [[0.034, 0.302, 0.006], [0.47, 0.134, 0.007], [0.645, 0.28, 0.008], [0.76, 0.152, 0.005], [0.92, 0.061, 0.005]] as const) {
    const ring = new Mesh(new TorusGeometry(r, t, 8, 64), ctx.mats.brassDark);
    ring.rotation.x = Math.PI / 2; ring.position.y = y;
    g.add(ring);
  }
  // The beak: rises from the lower body in a long crescent.
  const spoutPts = curve([
    new Vector3(-0.2, 0.2, 0), new Vector3(-0.34, 0.26, 0), new Vector3(-0.47, 0.38, 0),
    new Vector3(-0.57, 0.55, 0), new Vector3(-0.64, 0.71, 0), new Vector3(TIP.x, TIP.y, 0),
  ], 60);
  const spout = tube(spoutPts, (s) => mix(0.078, 0.026, Math.pow(s, 0.8)), 20, false);
  g.add(new Mesh(spout, ctx.mats.brass));
  const lip = new Mesh(new TorusGeometry(0.027, 0.007, 8, 24), ctx.mats.brassDark);
  lip.position.set(TIP.x, TIP.y, 0);
  lip.lookAt(new Vector3(TIP.x - 0.6, TIP.y + 0.75, 0));
  g.add(lip);
  // The handle, on the far side.
  const handlePts = curve([
    new Vector3(0.24, 0.6, 0), new Vector3(0.4, 0.6, 0), new Vector3(0.49, 0.47, 0),
    new Vector3(0.46, 0.3, 0), new Vector3(0.37, 0.19, 0), new Vector3(0.3, 0.15, 0),
  ], 50);
  g.add(new Mesh(tube(handlePts, () => 0.021, 12), ctx.mats.brass));
  g.position.y = -PIVOT_Y;
  return g;
}

function finjan(ctx: Ctx) {
  const g = new Group();
  const cup = new LatheGeometry(profile([
    [0, 0.004], [0.08, 0.004], [0.094, 0.012], [0.1, 0.024], [0.126, 0.064], [0.153, 0.11], [0.168, 0.14], [0.171, 0.146],
    [0.165, 0.149], [0.158, 0.142], [0.143, 0.112], [0.114, 0.066], [0.06, 0.04], [0, 0.036],
  ], 80), 64);
  g.add(new Mesh(cup, ctx.mats.porcelain));
  const rim = new Mesh(new TorusGeometry(0.1685, 0.0032, 8, 72), ctx.mats.gold);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.147;
  g.add(rim);
  const band = new Mesh(new TorusGeometry(0.139, 0.0022, 6, 72), ctx.mats.gold);
  band.rotation.x = Math.PI / 2; band.position.y = 0.1;
  g.add(band);
  // The gahwa in the cup, lit from within.
  const surf = new Mesh(new SphereGeometry(1, 40, 8, 0, Math.PI * 2, 0, 0.35), ctx.mats.liquid(GOLD_LIGHT.clone().multiplyScalar(0.55)));
  surf.scale.set(0.148, 0.02, 0.148);
  surf.position.y = 0.098;
  g.add(surf);
  return { g, surf };
}

export function hospitality(ctx: Ctx): Tableau {
  const group = new Group();
  const r = rng(11);

  // ── the dallah on its pivot ───────────────────────────────────────────────
  const pivot = new Group();
  pivot.position.copy(PIVOT);
  pivot.add(dallah(ctx));
  pivot.rotation.set(0.08, -0.35, KEY_TILT);
  group.add(pivot);

  const cupG = finjan(ctx);
  cupG.g.position.copy(CUP);
  cupG.g.rotation.set(0.12, 0, -0.05);
  group.add(cupG.g);

  // ── the stream, computed for the key tilt ─────────────────────────────────
  pivot.updateMatrixWorld(true);
  group.updateMatrixWorld(true);
  const tipW = new Vector3(TIP.x, TIP.y - PIVOT_Y, 0).applyMatrix4(pivot.matrix);
  const dirW = new Vector3(-0.6, 0.78, 0).normalize().applyEuler(pivot.rotation).normalize();
  const target = CUP.clone().add(new Vector3(0, 0.1, 0));
  // Solve launch speed and flight time so the parabola lands in the cup.
  const dx = target.x - tipW.x;
  const vs = dx / (dirW.x || -1e-3);
  const fall = tipW.y + dirW.y * vs - target.y;
  const tFlight = Math.sqrt(Math.max(0.01, (2 * fall) / G));
  const v0 = vs / tFlight;
  const vel = dirW.clone().multiplyScalar(v0);
  const zDrift = (target.z - tipW.z) / tFlight;
  const at = (t: number) => new Vector3(tipW.x + vel.x * t, tipW.y + vel.y * t - 0.5 * G * t * t, tipW.z + zDrift * t);
  const N = 90;
  const pts = Array.from({ length: N }, (_, i) => at((i / (N - 1)) * tFlight * 0.9));
  const streamGeo = tube(pts, (s) => mix(0.017, 0.0105, s) * (1 + 0.14 * Math.sin(s * 37)) * (1 - 0.35 * sstep(0.7, 1, s)), 14, false);
  const liquidMat = ctx.mats.liquid(GOLD_LIGHT);
  const stream = new Mesh(streamGeo, liquidMat);
  group.add(stream);
  const rows = streamGeo.userData.rows as number, per = streamGeo.userData.bodyIndexPerRow as number;

  // ── drops: beads where the stream breaks up, the crown from the cup, strays ──
  const drops: Particle[] = [];
  for (let i = 0; i < 9; i++) { // beads, spaced down the last stretch of the fall
    const t = tFlight * (0.9 + i * 0.012);
    const p = at(t);
    drops.push({ p, v: new Vector3(0, -0.15, 0), t0: 0.34 + i * 0.012, life: 9, size: 0.0115 - i * 0.0005 });
  }
  const crownAt = target.clone().add(new Vector3(0, -0.012, 0));
  for (let i = 0; i < 16; i++) { // the crown: a ring of drops thrown up and out
    const ang = (i / 16) * Math.PI * 2 + r() * 0.3;
    const sp = 0.28 + r() * 0.22;
    drops.push({ p: crownAt.clone().add(new Vector3(Math.cos(ang) * 0.06, 0, Math.sin(ang) * 0.06)), v: new Vector3(Math.cos(ang) * sp * 0.55, 0.55 + r() * 0.5, Math.sin(ang) * sp * 0.55), t0: 0.43 + r() * 0.03, life: 0.9, size: 0.006 + r() * 0.007 });
  }
  for (let i = 0; i < 7; i++) { // strays that left the stream on the way down
    const t = tFlight * (0.25 + r() * 0.6);
    drops.push({ p: at(t).add(new Vector3((r() - 0.5) * 0.05, (r() - 0.5) * 0.04, (r() - 0.5) * 0.08)), v: new Vector3((r() - 0.5) * 0.2, -0.1, (r() - 0.5) * 0.2), t0: 0.3 + r() * 0.12, life: 2, size: 0.004 + r() * 0.005 });
  }
  const dropMesh = new InstancedMesh(new SphereGeometry(1, 14, 10), liquidMat, drops.length);
  dropMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  dropMesh.frustumCulled = false;
  group.add(dropMesh);

  // ── cardamom, thrown with the pour ────────────────────────────────────────
  const pods: { m: Mesh; p: Vector3; v: Vector3; rot: Vector3 }[] = [];
  const podGeo = new SphereGeometry(1, 16, 10);
  for (let i = 0; i < 6; i++) {
    const m = new Mesh(podGeo, ctx.mats.pod);
    m.scale.set(0.034, 0.019, 0.019);
    const p = new Vector3(-1.05 + r() * 0.75, -0.55 + r() * 0.9, -0.25 + r() * 0.55);
    pods.push({ m, p, v: new Vector3((r() - 0.5) * 0.3, 0.1 + r() * 0.2, (r() - 0.5) * 0.2), rot: new Vector3(r() * 6, r() * 6, r() * 6) });
    group.add(m);
  }

  // ── key light: warm, from the camera side and above ──────────────────────
  const key = { color: new Color('#ffc58a'), pos: new Vector3(-1.6, 3.0, 3.6), target: new Vector3(-0.1, -0.1, 0), intensity: 26, angle: 0.5, penumbra: 0.75 };

  const tmp = new Object3D();
  let lensAmt = 0;
  let lensP: Vector3 | null = null;

  const pose = (a: number) => {
    // The dallah tips in, holds, and rights itself as the pour ends.
    const tilt = mix(0.3, KEY_TILT, sstep(0.0, 0.28, a)) - (KEY_TILT - 0.32) * sstep(0.78, 1, a);
    pivot.rotation.z = tilt;
    // The stream arrives from the spout (0.2 → 0.46), then falls away after the dallah lifts.
    const front = sstep(0.2, 0.46, a);
    const visibleRows = Math.max(0, Math.round(rows * front));
    streamGeo.setDrawRange(0, visibleRows * per);
    stream.visible = visibleRows > 0 && a < 0.93;
    const drop = sstep(0.8, 0.95, a);
    stream.position.y = -0.9 * drop * drop;
    stream.scale.setScalar(1);
    // The cup fills.
    cupG.surf.position.y = 0.07 + 0.035 * sstep(0.44, 0.9, a);

    let k = 0;
    for (const d of drops) {
      const t = (a - d.t0) * TS + (lensP && d.p.distanceTo(lensP) < 0.45 ? lensAmt * (1 - d.p.distanceTo(lensP) / 0.45) : 0);
      if (t < 0 || t > d.life) { tmp.scale.setScalar(0); }
      else {
        tmp.position.set(d.p.x + d.v.x * t, d.p.y + d.v.y * t - 0.5 * G * t * t, d.p.z + d.v.z * t);
        const s = d.size * (1 - sstep(d.life * 0.7, d.life, t));
        const stretch = 1 + Math.min(1.4, Math.abs(d.v.y - G * t) * 1.3);
        tmp.scale.set(s, s * stretch, s);
      }
      tmp.updateMatrix();
      dropMesh.setMatrixAt(k++, tmp.matrix);
    }
    dropMesh.instanceMatrix.needsUpdate = true;

    for (const pd of pods) {
      const t = (a - 0.25) * TS * 0.6;
      pd.m.position.set(pd.p.x + pd.v.x * t, pd.p.y + pd.v.y * t - 0.08 * t * t, pd.p.z + pd.v.z * t);
      pd.m.rotation.set(pd.rot.x + t * 0.8, pd.rot.y + t * 0.5, pd.rot.z + t * 0.3);
    }
  };

  const lens = (p: Vector3 | null, amount: number) => { lensP = p ? group.worldToLocal(p.clone()) : null; lensAmt = amount; };

  pose(0.5);
  return { id: 'hospitality', group, key, pose, lens };
}
