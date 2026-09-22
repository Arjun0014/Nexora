/**
 * The night the five moments float in: sky, a far Doha skyline, still water that reflects everything, the lantern
 * at the centre of the ring, the five lattice screens that divide the worlds, and the dust that hangs in the air.
 *
 * Everything that moves here runs on the AMBIENT clock, which the choreography stops when time freezes: the water
 * goes glassy, the dust hangs, the lantern stops breathing.
 */
import {
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide,
  Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PMREMGenerator, PointLight,
  Points, RepeatWrapping, Scene, ShaderMaterial, SphereGeometry, UniformsLib, UniformsUtils, Vector3, type Texture, type WebGLRenderer,
} from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { canvasTexture, rng } from './kit';

export const R = 5; // ring radius: where the five moments float
// The screens stop short of where the camera stands, so a moment is framed by two walls without being boxed in;
// the camera dips through them between moments (see the sector legs in index.ts), which is the wipe.
export const SCREEN = { inner: 1.7, outer: 7.7, height: 3.5 };
// High over the dial: the centre of the ring seen from above, a light from above-behind at each moment, and just
// out of frame in the close shots (a white dot hanging behind every moment read as a flaw).
export const HUB_Y = 4.5;

// ── sky ──────────────────────────────────────────────────────────────────────────────────────
function makeSky() {
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uHorizon: { value: new Color('#16223a') }, uZenith: { value: new Color('#020307') }, uGlow: { value: new Color('#4a3524') } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uGlow;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
        // the city's glow along the horizon, warm and low
        col += uGlow * exp(-abs(h) * 16.0) * 0.9;
        col *= smoothstep(-0.25, 0.02, h) * 0.85 + 0.15;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new Mesh(new SphereGeometry(120, 48, 24), mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

// ── stars: points on the sky, scattered (a hash grid shows its rows), each with its own shimmer ─
function makeStars(count: number) {
  const r = rng(12);
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = r(), v = 0.04 + Math.pow(r(), 0.8) * 0.96;
    const th = u * Math.PI * 2, y = v;
    const rad = Math.sqrt(1 - y * y);
    pos.set([Math.cos(th) * rad * 110, y * 110, Math.sin(th) * rad * 110], i * 3);
    seed[i] = r();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('seed', new BufferAttribute(seed, 1));
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float seed; uniform float uTime; uniform float uPx; varying float vA;
      void main() {
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
        float big = step(0.93, seed);
        gl_PointSize = uPx * (1.2 + 1.6 * big + seed * 0.8);
        vA = (0.35 + 0.65 * seed) * (0.7 + 0.3 * sin(uTime * (0.8 + seed * 2.4) + seed * 60.0)) * smoothstep(0.02, 0.25, normalize(position).y);
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * smoothstep(0.5, 0.1, d) * vA, 1.0); }`,
  });
  const pts = new Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -9;
  return pts;
}

// ── skyline: West Bay across the water, drawn once ──────────────────────────────────────────
function skylineTexture(): Texture {
  return canvasTexture(4096, 512, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    const r = rng(7);
    const base = H * 0.94;
    const sil = '#070b14';
    // The towers occupy an arc of the horizon (the texture wraps the full circle).
    const towers: { x: number; w: number; h: number; kind: string }[] = [];
    const arc0 = W * 0.08, arc1 = W * 0.62;
    let x = arc0;
    while (x < arc1) {
      const k = r();
      const centre = 1 - Math.abs((x - (arc0 + arc1) / 2) / ((arc1 - arc0) / 2));
      const h = (0.12 + r() * 0.34 + centre * 0.36) * H;
      const w = 18 + r() * 40;
      towers.push({ x, w, h, kind: k < 0.06 ? 'dome' : k < 0.11 ? 'hyper' : k < 0.3 ? 'slant' : k < 0.4 ? 'spire' : 'box' });
      x += w * (0.55 + r() * 0.9);
    }
    // Two landmarks placed by hand: the dome-topped cylinder and the hourglass tower.
    towers.push({ x: W * 0.33, w: 46, h: H * 0.8, kind: 'dome' });
    towers.push({ x: W * 0.405, w: 40, h: H * 0.62, kind: 'hyper' });
    towers.sort((a, b) => a.h - b.h);

    const lights: [number, number][] = [];
    for (const t of towers) {
      const top = base - t.h;
      ctx.fillStyle = sil;
      ctx.beginPath();
      if (t.kind === 'dome') {
        ctx.moveTo(t.x, base); ctx.lineTo(t.x, top + t.w * 0.5);
        ctx.quadraticCurveTo(t.x, top - t.w * 0.15, t.x + t.w / 2, top - t.w * 0.2);
        ctx.quadraticCurveTo(t.x + t.w, top - t.w * 0.15, t.x + t.w, top + t.w * 0.5);
        ctx.lineTo(t.x + t.w, base);
        ctx.fillRect(t.x + t.w / 2 - 1.2, top - t.w * 0.2 - 26, 2.4, 28);
      } else if (t.kind === 'hyper') {
        const m = t.w * 0.2;
        ctx.moveTo(t.x, base);
        ctx.quadraticCurveTo(t.x + m * 2.2, top + t.h * 0.5, t.x, top);
        ctx.lineTo(t.x + t.w, top);
        ctx.quadraticCurveTo(t.x + t.w - m * 2.2, top + t.h * 0.5, t.x + t.w, base);
      } else if (t.kind === 'slant') {
        ctx.moveTo(t.x, base); ctx.lineTo(t.x, top + t.w * 0.6); ctx.lineTo(t.x + t.w, top); ctx.lineTo(t.x + t.w, base);
      } else if (t.kind === 'spire') {
        ctx.moveTo(t.x, base); ctx.lineTo(t.x, top); ctx.lineTo(t.x + t.w, top); ctx.lineTo(t.x + t.w, base);
        ctx.fillRect(t.x + t.w / 2 - 1, top - 40, 2, 42);
      } else {
        ctx.moveTo(t.x, base); ctx.lineTo(t.x, top); ctx.lineTo(t.x + t.w, top); ctx.lineTo(t.x + t.w, base);
      }
      ctx.closePath(); ctx.fill();
      // windows: sparse warm points, a few whole lit floors
      const floors = Math.floor(t.h / 9);
      for (let f = 2; f < floors; f++) {
        const lit = r();
        if (lit > 0.82) {
          const y = base - f * 9;
          for (let wx = t.x + 3; wx < t.x + t.w - 3; wx += 5) if (r() > 0.35) lights.push([wx, y]);
        }
      }
      if (t.h > H * 0.45) lights.push([t.x + t.w / 2, top - (t.kind === 'dome' ? t.w * 0.2 + 26 : t.kind === 'spire' ? 40 : 2)]);
    }
    for (const [lx, ly] of lights) {
      const red = ly < base - H * 0.5 && r() > 0.5;
      ctx.fillStyle = red ? 'rgba(255,90,70,0.95)' : `rgba(255,${200 + Math.floor(r() * 40)},${140 + Math.floor(r() * 50)},${0.55 + r() * 0.4})`;
      ctx.fillRect(lx, ly, red ? 3 : 2, red ? 3 : 2);
    }
    // the low coast around the rest of the horizon
    ctx.fillStyle = sil;
    for (let px = 0; px < W; px += 3) {
      const inArc = px > arc0 - 40 && px < arc1 + 40;
      if (inArc) continue;
      const hh = 4 + Math.abs(Math.sin(px * 0.013) * 7 + Math.sin(px * 0.031) * 4);
      ctx.fillRect(px, base - hh, 3, hh);
      if (r() > 0.9) { ctx.fillStyle = 'rgba(255,214,160,0.7)'; ctx.fillRect(px, base - hh - 1, 2, 2); ctx.fillStyle = sil; }
    }
    ctx.fillRect(0, base, W, H - base);
  });
}

function makeSkyline() {
  const tex = skylineTexture();
  tex.wrapS = RepeatWrapping;
  const g = new CylinderGeometry(70, 70, 11, 192, 1, true);
  const m = new Mesh(g, new MeshBasicMaterial({ map: tex, transparent: true, side: BackSide, depthWrite: false, fog: false, color: new Color(1.15, 1.1, 1.05) }));
  m.position.y = 11 / 2 - 0.6;
  m.rotation.y = 0.9; // puts the towers behind the ring in the opening view
  m.renderOrder = -5;
  return m;
}

// ── water ────────────────────────────────────────────────────────────────────────────────────
function makeWater(w: number, h: number) {
  const shader = {
    name: 'NexoraWater',
    uniforms: UniformsUtils.merge([UniformsLib.fog, {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      uTime: { value: 0 }, uCam: { value: new Vector3() }, uDeep: { value: new Color('#04070d') }, uStrength: { value: 1 },
    }]),
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix;
      varying vec4 vUvR; varying vec3 vWorld;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vUvR = textureMatrix * vec4(position, 1.0);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime; uniform vec3 uCam; uniform vec3 uDeep; uniform float uStrength;
      varying vec4 vUvR; varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      vec2 wave(vec2 p, vec2 d, float f, float s, float a) { float ph = dot(p, d) * f + uTime * s; return d * cos(ph) * f * a; }
      void main() {
        vec2 p = vWorld.xz;
        vec2 g = wave(p, normalize(vec2(1.0, 0.3)), 1.7, 0.9, 0.012)
               + wave(p, normalize(vec2(-0.4, 1.0)), 2.9, 1.3, 0.007)
               + wave(p, normalize(vec2(0.7, -0.8)), 5.3, 1.9, 0.004)
               + wave(p, normalize(vec2(-1.0, -0.2)), 9.1, 2.6, 0.002);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(uCam - vWorld);
        float ndv = max(dot(N, V), 0.0);
        float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
        vec4 uv = vUvR;
        vec2 off = N.xz * 0.045 * uv.w;
        vec3 R = texture2DProj(tDiffuse, uv + vec4(off, 0.0, 0.0)).rgb * 0.4
               + texture2DProj(tDiffuse, uv + vec4(off + vec2(0.006, 0.0) * uv.w, 0.0, 0.0)).rgb * 0.15
               + texture2DProj(tDiffuse, uv + vec4(off - vec2(0.006, 0.0) * uv.w, 0.0, 0.0)).rgb * 0.15
               + texture2DProj(tDiffuse, uv + vec4(off + vec2(0.0, 0.012) * uv.w, 0.0, 0.0)).rgb * 0.15
               + texture2DProj(tDiffuse, uv + vec4(off - vec2(0.0, 0.012) * uv.w, 0.0, 0.0)).rgb * 0.15;
        // night water: dark body, lights reflected strongly even from above
        vec3 col = uDeep + R * mix(0.55, 1.0, F) * uStrength;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
  };
  const water = new Reflector(new PlaneGeometry(400, 400), {
    textureWidth: Math.max(256, Math.round(w)), textureHeight: Math.max(256, Math.round(h)), clipBias: 0.002, multisample: 0, shader,
  });
  (water.material as ShaderMaterial).fog = true;
  water.rotation.x = -Math.PI / 2;
  return water;
}

// ── the lantern at the centre ────────────────────────────────────────────────────────────────
function makeHub() {
  const g = new Group();
  g.position.set(0, HUB_Y, 0);
  const core = new Mesh(new SphereGeometry(0.1, 32, 16), new MeshBasicMaterial({ color: new Color(1.0, 0.64, 0.32).multiplyScalar(3.2) }));
  g.add(core);
  const haloTex = canvasTexture(256, 256, (ctx, W, H) => {
    const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    grd.addColorStop(0, 'rgba(255,214,160,1)');
    grd.addColorStop(0.12, 'rgba(255,170,100,0.55)');
    grd.addColorStop(0.4, 'rgba(210,120,60,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }, false);
  const halo = new Mesh(new PlaneGeometry(3.4, 3.4), new MeshBasicMaterial({ map: haloTex, transparent: true, blending: AdditiveBlending, depthWrite: false, color: new Color(0.75, 0.55, 0.42) }));
  halo.userData.billboard = true;
  g.add(halo);
  const light = new PointLight(new Color('#ffb676'), 38, 0, 1.55);
  g.add(light);
  return { group: g, core, halo, light };
}

// ── the five lattice screens ─────────────────────────────────────────────────────────────────
function makeScreen(material: MeshStandardMaterial) {
  const W = SCREEN.outer - SCREEN.inner, H = SCREEN.height;
  const g = new PlaneGeometry(W, H, 1, 1);
  g.translate(SCREEN.inner + W / 2, H / 2 - 0.02, 0);
  return new Mesh(g, material);
}

function screenMaterial() {
  const W = SCREEN.outer - SCREEN.inner, H = SCREEN.height;
  const m = new MeshStandardMaterial({ color: new Color('#2a1f16'), metalness: 0.5, roughness: 0.5, side: DoubleSide, transparent: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCells = { value: [W / 0.8, H / 0.8] };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLat;\nuniform vec2 uCells;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvLat = uv * uCells;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', /* glsl */`#include <common>
        varying vec2 vLat;
        uniform vec2 uCells;
        float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
        float latticeD(vec2 c) {
          vec2 q = fract(c) - 0.5;
          float d = abs(sdBox(q, vec2(0.25)));
          vec2 r = vec2(q.x - q.y, q.x + q.y) * 0.70710678;
          d = min(d, abs(sdBox(r, vec2(0.25))));
          // bars from the star tips to the neighbours: along the axes and the diagonals
          d = min(d, max(abs(q.y), 0.354 - abs(q.x)));
          d = min(d, max(abs(q.x), 0.354 - abs(q.y)));
          d = min(d, max(abs(q.x - q.y) * 0.70710678, 0.25 - abs(q.x)));
          d = min(d, max(abs(q.x + q.y) * 0.70710678, 0.25 - abs(q.x)));
          return d;
        }`)
      .replace('#include <clipping_planes_fragment>', /* glsl */`#include <clipping_planes_fragment>
        float ld = latticeD(vLat);
        vec2 edge = min(vLat, uCells - vLat);
        float frame = min(edge.x, edge.y);
        float w = 0.019;
        float aa = fwidth(ld) * 0.8 + 1e-4;
        float keep = 1.0 - smoothstep(w - aa, w + aa, ld);
        keep = max(keep, 1.0 - smoothstep(0.1 - aa, 0.1 + aa, frame));
        if (keep < 0.02) discard;
        float latticeAlpha = keep;`)
      .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\ndiffuseColor.a = latticeAlpha;');
  };
  return m;
}

// ── dust hanging in the air ──────────────────────────────────────────────────────────────────
function makeDust(count: number) {
  const r = rng(3);
  const pos = new Float32Array(count * 3), seed = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, rad = 1.2 + Math.pow(r(), 0.7) * 11;
    pos[i * 3] = Math.cos(a) * rad; pos[i * 3 + 1] = 0.15 + r() * 5.2; pos[i * 3 + 2] = Math.sin(a) * rad;
    seed[i * 2] = r(); seed[i * 2 + 1] = r();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('seed', new BufferAttribute(seed, 2));
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 300 }, uColor: { value: new Color(1.0, 0.86, 0.68) } },
    vertexShader: /* glsl */`
      attribute vec2 seed; uniform float uTime; uniform float uScale; varying float vA;
      void main() {
        vec3 p = position;
        float t = uTime * (0.05 + seed.x * 0.08);
        p += vec3(sin(t + seed.y * 30.0) * 0.35, sin(t * 0.7 + seed.x * 20.0) * 0.22, cos(t * 0.8 + seed.y * 11.0) * 0.35);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (0.5 + seed.x * 1.3) * uScale / -mv.z;
        gl_PointSize = min(size, 14.0);
        vA = (0.25 + 0.75 * seed.y) * (0.6 + 0.4 * sin(uTime * (0.6 + seed.x) + seed.y * 40.0));
        // near motes are defocused: bigger, much fainter
        vA *= smoothstep(0.6, 2.5, -mv.z) / (1.0 + size * 0.25);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vA;
      void main() { vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * a * vA * 1.4, 1.0); }`,
  });
  const pts = new Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}

// ── environment map for reflections: a dark room with a few soft panels ─────────────────────
export function makeEnvMap(renderer: WebGLRenderer) {
  const s = new Scene();
  s.background = new Color('#040507');
  const panel = (w: number, h: number, c: Color, x: number, y: number, z: number, ry = 0, rx = 0) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: c, side: DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0);
    s.add(m);
  };
  panel(6, 3, new Color(3.2, 2.2, 1.4), 0, 6, -2, 0, Math.PI / 2);       // warm overhead softbox
  panel(1.2, 7, new Color(0.9, 1.2, 2.0), -7, 1, 0, Math.PI / 2);       // cool strip, left
  panel(1.2, 7, new Color(2.2, 1.5, 0.9), 7, 1, 0, -Math.PI / 2);       // warm strip, right
  panel(8, 1.2, new Color(0.35, 0.3, 0.28), 0, -2, 7);                  // faint floor bounce
  panel(2.5, 2.5, new Color(4.0, 2.6, 1.5), 2, 2, -7);                  // the lantern's kick
  const box = new Mesh(new BoxGeometry(18, 14, 18), new MeshBasicMaterial({ color: new Color('#07080b'), side: BackSide }));
  s.add(box);
  const pm = new PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  s.traverse((o) => { const m = o as Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as MeshBasicMaterial).dispose(); } });
  return rt.texture;
}

export function buildEnvironment(opts: { reflW: number; reflH: number; dust: number }) {
  const root = new Group();
  const sky = makeSky();
  const stars = makeStars(opts.dust > 800 ? 1300 : 700);
  const skyline = makeSkyline();
  const water = makeWater(opts.reflW, opts.reflH);
  const hub = makeHub();
  const dust = makeDust(opts.dust);
  root.add(sky, stars, skyline, water, hub.group, dust);

  const hemi = new HemisphereLight(new Color('#2a3a5c'), new Color('#0c0906'), 0.55);
  root.add(hemi);

  const screenMat = screenMaterial();
  const screens = new Group();
  return { root, sky, stars, skyline, water, hub, dust, hemi, screens, screenMat, makeScreen: () => makeScreen(screenMat) };
}
