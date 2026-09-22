/**
 * The hero world, version 6: one world under a rain of light. See docs/redesign/06-HERO-V6.md.
 *
 * A round limestone court under a latticed brass dome; the sun comes through as moving stars. Five doorways lead
 * out of it, one per workforce, and beyond each is a moment of work, held.
 *
 *   stop 0         the court: the sun drifts, the stars glide over the stone; the pointer moves the sun
 *   leg 0          the camera crosses the court to the first doorway
 *   stops 1…5      at a doorway: time stops (the stars stand still, the dust hangs); the pointer leans round
 *                  the frozen moment beyond the door
 *   legs 1…4       time runs: the camera turns along the court to the next doorway, the sun moving on
 *   leg 5 / stop 6 the camera looks up into the rain of light; NEXORA closes over it (../mask.ts, unchanged);
 *                  behind the letters, the five worlds
 *
 * Rendered with three's WebGPU renderer (WebGL2 where WebGPU is missing). Everything is a pure function of the
 * playhead `p` plus the pointer (and, at stop 0 only, the clock).
 */
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, diffuseColor, velocity, add, vec4, vec3, vec2, float, packNormalToRGB, unpackRGBToNormal, sample, screenUV, texture, uniform, mix, smoothstep, length, color, step, clamp, positionGeometry, luminance, pow } from 'three/tsl';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { godrays } from 'three/addons/tsl/display/GodraysNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { buildCourt, COURT, DOORS, doorAngle, at, type Court, type Tex } from './scene';
import { locate, TITLE_STOP } from '../timeline';
import { worlds } from '../../../data/worlds';
import wordmark from '../../../data/wordmark.json';

export type Quality = 'high' | 'medium' | 'low';
export interface Frame {
  p: number;
  moving: boolean;
  dt: number;
  pointer: { x: number; y: number; active: boolean };
}

const WORLDS = worlds.map((w) => w.id);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A camera pose: where it stands, what it looks at, its field of view. */
interface Pose { pos: THREE.Vector3; look: THREE.Vector3; fov: number }

/** Door stop: the doorway a little right of centre, the wall to its left free for the words. */
function doorPose(k: number): Pose {
  // about ten metres back, pitched up a little: the doorway stands from ~10% to ~85% of the height, its foot a
  // ground line for the words; the camera looks left of the door so the door sits right of centre
  const a = doorAngle(k), tan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
  const pos = at(a, COURT.R - 9.8, 1.7);
  const look = at(a, COURT.R - 0.35, 1.7 + 9.8 * Math.tan((9 * Math.PI) / 180)).addScaledVector(tan, 2.6);
  return { pos, look, fov: 52 };
}
/** Stop 0: across the pool from the far side of the court, looking toward the first doorway, the dome overhead. */
function overviewPose(): Pose {
  const a = doorAngle(0) + Math.PI;
  return { pos: at(a, COURT.R - 1.6, 1.85), look: at(doorAngle(0), COURT.R, 5.2), fov: 62 };
}
/** The title card: looking up into the dome. */
function upPose(): Pose {
  const a = doorAngle(4);
  return { pos: at(a, COURT.R - 9, 1.9), look: at(a + 0.4, 2, COURT.domeBase + 4), fov: 60 };
}

export class World {
  readonly timings: Record<string, number | string> = {};
  readonly quality: Quality;
  private renderer!: THREE.WebGPURenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  private pipeline!: THREE.RenderPipeline;
  private court!: Court;
  private sun!: THREE.DirectionalLight;
  private w = 1; private h = 1; private dpr = 1;
  private sunAz = 0; // the sun's azimuth offset (radians), the film's clock
  private lean = new THREE.Vector2();
  private strips!: { mix: ReturnType<typeof uniform>; box: ReturnType<typeof uniform>; aspect: ReturnType<typeof uniform> };
  private titleQuad!: THREE.Mesh;
  private clock = 0;

  private constructor(private canvas: HTMLCanvasElement, quality: Quality, private root: HTMLElement | null) {
    this.quality = quality;
  }

  static async create(canvas: HTMLCanvasElement, hint: Quality, onProgress: (f: number) => void = () => {}) {
    const t0 = performance.now();
    const forced = new URLSearchParams(location.search).get('q');
    const quality: Quality = forced === 'high' || forced === 'medium' || forced === 'low' ? forced : await tierFor(hint);
    const w = new World(canvas, quality, canvas.closest<HTMLElement>('[data-hero]'));
    w.timings.gpu = gpuSeen;
    w.timings.start = quality;
    // (a laptop with two GPUs would otherwise draw this on the integrated one)
    const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    await renderer.init();
    w.renderer = renderer;
    const Qs = new URLSearchParams(location.search);
    renderer.toneMapping = Qs.get('tm') === 'agx' ? THREE.AgXToneMapping : Qs.get('tm') === 'neutral' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = Number(Qs.get('exp') ?? 0.95);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    w.timings.init = performance.now() - t0;

    // assets: the court's materials, the sky, the five worlds
    const res = quality === 'high' ? '2k' : '1k';
    const tl = new THREE.TextureLoader();
    let done = 0; const total = 3 * 3 + 5 * 2 + 1;
    const tick = () => onProgress(++done / total);
    const loadSet = async (n: string): Promise<Tex> => {
      const [col, nrm, arm] = await Promise.all([`col-${res}`, 'nrm-1k', 'arm-1k'].map((k) => tl.loadAsync(`/media/court/${n}-${k}.webp`).then((t) => { tick(); return t; })));
      col.colorSpace = THREE.SRGBColorSpace;
      for (const t of [col, nrm, arm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
      return { col, nrm, arm };
    };
    const size = quality === 'low' ? 900 : 1400;
    const [sets, photos, depths, hdr] = await Promise.all([
      Promise.all(['stone', 'plaster', 'smooth'].map(loadSet)),
      Promise.all(WORLDS.map((id) => tl.loadAsync(`/media/hero5/${id}-${size}.webp`).then((t) => { t.colorSpace = THREE.SRGBColorSpace; tick(); return t; }))),
      Promise.all(WORLDS.map((id) => tl.loadAsync(`/media/hero5/${id}-depth.webp`).then((t) => { tick(); return t; }))),
      new HDRLoader().setDataType(THREE.FloatType).loadAsync('/media/court/sky-1k.hdr').then((t) => { tick(); return t; }),
    ]);
    w.timings.assets = performance.now() - t0;
    const tex = { stone: sets[0], plaster: sets[1], smooth: sets[2] };
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    await frame();
    let t = performance.now();
    w.build(tex, photos, depths, hdr);
    w.timings.build = performance.now() - t;
    w.resize();
    await frame();
    // compile everything before the intro hands over (a stall later would be a visible freeze), one material a frame
    // so the intro keeps moving between them
    t = performance.now();
    const seen = new Set<THREE.Material>();
    const objs: THREE.Object3D[] = [];
    w.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && !seen.has(m)) { seen.add(m); objs.push(o); } });
    let worst = 0;
    for (const o of objs) {
      const t1 = performance.now();
      await renderer.compileAsync(o, w.camera, w.scene);
      worst = Math.max(worst, performance.now() - t1);
      await frame();
    }
    w.timings.materials = objs.length;
    w.timings.compileWorst = worst;
    w.timings.compile = performance.now() - t;
    await frame();
    t = performance.now();
    w.renderFrame();
    w.timings.first = performance.now() - t;
    await frame();
    t = performance.now();
    w.renderFrame();
    w.timings.second = performance.now() - t;
    w.timings.ready = performance.now() - t0;
    return w;
  }

  private build(tex: Record<string, Tex>, photos: THREE.Texture[], depths: THREE.Texture[], hdr: THREE.DataTexture) {
    const q = this.quality;
    const scene = this.scene;
    // sky light with the sun taken out (the sun is a real, shadow-casting light)
    const img = hdr.image as { data: Float32Array; width: number; height: number };
    for (let i = 0; i < img.width * img.height; i++) {
      const l = img.data[i * 4] * 0.2126 + img.data[i * 4 + 1] * 0.7152 + img.data[i * 4 + 2] * 0.0722;
      if (l > 20) { const k = 20 / l; img.data[i * 4] *= k; img.data[i * 4 + 1] *= k; img.data[i * 4 + 2] *= k; }
    }
    hdr.needsUpdate = true;
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
    scene.environmentIntensity = 0.2;
    scene.background = new THREE.Color(0xdfe7ea);

    const sun = new THREE.DirectionalLight(0xfff0d8, 13.5);
    sun.castShadow = true;
    const sm = Number(new URLSearchParams(location.search).get('sm') ?? (q === 'high' ? 4096 : q === 'medium' ? 2048 : 1024));
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -COURT.R - 3; sc.right = sc.top = COURT.R + 3; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    this.sun = sun;

    const aspect = (photos[0].image as HTMLImageElement).width / (photos[0].image as HTMLImageElement).height;
    this.court = buildCourt(tex, { photos, depths, aspect }, scene, { reflect: q === 'high' ? 0.5 : q === 'medium' ? 0.35 : 0.25, dust: q === 'low' ? 1200 : 3200 });
    scene.add(this.court.root);

    // the title card's ground: the five worlds in the letters' columns (N, E, X, O, RA), full screen behind the mask
    const stripMix = uniform(0);
    const box = uniform(new THREE.Vector4(0.06, 0.94, 0.3, 0.54)); // x0, x1, y0, y1 of the resting word (screen uv, y down)
    const aspectU = uniform(16 / 9);
    const m = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false, transparent: true });
    m.vertexNode = vec4(positionGeometry.xy, 0, 1);
    const su = screenUV;
    const x0 = box.x, x1 = box.y, y0 = box.z, y1 = box.w;
    const seamsU = LETTER_SEAMS.map((g) => x0.add(x1.sub(x0).mul(g)));
    const edges = [x0, ...seamsU, x1];
    const photoAspect = (photos[0].image as HTMLImageElement).width / (photos[0].image as HTMLImageElement).height;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let col: any = vec3(0, 0, 0);
    for (let k = 0; k < 5; k++) {
      const a = edges[k], b2 = edges[k + 1];
      // the panel spans the letter's column and a band a little taller than the word
      const cy = y0.add(y1).mul(0.5), hh = y1.sub(y0).mul(0.75);
      const panelAspect = b2.sub(a).mul(aspectU).div(hh.mul(2));
      const u = su.x.sub(a).div(b2.sub(a)).sub(0.5);
      const v = su.y.sub(cy).div(hh.mul(2));
      // cover: scale the photo so it fills the panel
      const sx = panelAspect.div(photoAspect).min(1), sy = float(photoAspect).div(panelAspect).min(1);
      const puv = vec2(u.mul(sx).add(0.5), v.mul(sy).negate().add(0.5));
      const inside = step(a, su.x).mul(step(su.x, b2));
      col = col.add(texture(photos[k], puv).rgb.mul(inside));
    }
    m.colorNode = col;
    m.opacityNode = stripMix;
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    quad.frustumCulled = false;
    quad.renderOrder = 999;
    this.titleQuad = quad;
    this.strips = { mix: stripMix, box, aspect: aspectU };
    void length; void smoothstep; void clamp;

    this.buildPipeline();
  }

  /** The post chain for the current quality: screen-space GI (high), sunbeams (high, medium), temporal AA, bloom, the grade. */
  private buildPipeline() {
    const q = this.quality, scene = this.scene, sun = this.sun;
    this.pipeline?.dispose();
    const pipeline = new THREE.RenderPipeline(this.renderer);
    const scenePass = pass(scene, this.camera);
    scenePass.setMRT(mrt({ output, diffuseColor, normal: packNormalToRGB(normalView), velocity }));
    const beauty = scenePass.getTextureNode('output');
    const depth = scenePass.getTextureNode('depth');
    const vel = scenePass.getTextureNode('velocity');
    scenePass.getTexture('diffuseColor').type = THREE.UnsignedByteType;
    scenePass.getTexture('normal').type = THREE.UnsignedByteType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chain: any = beauty;
    if (q === 'high') {
      const diffuse = scenePass.getTextureNode('diffuseColor');
      const normal = scenePass.getTextureNode('normal');
      const gi = ssgi(beauty, depth, sample((u) => unpackRGBToNormal(normal.sample(u))), this.camera);
      gi.sliceCount.value = 2; gi.stepCount.value = 8; gi.radius.value = 6; gi.giIntensity.value = 2.2; gi.aoIntensity.value = 1;
      chain = vec4(add(beauty.rgb.mul(gi.a), diffuse.rgb.mul(gi.rgb)), 1);
    }
    if (q !== 'low' && new URLSearchParams(location.search).get('rays') !== '0') {
      const gr = godrays(depth, this.camera, sun);
      gr.raymarchSteps.value = q === 'high' ? 48 : 28;
      gr.density.value = 0.85; gr.maxDensity.value = 0.6; gr.distanceAttenuation.value = 1.6;
      const rayGain = Number(new URLSearchParams(location.search).get('rg') ?? 2.2);
      chain = vec4(chain.rgb.add(gr.getTextureNode().r.mul(color(new THREE.Color(0xffe4bf))).mul(rayGain)), 1);
    }
    const aa = traa(chain, depth, vel, this.camera);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tn = (aa as any).getTextureNode();
    const lit = q === 'low' ? tn : tn.add(bloom(tn, 0.28, 0.55, 1.05));
    // the grade: Doha light — warm where the sun falls, a cool breath of sky in the shade — and a soft vignette
    const Q = new URLSearchParams(location.search);
    const warm = color(new THREE.Color(Q.get('warm') ?? '#fff1dc')), cool = color(new THREE.Color(Q.get('cool') ?? '#e3e8f1'));
    const lum = luminance(lit.rgb);
    const toned = lit.rgb.mul(mix(cool, warm, smoothstep(0.08, 0.9, lum)));
    const sat = Number(Q.get('sat') ?? 1.04);
    const graded = mix(vec3(luminance(toned)), toned, sat);
    const vg = smoothstep(float(0.95), float(0.25), length(screenUV.sub(0.5).mul(vec2(1.25, 1))));
    pipeline.outputNode = vec4(graded.mul(mix(float(Number(Q.get('vig') ?? 0.84)), float(1), vg)), 1);
    void pow;
    this.pipeline = pipeline;
  }

  // ── layout ──────────────────────────────────────────────────────────────────────────────
  resize() {
    const W = this.canvas.clientWidth || innerWidth, H = this.canvas.clientHeight || innerHeight;
    const cap = this.quality === 'high' ? 1.5 : this.quality === 'medium' ? 1.25 : 1;
    this.dpr = Math.min(devicePixelRatio, cap);
    this.w = W; this.h = H;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    {
      const ww = 0.88, wh = (wordmark.height / wordmark.width) * ww * W / H, cy = W / H < 1 ? 0.34 : 0.42;
      (this.strips.box.value as THREE.Vector4).set((1 - ww) / 2, (1 + ww) / 2, cy - wh / 2, cy + wh / 2);
      this.strips.aspect.value = W / H;
    }
    this.publish();
  }

  /** The doorway's box on screen at its stop, published for the copy (CSS custom properties on the hero). */
  private publish() {
    if (!this.root) return;
    const pose = doorPose(0);
    const cam = this.camera.clone();
    cam.position.copy(pose.pos); cam.lookAt(pose.look); cam.fov = pose.fov; cam.aspect = this.w / this.h; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const a = doorAngle(0), D = COURT.door;
    const face = at(a, COURT.R - 0.35, 0);
    const tan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const pts = [[-D.span / 2, 0], [D.span / 2, 0], [0, D.apex]].map(([x, y]) => face.clone().addScaledVector(tan, x).setY(y).project(cam));
    const xs = pts.map((p) => (p.x * 0.5 + 0.5) * this.w), ys = pts.map((p) => (0.5 - p.y * 0.5) * this.h);
    const s = this.root.style;
    s.setProperty('--door-left', `${Math.round(Math.min(...xs))}px`);
    s.setProperty('--door-right', `${Math.round(Math.max(...xs))}px`);
    s.setProperty('--door-top', `${Math.round(Math.min(...ys))}px`);
    s.setProperty('--door-bottom', `${Math.round(Math.max(...ys))}px`);
    // for the intro: its point of light travels to the far doorway on the first screen, then opens over the court
    const o = overviewPose();
    cam.position.copy(o.pos); cam.lookAt(o.look); cam.fov = o.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const c = at(doorAngle(0), COURT.R, D.apex * 0.5).project(cam);
    s.setProperty('--circle-x', `${Math.round((c.x * 0.5 + 0.5) * this.w)}px`);
    s.setProperty('--circle-y', `${Math.round((0.5 - c.y * 0.5) * this.h)}px`);
    s.setProperty('--circle-r', `${Math.round(Math.hypot(this.w, this.h) * 0.62)}px`);
    this.root.dataset.layout = 'court';
  }

  // ── the film ────────────────────────────────────────────────────────────────────────────
  /** Camera pose for playhead p (before the pointer's lean). */
  private poseAt(p: number): Pose {
    const L = locate(p);
    if (L.rest) return L.stop === 0 ? overviewPose() : L.stop === TITLE_STOP ? upPose() : doorPose(L.stop - 1);
    const t = easeIO(L.local);
    if (L.leg === 0) {
      // entry: round the pool's edge to the first doorway
      const A = overviewPose(), B = doorPose(0);
      const mid = at(doorAngle(0) + Math.PI * 0.62, COURT.pool + 3.2, 1.95);
      const mid2 = at(doorAngle(0) + 0.9, COURT.pool + 3.6, 1.85);
      const curve = new THREE.CatmullRomCurve3([A.pos, mid, mid2, B.pos], false, 'centripetal');
      const lookCurve = new THREE.CatmullRomCurve3([A.look, at(doorAngle(0) + 0.5, COURT.R, 4.2), B.look], false, 'centripetal');
      return { pos: curve.getPoint(t), look: lookCurve.getPoint(t), fov: lerp(A.fov, B.fov, t) };
    }
    if (L.leg === TITLE_STOP - 1) {
      const A = doorPose(4), B = upPose();
      const tt = easeIO(ss(0, 0.8, L.local));
      return { pos: A.pos.clone().lerp(B.pos, tt), look: A.look.clone().lerp(B.look, tt), fov: lerp(A.fov, B.fov, tt) };
    }
    // sector: back from the doorway, along the court, into the next
    const k = L.leg - 1, A = doorPose(k), B = doorPose(k + 1);
    const a0 = doorAngle(k), a1 = doorAngle(k + 1);
    const pts = [A.pos, at(a0 + 0.12, COURT.R - 9.6, 1.9), at((a0 + a1) / 2, COURT.R - 10.4, 2.05), at(a1 - 0.2, COURT.R - 9.6, 1.9), B.pos];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const looks = [A.look, at(a0 + 0.55, COURT.R, 3.9), at((a0 + a1) / 2 + 0.25, COURT.R, 4.1), at(a1 - 0.1, COURT.R, 3.8), B.look];
    const lookCurve = new THREE.CatmullRomCurve3(looks, false, 'centripetal');
    return { pos: curve.getPoint(t), look: lookCurve.getPoint(t), fov: lerp(A.fov, B.fov, t) };
  }

  private sig = '';
  private settle = 0;
  private slow: number[] = [];
  private stepping = false;

  render(f: Frame) {
    const L = locate(f.p);
    // a frozen frame is not redrawn: once the pointer is still and the temporal AA has settled, nothing changes
    const running0 = f.moving || (L.rest && L.stop === 0);
    const sig = running0 ? '' : `${f.p}|${f.pointer.active ? f.pointer.x.toFixed(3) + ',' + f.pointer.y.toFixed(3) : '-'}|${this.w}x${this.h}`;
    if (sig && sig === this.sig && this.settle > 24) return;
    if (sig !== this.sig) { this.sig = sig; this.settle = 0; }
    this.settle++;
    this.govern(f.dt, running0);
    // time runs while the camera moves and on the first screen; it stops at a doorway
    const running = f.moving || (L.rest && L.stop === 0);
    if (running) this.clock += f.dt;
    // the sun turns with the camera, behind it (72° a leg), so every doorway stands in the same light and the stars
    // sweep across the stone as we move; on the first screen it drifts, and the pointer adds to it
    const door = Math.min(DOORS - 1, Math.max(0, f.p - 1));
    const base = doorAngle(0) + Math.PI + 0.55 + door * ((2 * Math.PI) / DOORS) + (L.rest && L.stop === 0 ? Math.sin(this.clock * 0.05) * 0.06 : 0);
    const want = base + (L.rest && L.stop === 0 && f.pointer.active ? f.pointer.x * 0.08 : 0);
    this.sunAz += (want - this.sunAz) * Math.min(1, f.dt * 3);
    const el = 1.02; // ~58°
    const sd = new THREE.Vector3(Math.sin(this.sunAz) * Math.cos(el), Math.sin(el), Math.cos(this.sunAz) * Math.cos(el));
    this.sun.position.copy(sd).multiplyScalar(60);
    this.sun.target.position.set(0, 0, 0);
    (this.court.sunDir.value as THREE.Vector3).copy(sd);
    const dt = (this.court.dust.mesh as unknown as { userData: { t: { value: number } } }).userData.t;
    if (running) dt.value += f.dt;

    // camera, with the pointer's lean (small at a doorway: the moment beyond parallaxes against the frame)
    const pose = this.poseAt(f.p);
    const atDoor = L.rest && L.stop >= 1 && L.stop <= DOORS;
    const lx = f.pointer.active ? f.pointer.x : 0, ly = f.pointer.active ? f.pointer.y : 0;
    this.lean.x += (lx - this.lean.x) * Math.min(1, f.dt * 2.5);
    this.lean.y += (ly - this.lean.y) * Math.min(1, f.dt * 2.5);
    const right = new THREE.Vector3().subVectors(pose.look, pose.pos).cross(new THREE.Vector3(0, 1, 0)).normalize();
    const k = atDoor ? 0.32 : 0.18;
    this.camera.position.copy(pose.pos).addScaledVector(right, this.lean.x * k).add(new THREE.Vector3(0, this.lean.y * k * 0.5, 0));
    this.camera.lookAt(pose.look);
    if (Math.abs(this.camera.fov - pose.fov) > 1e-3) { this.camera.fov = pose.fov; this.camera.updateProjectionMatrix(); }
    for (const r of this.court.rooms) (r.lean.value as THREE.Vector2).set(-this.lean.x * 0.02, -this.lean.y * 0.015);

    // the title card's ground fades in under the closing mask
    const exit = L.leg === TITLE_STOP - 1 ? (L.rest ? (L.stop === TITLE_STOP ? 1 : 0) : ss(0.45, 0.8, L.local)) : 0;
    this.strips.mix.value = exit;
    if (exit > 0 && !this.titleQuad.parent) this.scene.add(this.titleQuad);
    if (exit === 0 && this.titleQuad.parent) this.scene.remove(this.titleQuad);
    this.renderFrame();
  }

  private renderFrame() { this.pipeline.render(); }

  /** Frames that run long for two seconds step the quality down (rebuilt between frames; a short stall once). */
  private govern(dt: number, animating: boolean) {
    if (!animating || this.stepping || this.quality === 'low') return;
    this.slow.push(dt);
    if (this.slow.length < 90) return;
    const sorted = this.slow.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.slow.length = 0;
    if (median > 0.024) {
      this.stepping = true;
      (this as { quality: Quality }).quality = this.quality === 'high' ? 'medium' : 'low';
      this.buildPipeline();
      this.resize();
      this.timings.stepped = performance.now();
      this.stepping = false;
    }
  }

  dispose() { this.renderer.dispose(); }
}

/** The gaps between NEXORA's letters as fractions of the wordmark's width (R and A share a panel), from its sub-paths. */
const LETTER_SEAMS = (() => {
  const ranges: [number, number][] = [];
  for (const sub of wordmark.d.split(/(?=M)/)) {
    const xs = [...sub.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    if (xs.length) ranges.push([Math.min(...xs), Math.max(...xs)]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const letters: [number, number][] = [];
  for (const r of ranges) {
    const last = letters[letters.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else letters.push([...r]);
  }
  const gaps = letters.slice(0, -1).map((l, i) => (l[1] + letters[i + 1][0]) / 2);
  return [0, 1, 2, 3].map((i) => (gaps[i] ?? ((i + 1) * wordmark.width) / 5) / wordmark.width);
})();

let gpuSeen = '';
/** A first guess at what this GPU can carry: discrete GPUs get the full court, integrated ones the medium one. */
async function tierFor(hint: Quality): Promise<Quality> {
  if (hint === 'low') return 'low';
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(o: object): Promise<{ info?: { vendor?: string; architecture?: string } } | null> } }).gpu;
    const a = gpu ? await gpu.requestAdapter({ powerPreference: 'high-performance' }) : null;
    const v = (a?.info?.vendor ?? '').toLowerCase(), arch = (a?.info?.architecture ?? '').toLowerCase();
    gpuSeen = `${v} ${arch}`;
    if (v.includes('nvidia')) return 'high';
    if (v.includes('amd') && /rdna/.test(arch)) return 'high';
    if (v.includes('apple')) return hint === 'high' ? 'high' : 'medium';
  } catch { /* fall through */ }
  return 'medium';
}
