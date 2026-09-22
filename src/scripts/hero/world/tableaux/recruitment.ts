/**
 * 05 Recruitment & Workforce — the yes. Papers lifted into the air around an offer being signed: the pen held by
 * no one, its line of ink still being written, drops flicked from the nib and hanging where they flew.
 */
import {
  Color, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, LatheGeometry, Mesh, MeshStandardMaterial, Object3D,
  PlaneGeometry, SphereGeometry, TorusGeometry, Vector3, type Texture,
} from 'three';
import { canvasTexture, DISPLAY, LABEL, profile, rng, sstep, tube } from '../kit';
import type { Ctx, Particle, Tableau } from './types';

const PW = 0.42, PH = 0.594;
const TS = 2.2;
const INK = new Color(0.32, 0.86, 1.3).multiplyScalar(3.2);

type Kind = 'offer' | 'profile' | 'schedule' | 'onboarding';

function pageTexture(kind: Kind): Texture {
  return canvasTexture(640, 906, (ctx, W, H) => {
    ctx.fillStyle = '#f6f3ec'; ctx.fillRect(0, 0, W, H);
    const r = rng(kind.length * 17);
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(80,70,50,${r() * 0.035})`; ctx.fillRect(r() * W, r() * H, 1.5, 1.5); }
    const m = W * 0.1;
    ctx.fillStyle = '#1c1b2e';
    ctx.font = `600 expanded 20px ${LABEL}`; ctx.letterSpacing = '9px';
    ctx.fillText('NEXORA', m, H * 0.07);
    ctx.fillStyle = 'rgba(28,27,46,0.5)'; ctx.font = `500 expanded 14px ${LABEL}`; ctx.letterSpacing = '4px';
    ctx.textAlign = 'right'; ctx.fillText('DOHA · QATAR', W - m, H * 0.07); ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(28,27,46,0.18)'; ctx.fillRect(m, H * 0.09, W - 2 * m, 1.5);
    const lines = (y0: number, n: number, gap = 26, w0 = 1) => {
      for (let i = 0; i < n; i++) {
        const w = (W - 2 * m) * (i === n - 1 ? 0.55 : 0.82 + r() * 0.18) * w0;
        ctx.fillStyle = 'rgba(28,27,46,0.16)'; ctx.fillRect(m, y0 + i * gap, w, 6);
      }
    };
    ctx.fillStyle = '#1c1b2e'; ctx.letterSpacing = '0px';
    if (kind === 'offer') {
      ctx.font = `300 extra-condensed 132px ${DISPLAY}`; ctx.fillText('OFFER', m, H * 0.26);
      ctx.fillStyle = '#2b87b8'; ctx.font = `italic 300 condensed 56px ${DISPLAY}`; ctx.fillText('of employment', m + 4, H * 0.33);
      lines(H * 0.4, 6); lines(H * 0.58, 4);
      ctx.fillStyle = 'rgba(28,27,46,0.55)'; ctx.fillRect(m + W * 0.3, H * 0.84, W * 0.5, 2);
      ctx.font = `500 expanded 14px ${LABEL}`; ctx.letterSpacing = '4px';
      ctx.fillText('SIGNED', m, H * 0.845);
    } else if (kind === 'profile') {
      ctx.font = `300 extra-condensed 96px ${DISPLAY}`; ctx.fillText('CANDIDATE', m, H * 0.22);
      ctx.fillStyle = 'rgba(28,27,46,0.08)'; ctx.fillRect(m, H * 0.27, W * 0.3, W * 0.36);
      ctx.fillStyle = 'rgba(28,27,46,0.16)';
      ctx.beginPath(); ctx.arc(m + W * 0.15, H * 0.27 + W * 0.13, W * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(m + W * 0.05, H * 0.27 + W * 0.24, W * 0.2, W * 0.12);
      lines(H * 0.3, 5, 26, 0.55);
      lines(H * 0.56, 7);
    } else if (kind === 'schedule') {
      ctx.font = `300 extra-condensed 96px ${DISPLAY}`; ctx.fillText('INTERVIEWS', m, H * 0.22);
      ctx.strokeStyle = 'rgba(28,27,46,0.2)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(m, H * 0.3 + i * 52); ctx.lineTo(W - m, H * 0.3 + i * 52); ctx.stroke(); }
      for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(28,27,46,0.16)'; ctx.fillRect(m, H * 0.3 + i * 52 + 20, 60, 6); ctx.fillRect(m + 110, H * 0.3 + i * 52 + 20, 180 + r() * 150, 6); }
    } else {
      ctx.font = `300 extra-condensed 96px ${DISPLAY}`; ctx.fillText('ONBOARDING', m, H * 0.22);
      for (let i = 0; i < 8; i++) {
        const y = H * 0.3 + i * 58;
        ctx.strokeStyle = 'rgba(28,27,46,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(m, y, 22, 22);
        if (i < 5) { ctx.strokeStyle = '#2b87b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m + 4, y + 11); ctx.lineTo(m + 10, y + 18); ctx.lineTo(m + 19, y + 4); ctx.stroke(); }
        ctx.fillStyle = 'rgba(28,27,46,0.16)'; ctx.fillRect(m + 40, y + 8, 160 + r() * 200, 6);
      }
    }
  });
}

function paperMaterial(ctx: Ctx, map: Texture) {
  const m = new MeshStandardMaterial({ map, roughness: 0.82, side: DoubleSide, envMap: ctx.mats.porcelain.envMap, envMapIntensity: 0.28 });
  // The back of a sheet is blank paper, not the print seen through.
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', /* glsl */`
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        if (!gl_FrontFacing) sampledDiffuseColor = vec4(0.93, 0.915, 0.88, 1.0);
        diffuseColor *= sampledDiffuseColor;
      #endif`);
  };
  return m;
}

function pageGeometry(curl: number, twist: number) {
  const g = new PlaneGeometry(PW, PH, 12, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const u = x / (PW / 2), v = y / (PH / 2);
    p.setZ(i, curl * (u * u) * 0.05 + twist * u * v * 0.03 + 0.012 * Math.sin(v * 3 + u));
  }
  g.computeVertexNormals();
  return g;
}

function pen(ctx: Ctx) {
  const g = new Group();
  // body and cap, one lathe; the nib end at y = 0
  const body = new LatheGeometry(profile([
    [0, 0.06], [0.011, 0.066], [0.016, 0.08], [0.018, 0.1], [0.021, 0.14], [0.022, 0.3], [0.023, 0.33], [0.024, 0.36],
    [0.024, 0.52], [0.022, 0.56], [0.016, 0.585], [0, 0.595],
  ], 90), 40);
  g.add(new Mesh(body, ctx.mats.lacquer));
  for (const y of [0.33, 0.36]) {
    const band = new Mesh(new TorusGeometry(0.0238, 0.0022, 8, 40), ctx.mats.gold);
    band.rotation.x = Math.PI / 2; band.position.y = y;
    g.add(band);
  }
  const nib = new Mesh(new LatheGeometry(profile([[0, 0], [0.004, 0.012], [0.009, 0.035], [0.012, 0.062], [0, 0.064]], 30), 24), ctx.mats.gold);
  nib.scale.set(1, 1, 0.45);
  g.add(nib);
  const clip = new Mesh(tube([new Vector3(0.026, 0.54, 0), new Vector3(0.03, 0.47, 0), new Vector3(0.03, 0.4, 0), new Vector3(0.027, 0.37, 0)], () => 0.0035, 8), ctx.mats.gold);
  g.add(clip);
  return g;
}

export function recruitment(ctx: Ctx): Tableau {
  const group = new Group();
  const r = rng(55);

  // ── the papers ───────────────────────────────────────────────────────────
  const specs: { kind: Kind; p: Vector3; rot: Vector3; v: Vector3; spin: Vector3; curl: number; twist: number }[] = [
    { kind: 'offer', p: new Vector3(0.12, -0.08, 0.14), rot: new Vector3(-0.42, -0.2, 0.08), v: new Vector3(0, 0.02, 0), spin: new Vector3(0.02, 0.03, 0.01), curl: 0.6, twist: 0.3 },
    { kind: 'profile', p: new Vector3(-0.62, 0.36, -0.34), rot: new Vector3(0.2, 0.55, 0.3), v: new Vector3(-0.06, 0.08, 0), spin: new Vector3(0.3, 0.4, 0.2), curl: -1.2, twist: 1 },
    { kind: 'schedule', p: new Vector3(0.74, 0.46, -0.42), rot: new Vector3(-0.3, -0.7, -0.4), v: new Vector3(0.08, 0.06, 0), spin: new Vector3(-0.3, 0.2, 0.3), curl: 1.4, twist: -0.8 },
    { kind: 'onboarding', p: new Vector3(-0.5, -0.5, -0.12), rot: new Vector3(-0.8, 0.4, -0.5), v: new Vector3(-0.05, -0.04, 0.02), spin: new Vector3(0.4, -0.2, 0.3), curl: 0.9, twist: 0.6 },
    { kind: 'profile', p: new Vector3(0.82, -0.42, -0.26), rot: new Vector3(0.5, -0.9, 0.6), v: new Vector3(0.07, -0.03, 0), spin: new Vector3(-0.2, 0.3, -0.4), curl: -0.8, twist: 1.2 },
    { kind: 'schedule', p: new Vector3(-0.98, -0.02, -0.62), rot: new Vector3(0.1, 1.0, -0.2), v: new Vector3(-0.06, 0.02, -0.02), spin: new Vector3(0.2, 0.3, 0.1), curl: 1.1, twist: -1.2 },
  ];
  const texCache = new Map<Kind, Texture>();
  const pages = specs.map((s) => {
    if (!texCache.has(s.kind)) texCache.set(s.kind, pageTexture(s.kind));
    const m = new Mesh(pageGeometry(s.curl, s.twist), paperMaterial(ctx, texCache.get(s.kind)!));
    group.add(m);
    return { m, s };
  });
  const offer = pages[0].m;

  // ── the signature, written on the offer's surface ────────────────────────
  const sig: Vector3[] = [];
  const S = 160;
  for (let i = 0; i < S; i++) {
    const s = i / (S - 1);
    const x = -0.02 + 0.16 * s + 0.012 * Math.sin(s * 30);
    const y = -PH * 0.34 + 0.018 * Math.sin(s * Math.PI * 4.5) * (1 - 0.4 * s) + 0.014 * Math.cos(s * 26) + (s > 0.82 ? (s - 0.82) * 0.25 : 0);
    sig.push(new Vector3(x, y, 0.0045));
  }
  const sigGeo = tube(sig, (s) => 0.0021 + 0.0012 * Math.sin(s * 19) ** 2, 8, false);
  const inkMat = ctx.mats.liquid(INK);
  const sigMesh = new Mesh(sigGeo, inkMat);
  offer.add(sigMesh);
  const rows = sigGeo.userData.rows as number, per = sigGeo.userData.bodyIndexPerRow as number;

  // ── the pen, its nib riding the end of the line ──────────────────────────
  const penG = pen(ctx);
  const penPivot = new Group();
  penPivot.add(penG);
  offer.add(penPivot);

  // ── ink drops flicked from the nib ───────────────────────────────────────
  const drops: Particle[] = [];
  for (let i = 0; i < 11; i++) {
    const ang = -0.4 + r() * 1.3;
    const sp = 0.25 + r() * 0.35;
    drops.push({ p: new Vector3(0, 0, 0), v: new Vector3(Math.cos(ang) * sp, Math.sin(ang) * sp * 0.7 + 0.15, 0.2 + r() * 0.3), t0: 0.4 + r() * 0.06, life: 3, size: 0.004 + r() * 0.006 });
  }
  const dropMesh = new InstancedMesh(new SphereGeometry(1, 12, 8), inkMat, drops.length);
  dropMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  dropMesh.frustumCulled = false;
  offer.add(dropMesh);

  const key = { color: new Color('#d6eeff'), pos: new Vector3(-1.5, 3.2, 3.3), target: new Vector3(0, 0, 0), intensity: 26, angle: 0.5, penumbra: 0.8 };

  const tmp = new Object3D();
  let lensP: Vector3 | null = null, lensAmt = 0;
  const nibAt = new Vector3();

  const pose = (a: number) => {
    const t = (a - 0.5) * TS;
    for (const { m, s } of pages) {
      const lift = s.kind === 'offer' ? 0.35 : 1;
      m.position.set(s.p.x + s.v.x * t * lift, s.p.y + s.v.y * t * lift, s.p.z + s.v.z * t * lift);
      m.rotation.set(s.rot.x + s.spin.x * t * lift, s.rot.y + s.spin.y * t * lift, s.rot.z + s.spin.z * t * lift);
    }
    // the line is written from 0.18 to 0.5, finished by 0.7
    const w = sstep(0.18, 0.5, a) * 0.86 + 0.14 * sstep(0.5, 0.7, a);
    const vis = Math.max(1, Math.round(rows * w));
    sigGeo.setDrawRange(0, vis * per);
    sigMesh.visible = w > 0.005;
    const i = Math.min(sig.length - 1, Math.round(w * (sig.length - 1)));
    nibAt.copy(sig[i]);
    // the pen: nib on the line, body leaning back toward us; lifts away after the signature
    const away = sstep(0.72, 1, a);
    penPivot.position.set(nibAt.x, nibAt.y + away * 0.1, nibAt.z + 0.002 + away * 0.18);
    penPivot.rotation.set(0.95 + away * 0.3, 0, -0.55 + 0.05 * Math.sin(w * 20));
    let k = 0;
    const origin = sig[Math.round(0.62 * (sig.length - 1))];
    for (const d of drops) {
      let tt = (a - d.t0) * TS;
      if (lensP) { const dd = origin.distanceTo(lensP); if (dd < 0.5) tt += lensAmt * (1 - dd / 0.5); }
      if (tt < 0 || tt > d.life) tmp.scale.setScalar(0);
      else {
        tmp.position.set(origin.x + d.v.x * tt, origin.y + d.v.y * tt - 0.45 * tt * tt, origin.z + d.v.z * tt);
        const s = d.size * (1 - sstep(2, 3, tt));
        tmp.scale.set(s, s * 1.4, s);
      }
      tmp.updateMatrix();
      dropMesh.setMatrixAt(k++, tmp.matrix);
    }
    dropMesh.instanceMatrix.needsUpdate = true;
  };
  const lens = (p: Vector3 | null, amount: number) => { lensP = p ? offer.worldToLocal(p.clone()) : null; lensAmt = amount; };

  pose(0.5);
  return { id: 'recruitment', group, key, pose, lens };
}
