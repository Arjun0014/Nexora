/**
 * 02 Events & Promotions — the handover. A lanyard flung across the air between two hands we cannot see, the
 * badge turning at its end, a burst of foil confetti around it, and one stage beam from above.
 */
import {
  AdditiveBlending, Color, ConeGeometry, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, Group, InstancedMesh, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Shape, ShaderMaterial, TorusGeometry, Vector3, BoxGeometry,
} from 'three';
import { canvasTexture, curve, DISPLAY, LABEL, mix, rng, ribbon, sstep, updateRibbon } from '../kit';
import type { Ctx, Particle, Tableau } from './types';

const VIOLET = '#8a5cc4';
const TS = 2.2;

function roundedRect(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function badgeTexture() {
  return canvasTexture(640, 900, (ctx, W, H) => {
    ctx.fillStyle = '#f3eee6'; ctx.fillRect(0, 0, W, H);
    // violet head band with the slot
    ctx.fillStyle = VIOLET; ctx.fillRect(0, 0, W, H * 0.2);
    ctx.fillStyle = '#2a1b3d';
    const sw = W * 0.26, sh = H * 0.028;
    ctx.beginPath(); ctx.roundRect((W - sw) / 2, H * 0.06, sw, sh, sh / 2); ctx.fill();
    ctx.fillStyle = 'rgba(243,238,230,0.9)';
    ctx.font = `500 expanded 26px ${LABEL}`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('EVENTS & PROMOTIONS', W / 2, H * 0.16);
    // the role, set like the site's display type
    ctx.fillStyle = '#1c1b2e';
    ctx.letterSpacing = '0px';
    ctx.font = `300 extra-condensed 250px ${DISPLAY}`;
    ctx.fillText('HOST', W / 2, H * 0.53);
    ctx.fillStyle = VIOLET;
    ctx.font = `italic 300 condensed 64px ${DISPLAY}`;
    ctx.fillText('welcome', W / 2, H * 0.62);
    ctx.strokeStyle = 'rgba(28,27,46,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W * 0.14, H * 0.7); ctx.lineTo(W * 0.86, H * 0.7); ctx.stroke();
    ctx.fillStyle = 'rgba(28,27,46,0.55)';
    ctx.font = `500 expanded 22px ${LABEL}`;
    ctx.letterSpacing = '5px';
    ctx.fillText('DOHA · QATAR', W / 2, H * 0.77);
    ctx.fillStyle = '#1c1b2e';
    ctx.font = `600 expanded 40px ${LABEL}`;
    ctx.letterSpacing = '16px';
    ctx.fillText('NEXORA', W / 2 + 8, H * 0.9);
  });
}

function strapTexture() {
  return canvasTexture(64, 1024, (ctx, W, H) => {
    ctx.fillStyle = VIOLET; ctx.fillRect(0, 0, W, H);
    // woven texture and a stitched edge
    for (let y = 0; y < H; y += 3) { ctx.fillStyle = y % 6 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; ctx.fillRect(0, y, W, 1); }
    ctx.fillStyle = 'rgba(243,238,230,0.55)';
    for (let y = 0; y < H; y += 14) { ctx.fillRect(5, y, 2, 8); ctx.fillRect(W - 7, y, 2, 8); }
    ctx.save(); ctx.translate(W / 2, 0); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(243,238,230,0.85)';
    ctx.font = `600 expanded 26px ${LABEL}`;
    ctx.letterSpacing = '8px';
    for (let y = 40; y < H; y += 260) ctx.fillText('NEXORA', y, 10);
    ctx.restore();
  });
}

export function events(ctx: Ctx): Tableau {
  const group = new Group();
  const r = rng(22);

  // ── the badge ─────────────────────────────────────────────────────────────
  const BW = 0.42, BH = 0.59;
  const badgeGeo = new ExtrudeGeometry(roundedRect(BW, BH, 0.03), { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 8 });
  badgeGeo.translate(0, 0, -0.004);
  const uv = badgeGeo.attributes.uv, pos = badgeGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + BW / 2) / BW, (pos.getY(i) + BH / 2) / BH);
  const badgeMat = new MeshPhysicalMaterial({ map: badgeTexture(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMap: ctx.mats.porcelain.envMap, envMapIntensity: 0.7 });
  const badge = new Mesh(badgeGeo, badgeMat);
  const badgePivot = new Group();
  badge.position.y = -BH / 2 - 0.035;
  badgePivot.add(badge);
  const clipRing = new Mesh(new TorusGeometry(0.02, 0.005, 8, 24), ctx.mats.chrome);
  clipRing.position.y = -0.005;
  const clip = new Mesh(new BoxGeometry(0.026, 0.05, 0.012), ctx.mats.chrome);
  clip.position.y = -0.035;
  badgePivot.add(clipRing, clip);
  group.add(badgePivot);

  // ── the strap: a loop between the invisible hand (H) and the clip (C) ─────
  const strapMat = new MeshStandardMaterial({ map: strapTexture(), roughness: 0.62, side: DoubleSide, envMap: ctx.mats.porcelain.envMap, envMapIntensity: 0.4 });
  const keys = [
    { H: new Vector3(-0.3, 0.95, 0), C: new Vector3(-0.25, -0.05, 0.02), up: 0.08, sag: 0.1, spin: 0.0 },
    { H: new Vector3(-1.0, 0.86, -0.12), C: new Vector3(0.22, 0.34, 0.16), up: 0.44, sag: 0.36, spin: 0.42 },
    { H: new Vector3(-1.0, 0.8, -0.12), C: new Vector3(0.6, -0.32, 0.24), up: 0.2, sag: 0.18, spin: 2.0 },
  ];
  const lerpKey = (a: number) => {
    const k0 = a < 0.5 ? keys[0] : keys[1], k1 = a < 0.5 ? keys[1] : keys[2];
    const t = a < 0.5 ? sstep(0.05, 0.5, a) : sstep(0.5, 1.0, a);
    return {
      H: k0.H.clone().lerp(k1.H, t), C: k0.C.clone().lerp(k1.C, t),
      up: mix(k0.up, k1.up, t), sag: mix(k0.sag, k1.sag, t), spin: mix(k0.spin, k1.spin, t),
    };
  };
  const loopPoints = (k: ReturnType<typeof lerpKey>) => {
    const mid = k.H.clone().lerp(k.C, 0.5);
    const d = k.C.clone().sub(k.H);
    const side = new Vector3(-d.y, d.x, 0).normalize();
    return curve([
      k.H,
      k.H.clone().lerp(k.C, 0.25).addScaledVector(side, k.up * 0.8).add(new Vector3(0, 0, -0.08)),
      mid.clone().addScaledVector(side, k.up).add(new Vector3(0, 0, -0.12)),
      k.H.clone().lerp(k.C, 0.78).addScaledVector(side, k.up * 0.55),
      k.C.clone().add(new Vector3(0.01, 0.015, 0)),
      k.C.clone().add(new Vector3(-0.01, 0.015, 0.01)),
      k.H.clone().lerp(k.C, 0.72).addScaledVector(side, -k.sag * 0.6).add(new Vector3(0, 0, 0.1)),
      mid.clone().addScaledVector(side, -k.sag).add(new Vector3(0, 0, 0.16)),
      k.H.clone().lerp(k.C, 0.2).addScaledVector(side, -k.sag * 0.5).add(new Vector3(0, 0, 0.06)),
      k.H.clone().add(new Vector3(0.012, -0.01, 0)),
    ], 220, true, 0.5);
  };
  const strapW = () => 0.06;
  const strapTwist = (s: number) => Math.sin(s * Math.PI * 2 * 1.5) * 0.9 + s * 1.2;
  const strapGeo = ribbon(loopPoints(lerpKey(0.5)), strapW, strapTwist);
  const strap = new Mesh(strapGeo, strapMat);
  group.add(strap);

  // ── confetti: foil squares, frozen mid-burst ──────────────────────────────
  const N = ctx.quality === 'low' ? 140 : 260;
  const conf: Particle[] = [];
  const origin = new Vector3(0.22, 0.02, 0.16);
  const palette = [new Color('#b995f0'), new Color('#e9e3f5'), new Color('#d9b77a'), new Color('#8e62d6'), new Color('#f2ecff')];
  for (let i = 0; i < N; i++) {
    const dir = new Vector3(r() - 0.5, r() * 0.9 - 0.25, r() - 0.5).normalize();
    const sp = 0.45 + Math.pow(r(), 0.6) * 1.1;
    conf.push({ p: origin.clone().add(dir.clone().multiplyScalar(0.05)), v: dir.multiplyScalar(sp), t0: 0.3 + r() * 0.04, life: 3, size: 0.6 + r() * 0.6, rot: new Vector3(r() * 6, r() * 6, r() * 6), spin: new Vector3((r() - 0.5) * 14, (r() - 0.5) * 14, (r() - 0.5) * 14), hue: Math.floor(r() * palette.length) });
  }
  const confGeo = new PlaneGeometry(0.042, 0.026);
  const confMat = new MeshStandardMaterial({ metalness: 0.85, roughness: 0.28, side: DoubleSide, envMap: ctx.mats.porcelain.envMap, envMapIntensity: 1.6 });
  const confMesh = new InstancedMesh(confGeo, confMat, N);
  confMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  conf.forEach((c, i) => confMesh.setColorAt(i, palette[c.hue!]));
  confMesh.frustumCulled = false;
  group.add(confMesh);

  // ── the stage beam ────────────────────────────────────────────────────────
  const beamGeo = new ConeGeometry(0.95, 4.4, 48, 1, true);
  beamGeo.translate(0, -2.2, 0);
  const beamMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uColor: { value: new Color(0.62, 0.5, 1.0) }, uStrength: { value: 0.22 } },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() { float edge = pow(abs(dot(vN, vV)), 1.6); float along = smoothstep(0.0, 0.55, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
        gl_FragColor = vec4(uColor * edge * along * uStrength, 1.0); }`,
  });
  const beam = new Mesh(beamGeo, beamMat);
  beam.position.set(0.1, 3.3, -0.2);
  beam.rotation.z = -0.1;
  group.add(beam);

  const key = { color: new Color('#d9c8ff'), pos: new Vector3(-1.2, 3.4, 3.2), target: new Vector3(0, 0.1, 0), intensity: 30, angle: 0.42, penumbra: 0.8 };

  const tmp = new Object3D();
  let lensP: Vector3 | null = null, lensAmt = 0;

  const pose = (a: number) => {
    const k = lerpKey(a);
    updateRibbon(strapGeo, loopPoints(k), strapW, strapTwist);
    badgePivot.position.copy(k.C);
    badgePivot.rotation.set(0.1 + 0.2 * Math.sin(a * 5), k.spin - 0.16, -0.14 + 0.3 * sstep(0, 0.5, a));
    let i = 0;
    for (const c of conf) {
      let t = (a - c.t0) * TS;
      if (lensP) { const d = c.p.distanceTo(lensP); if (d < 0.6) t += lensAmt * (1 - d / 0.6); }
      if (t < 0) tmp.scale.setScalar(0);
      else {
        // drag makes the burst open fast and then hang, as foil does
        const k2 = (1 - Math.exp(-t * 2.4)) / 2.4;
        tmp.position.set(c.p.x + c.v.x * k2, c.p.y + c.v.y * k2 - 0.12 * t * t, c.p.z + c.v.z * k2);
        tmp.rotation.set(c.rot!.x + c.spin!.x * k2, c.rot!.y + c.spin!.y * k2, c.rot!.z + c.spin!.z * k2);
        tmp.scale.setScalar(c.size * (1 - sstep(2.2, 3, t)));
      }
      tmp.updateMatrix();
      confMesh.setMatrixAt(i++, tmp.matrix);
    }
    confMesh.instanceMatrix.needsUpdate = true;
    beamMat.uniforms.uStrength.value = 0.1 + 0.16 * sstep(0.1, 0.45, a);
  };
  const lens = (p: Vector3 | null, amount: number) => { lensP = p ? group.worldToLocal(p.clone()) : null; lensAmt = amount; };

  pose(0.5);
  return { id: 'events', group, key, pose, lens };
}
