/**
 * The hero world, version 9: the turning world, its doorways onto films. See docs/redesign/09-HERO-V9.md (07 for the
 * turn, 06 for the court itself).
 *
 * A round limestone court under a latticed brass dome; the sun comes through as a rain of stars. Five tall doorways
 * lead out of it, one per workforce, and beyond each a film of that work plays, always: while the court turns, while
 * the camera travels, and at the doorway itself (../films.ts: loaded whole during the intro; here, video textures).
 *
 *   stop 0         the court turns (once round in 72 s) about its pool, the one still thing: the walls and their
 *                  doorways go by, the stars glide; the sun keeps low behind us, so the floor before us is in
 *                  shade (the title stands there) and the far wall in the rain of light
 *   leg 0          the turn comes to rest with the doorway before us (or the one named in the ring) as we cross
 *                  to it; the tour goes on round the ring from there (../timeline.ts `ring`)
 *   stops 1…5      at a doorway: the court's time stops (its film plays on); the sun stands behind the doorway, so the
 *                  wall beside it is in soft shade (the words stand there) and the world's light spills over the
 *                  threshold; the pointer leans the camera a little
 *   legs 1…4       time runs, a day in three seconds: the sun goes once round the sky as the camera turns along
 *                  the court to the next doorway, on the right; its rain sweeps the wall that wipes the view
 *   leg 5 / stop 6 the camera looks up into the rain of light; NEXORA closes over it (../mask.ts, unchanged);
 *                  behind the letters, the five worlds
 *
 * Rendered with three's WebGPU renderer (WebGL2 where WebGPU is missing). Every frame is a pure function of the
 * playhead `p`, the pointer, (on the first screen only) the clock, and the films' own frames.
 */
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, diffuseColor, velocity, add, vec4, vec3, vec2, float, packNormalToRGB, unpackRGBToNormal, sample, screenUV, texture, uniform, mix, smoothstep, length, color, step, clamp, positionGeometry, luminance, pow } from 'three/tsl';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { godrays } from 'three/addons/tsl/display/GodraysNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { buildCourt, fitFilms, COURT, DOORS, STEP, FILM, doorAngle, at, type Court, type Tex } from './scene';
import { Reel, FILM_FPS, type Film } from '../films';
import { locate, ring, TITLE_STOP, LEG_SECONDS } from '../timeline';

import wordmark from '../../../data/wordmark.json';

export type Quality = 'high' | 'medium' | 'low';
export interface Frame {
  p: number;
  moving: boolean;
  dt: number;
  pointer: { x: number; y: number; active: boolean };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A camera pose: where it stands, what it looks at, its field of view. */
interface Pose { pos: THREE.Vector3; look: THREE.Vector3; fov: number }

const QX = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const qn = (k: string, d: number) => { const v = QX.get(k); return v === null ? d : Number(v); };

/** The first screen's turn: the court goes once round in this many seconds (`?spin=0` holds it, for stills). */
const SPIN = QX.get('spin') === '0' ? 0 : (2 * Math.PI) / qn('turn', 72);
/**
 * The sun, as an azimuth relative to where the camera faces (0 = straight ahead, π = behind) and an elevation.
 * First screen: low behind us, so the floor in front lies in the shade of the wall at our back (the ground for the
 * title) while the far wall and its doorways stand in the rain of light. At a doorway: high behind the doorway, so the
 * wall beside it is in soft, even shade (the ground for the words) and the world's light spills over the threshold.
 * Between doorways it goes once round the sky (a day between two worlds), so the rain sweeps across the wall that
 * wipes the view.
 */
const SUN = {
  // (its height keeps the shade the wall at our back throws over the floor as long as it was before the wall rose)
  court: { az: qn('sun0', Math.PI + 0.31), el: qn('el0', 0.425) },
  door: { az: qn('dsun', 0.12), el: qn('del', 0.95) },
  swing: qn('swing', 2 * Math.PI), dip: qn('dip', 0.45),
  up: { az: 0.4, el: 1.1 },
};

/**
 * An upright screen (phones, tablets held tall) is framed the other way about. There is no room beside a doorway for
 * words, so the doorway stands across the TOP of the screen — squarely, not to one side — and the floor between us
 * and it carries them. For that floor to be a calm ground the sun comes down to 36°, still behind the doorway: the
 * wall's shade then reaches twelve metres, past us, and the picture beyond is made to cast a shadow so no beam comes
 * through the opening to fall across the words. The world beyond is a lit picture, so it loses nothing by it.
 */
const UP = { fov: qn('ufov', 74), sun: { az: qn('usun', 0.12), el: qn('uel', 0.63) }, courtFov: 70, courtLook: 4.0 };
/** Screens narrower than this (width ÷ height) are framed upright. */
const UPRIGHT = 0.92;

/** A doorway stop, at the doorway whose (unwrapped) angle is a: the doorway a little right of centre, the wall to its
 *  left free for the words — or, upright, squarely across the top with the floor below it free. */
function doorPose(a: number, ar = 1.6): Pose {
  const S = COURT.stop, U = COURT.upStop;
  // upright: level, eleven metres back, the doorway from a tenth of the height (under the header) to its foot at ~58%
  if (ar < UPRIGHT) return { pos: at(a, COURT.R - U.back, U.eye), look: at(a, COURT.R - 0.35, U.eye), fov: UP.fov };
  // eleven metres back, pitched up 11.5°: the doorway stands from a tenth of the height to its foot at ~86%, a ground
  // line for the words; the camera looks left of the door (+tan) so the door sits right of centre
  const tan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
  const pos = at(a, COURT.R - S.back, S.eye);
  const look = at(a, COURT.R - 0.35, S.eye + S.back * Math.tan((S.pitch * Math.PI) / 180)).addScaledVector(tan, 2.6);
  return { pos, look, fov: 52 };
}
/** Stop 0, facing azimuth th: from the foot of the wall, across the pool to the doorways opposite, the dome overhead.
 *  As the court turns, th runs down and this pose goes round the pool: the pool stays put, the walls go by. */
function overviewPose(th: number, ar = 1.6): Pose {
  const port = ar < UPRIGHT;
  // a squat screen (a phone on its side) is pitched down a little, so that the floor before the pool — where the
  // title stands — keeps its band
  const look = port ? UP.courtLook : ar > 1.8 ? 3.5 : 5.2;
  return { pos: at(th + Math.PI, COURT.R - 1.6, 1.85), look: at(th, COURT.R, look), fov: port ? UP.courtFov : 62 };
}
/** The title card, from the last doorway (angle a): looking up into the dome. */
function upPose(a: number): Pose {
  return { pos: at(a, COURT.R - 9, 1.9), look: at(a - 0.4, 2, COURT.domeBase + 4), fov: 60 };
}
const Y = new THREE.Vector3(0, 1, 0);
const LEG_ENTRY = LEG_SECONDS.entry;
/** Cubic from 0 to 1 that leaves with slope v0 and arrives at rest (monotonic for v0 ≤ 3). */
const hermite = (x: number, v0: number) => v0 * x + (3 - 2 * v0) * x * x + (v0 - 2) * x * x * x;
const mod5 = (j: number) => ((j % DOORS) + DOORS) % DOORS;
/** How much of the world's own progress is its textures (the rest: compiling the court's shaders before the intro hands
 *  over; the films' bytes are counted by the caller, which starts them before this code has even loaded). */
const ASSETS = 0.35;
/** The sun's shadow map per tier: the lattice drawn into it is the dearest pass in the frame (`?sm=` for QA). */
const shadowSize = (q: Quality) => qn('sm', q === 'high' ? 4096 : q === 'medium' ? 1536 : 1024);

export class World {
  readonly timings: Record<string, number | string> = {};
  readonly quality: Quality;
  private renderer!: THREE.WebGPURenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  private pipeline!: THREE.RenderPipeline;
  private court!: Court;
  /** the five films, played together */
  reel!: Reel;
  private sun!: THREE.DirectionalLight;
  private bounce!: THREE.HemisphereLight;
  private w = 1; private h = 1; private dpr = 1;
  private sunNudge = 0; // the pointer's hand on the sun, first screen only (radians, eased)
  private sunSeen = new THREE.Vector3(); // the sun's direction when its shadow map was last drawn
  private shadowAge = 0;
  private lean = new THREE.Vector2();
  private strips!: { mix: ReturnType<typeof uniform>; box: ReturnType<typeof uniform>; aspect: ReturnType<typeof uniform> };
  private titleQuad!: THREE.Mesh;
  private clock = 0;
  /** stop 0: the azimuth the camera faces; it runs down as the court turns (the next doorway comes in from the right) */
  private theta = doorAngle(0) - qn('th', 0) * STEP;
  /** how the film left stop 0: the azimuth it faced then, and the doorway it went into (unwrapped angle, world) */
  private entry = { theta: 0, a: 0, k: 0 };
  private aimed = -1; // a world asked for by name (the index) before the film leaves stop 0
  private atStart = false;
  /** the screen's shape (width ÷ height): under UPRIGHT the film is framed upright (see UP) */
  private ar = 1.6;
  private get port() { return this.ar < UPRIGHT; }

  private constructor(private canvas: HTMLCanvasElement, quality: Quality, private root: HTMLElement | null) {
    this.quality = quality;
  }

  static async create(canvas: HTMLCanvasElement, hint: Quality, films: Promise<Film[]>, onProgress: (f: number) => void = () => {}) {
    const t0 = performance.now();
    const forced = new URLSearchParams(location.search).get('q');
    const quality: Quality = forced === 'high' || forced === 'medium' || forced === 'low' ? forced : await tierFor(hint, canvas);
    const w = new World(canvas, quality, canvas.closest<HTMLElement>('[data-hero]'));
    w.timings.gpu = gpuSeen;
    w.timings.start = quality;
    // (a laptop with two GPUs would otherwise draw this on the integrated one)
    const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    await renderer.init();
    w.renderer = renderer;
    const Qs = new URLSearchParams(location.search);
    renderer.toneMapping = Qs.get('tm') === 'agx' ? THREE.AgXToneMapping : Qs.get('tm') === 'neutral' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = Number(Qs.get('exp') ?? 1.0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    w.timings.init = performance.now() - t0;

    // assets: the court's materials and sky (progress: by count), and the five films (already on their way); then the
    // shaders, as they compile
    const res = quality === 'high' ? '2k' : '1k';
    const tl = new THREE.TextureLoader();
    let done = 0; const total = 3 * 3 + 1;
    const tick = () => onProgress(ASSETS * (++done / total));
    const loadSet = async (n: string): Promise<Tex> => {
      const [col, nrm, arm] = await Promise.all([`col-${res}`, 'nrm-1k', 'arm-1k'].map((k) => tl.loadAsync(`/media/court/${n}-${k}.webp`).then((t) => { tick(); return t; })));
      col.colorSpace = THREE.SRGBColorSpace;
      for (const t of [col, nrm, arm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
      return { col, nrm, arm };
    };
    const [sets, list, hdr] = await Promise.all([
      Promise.all(['stone', 'plaster', 'smooth'].map(loadSet)),
      films,
      new HDRLoader().setDataType(THREE.FloatType).loadAsync('/media/court/sky-1k.hdr').then((t) => { tick(); return t; }),
    ]);
    // each film drawn as a video texture, mipmapped so a doorway seen across the court does not shimmer; a film that
    // could not be had hangs its poster
    const filmTex = await Promise.all(list.map(async (f) => {
      if (!f.video) {
        const p = await tl.loadAsync(`/media/hero9/${f.id}-poster-720.webp`);
        p.colorSpace = THREE.SRGBColorSpace;
        return p;
      }
      const v = new THREE.VideoTexture(f.video);
      v.colorSpace = THREE.SRGBColorSpace;
      if (qn('fm', 1) === 1) { v.generateMipmaps = true; v.minFilter = THREE.LinearMipmapLinearFilter; }
      v.anisotropy = 8;
      v.needsUpdate = true; // its first frame, before it plays
      return v;
    }));
    w.timings.assets = performance.now() - t0;
    w.timings.films = `${list[0]?.video?.videoWidth ?? '-'} px · ${list.filter((f) => f.video).length}/5`;
    w.reel = new Reel(list);
    const tex = { stone: sets[0], plaster: sets[1], smooth: sets[2] };
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    await frame();
    let t = performance.now();
    w.build(tex, filmTex, hdr);
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
    for (const [i, o] of objs.entries()) {
      const t1 = performance.now();
      await renderer.compileAsync(o, w.camera, w.scene);
      worst = Math.max(worst, performance.now() - t1);
      onProgress(ASSETS + (0.98 - ASSETS) * ((i + 1) / objs.length));
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

  private build(tex: Record<string, Tex>, films: THREE.Texture[], hdr: THREE.DataTexture) {
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
    // prefiltered here, before anything compiles: left to itself, three prefilters it lazily inside the first
    // material's build, which during compileAsync sometimes leaves the court without its sky light (a black shade)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    pmrem.dispose();
    scene.background = new THREE.Color(0xdfe7ea);

    const sun = new THREE.DirectionalLight(0xfff0d8, 13.5);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(shadowSize(q));
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -COURT.R - 3; sc.right = sc.top = COURT.R + 3; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    // drawn by hand (render): left to itself, three draws it again for every camera, the pool's mirror included
    sun.shadow.autoUpdate = false;
    sun.shadow.needsUpdate = true;
    scene.add(sun, sun.target);
    // the light the sunlit stone throws back into the shade: the top tier traces it (SSGI); below that this warm fill
    // stands in for it (always in the scene, so a step down changes a uniform, not every shader)
    this.bounce = new THREE.HemisphereLight(0xf6e6cf, 0xe9cfae, 0);
    scene.add(this.bounce);
    this.sun = sun;

    this.court = buildCourt(tex, { films }, scene, { reflect: q === 'high' ? 0.5 : q === 'medium' ? 0.35 : 0.25, dust: q === 'low' ? 1200 : 3200 });
    fitFilms(this.court, COURT.stop); // (wide screens; resize() refits them upright)
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
    const photoAspect = FILM;
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
      col = col.add(texture(films[k], puv).rgb.mul(inside));
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
    // without the traced bounce, the fill and a stronger sky make up the shade's light (matched by eye to the top tier)
    this.bounce.intensity = q === 'high' ? 0 : qn('hemi', 2.4);
    scene.environmentIntensity = q === 'high' ? qn('env', 0.34) : qn('env', 0.75);
    this.pipeline?.dispose();
    const pipeline = new THREE.RenderPipeline(this.renderer);
    const scenePass = pass(scene, this.camera);
    scenePass.setMRT(mrt({ output, diffuseColor, normal: packNormalToRGB(normalView), velocity }));
    const beauty = scenePass.getTextureNode('output');
    const depth = scenePass.getTextureNode('depth');
    const vel = scenePass.getTextureNode('velocity');
    // 1 where a film is seen (its material writes a clear alpha; scene.ts), 0 elsewhere
    const film = float(1).sub(scenePass.getTextureNode('diffuseColor').a);
    scenePass.getTexture('diffuseColor').type = THREE.UnsignedByteType;
    scenePass.getTexture('normal').type = THREE.UnsignedByteType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chain: any = beauty;
    if (q === 'high') {
      const diffuse = scenePass.getTextureNode('diffuseColor');
      const normal = scenePass.getTextureNode('normal');
      const gi = ssgi(beauty, depth, sample((u) => unpackRGBToNormal(normal.sample(u))), this.camera);
      gi.sliceCount.value = 2; gi.stepCount.value = 8; gi.radius.value = 6; gi.giIntensity.value = 2.2; gi.aoIntensity.value = 1;
      // (a film takes no bounce light, having no diffuse colour, and no occlusion either: it is light, not stone)
      chain = vec4(add(beauty.rgb.mul(mix(gi.a, float(1), film)), diffuse.rgb.mul(gi.rgb).mul(float(1).sub(film))), 1);
    }
    if (q !== 'low' && new URLSearchParams(location.search).get('rays') !== '0') {
      const gr = godrays(depth, this.camera, sun);
      gr.raymarchSteps.value = q === 'high' ? 48 : 28;
      gr.density.value = 0.85; gr.maxDensity.value = 0.6; gr.distanceAttenuation.value = 1.6;
      const rayGain = Number(new URLSearchParams(location.search).get('rg') ?? 2.2);
      // the sun stands behind a doorway at its stop, so its shafts would pour over the film: over a film only a trace of
      // them is kept (it still stands in the court's air), so it reads clear, its blacks black
      const overFilm = mix(float(1), float(qn('fr', 0.2)), film);
      chain = vec4(chain.rgb.add(gr.getTextureNode().r.mul(color(new THREE.Color(0xffe4bf))).mul(rayGain).mul(overFilm)), 1);
    }
    const aa = traa(chain, depth, vel, this.camera);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tn = (aa as any).getTextureNode();
    const lit = q === 'low' ? tn : tn.add(bloom(tn, 0.28, 0.55, 1.05));
    // the grade: Doha light — warm where the sun falls, a cool breath of sky in the shade — and a soft vignette
    const Q = new URLSearchParams(location.search);
    const warm = color(new THREE.Color(Q.get('warm') ?? '#fff1dc')), cool = color(new THREE.Color(Q.get('cool') ?? '#dde6f2'));
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
    const port = W / H < UPRIGHT;
    if (port !== this.port && this.court) {
      // upright: the doorway holds its light back, so the floor under it stays a clean ground for the words
      for (const r of this.court.rooms) r.pic.castShadow = port;
      this.sun.shadow.needsUpdate = true;
      this.sunSeen.set(0, 0, 0);
      // and its camera stands elsewhere, so the films are hung again to fill exactly what it sees
      fitFilms(this.court, port ? COURT.upStop : COURT.stop);
    }
    this.ar = W / H;
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
    const pose = doorPose(0, this.ar);
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
    // the first screen turns about the pool, so the pool stands still on screen: the intro's point of light travels to
    // its heart and opens from there over the court; the title stands on the floor in front of its near rim
    const o = overviewPose(0, this.ar);
    cam.position.copy(o.pos); cam.lookAt(o.look); cam.fov = o.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const c = new THREE.Vector3(0, -0.1, 0).project(cam);
    const rim = at(Math.PI, COURT.pool + 0.34, 0.12).project(cam);
    s.setProperty('--circle-x', `${Math.round((c.x * 0.5 + 0.5) * this.w)}px`);
    s.setProperty('--circle-y', `${Math.round((0.5 - c.y * 0.5) * this.h)}px`);
    s.setProperty('--circle-r', `${Math.round(Math.hypot(this.w, this.h) * 0.62)}px`);
    s.setProperty('--pool-front', `${Math.round((0.5 - rim.y * 0.5) * this.h)}px`);
    this.root.dataset.layout = this.port ? 'portrait' : 'court';
  }

  // ── the film ────────────────────────────────────────────────────────────────────────────
  /** The unwrapped angle of the doorway at stop s (1…5): the first one the film went into, then on round to the right. */
  private doorAt(s: number) { return this.entry.a - (s - 1) * STEP; }

  /**
   * On the first screen: the doorway you would step into now — the one facing you, or the next once it is well past
   * — as a world index, and where the court stands between doorways (continuous; k.0 = world k dead ahead), for the
   * index's marker.
   */
  facing() {
    const u = -this.theta / STEP;
    const j = this.aimed >= 0 ? this.aimed + DOORS * Math.round((u - this.aimed) / DOORS) : Math.ceil(u - 0.3056);
    return { k: mod5(j), j, c: ((u % DOORS) + DOORS) % DOORS };
  }
  /** Go into this world rather than the one facing you (the index), when the film next leaves stop 0. */
  aim(k: number) { this.aimed = k; }
  /** A name in the ring under the pointer (-1: none): its doorway's world brightens on the first screen. */
  hover(k: number) { this.hovered = k; }
  private hovered = -1;

  /** How much of the court's turn is left at x (0…1) through leg 0, as a fraction of what was left when it began. */
  private turnLeft(x: number) {
    const left = this.entry.theta - this.entry.a;
    const v0 = left > 0.02 ? Math.min(3, (SPIN * LEG_ENTRY) / left) : 0;
    return 1 - hermite(x, v0);
  }

  /** The ring's mark for playhead p: where it stands (continuous, k.0 = world k's name) and which name is lit. */
  mark(p: number): { c: number; k: number; show: boolean } {
    const L = locate(p);
    const wrap = (c: number) => ((c % DOORS) + DOORS) % DOORS;
    if (L.rest && L.stop === 0) { const f = this.facing(); return { c: f.c, k: f.k, show: true }; }
    if (p >= TITLE_STOP - 1) { const k = mod5(this.entry.k + DOORS - 1); return { c: k, k, show: p === TITLE_STOP - 1 }; }
    if (p >= 1) { const c = this.entry.k + (p - 1); return { c: wrap(c), k: mod5(Math.round(c)), show: true }; }
    // leg 0: from where the court stood as we left to the doorway we went into, as its turn comes to rest
    const u = -this.entry.theta / STEP, j = -this.entry.a / STEP;
    return { c: wrap(j + (u - j) * this.turnLeft(L.local)), k: this.entry.k, show: true };
  }

  /** The film leaves stop 0: the tour is laid out from the doorway it goes into (and the court stops turning). */
  private depart() {
    const f = this.facing();
    this.entry = { theta: this.theta, a: -f.j * STEP, k: f.k };
    ring.start = f.k;
    this.aimed = -1;
  }

  /** Camera pose for playhead p (before the pointer's lean). */
  private poseAt(p: number): Pose {
    const L = locate(p);
    const ar = this.ar;
    if (L.rest) return L.stop === 0 ? overviewPose(this.theta, ar) : L.stop === TITLE_STOP ? upPose(this.doorAt(DOORS)) : doorPose(this.doorAt(L.stop), ar);
    const t = easeIO(L.local);
    if (L.leg === 0) {
      // in: round the pool to the doorway, laid out as if it had been dead ahead...
      const a = this.entry.a, A = overviewPose(a, ar), B = doorPose(a, ar);
      const mid = at(a - Math.PI * 0.62, COURT.pool + 3.2, 1.95), mid2 = at(a - 0.9, COURT.pool + 3.6, 1.85);
      const curve = new THREE.CatmullRomCurve3([A.pos, mid, mid2, B.pos], false, 'centripetal');
      const lookCurve = new THREE.CatmullRomCurve3([A.look, at(a - 0.5, COURT.R, 4.2), B.look], false, 'centripetal');
      // ...and turned by what is left of the court's turn: all of it as we leave (the first screen's own frame, turning
      // at its own speed), none on arrival — the court comes to rest with the doorway before us
      const turn = (this.entry.theta - a) * this.turnLeft(L.local);
      return { pos: curve.getPoint(t).applyAxisAngle(Y, turn), look: lookCurve.getPoint(t).applyAxisAngle(Y, turn), fov: lerp(A.fov, B.fov, t) };
    }
    if (L.leg === TITLE_STOP - 1) {
      const a = this.doorAt(DOORS), A = doorPose(a, ar), B = upPose(a);
      const tt = easeIO(ss(0, 0.8, L.local));
      return { pos: A.pos.clone().lerp(B.pos, tt), look: A.look.clone().lerp(B.look, tt), fov: lerp(A.fov, B.fov, tt) };
    }
    // between doorways: back from the doorway, along the court (its wall wipes across the view), into the next one,
    // which stands to the right
    const a0 = this.doorAt(L.leg), a1 = a0 - STEP, A = doorPose(a0, ar), B = doorPose(a1, ar);
    const bk = this.port ? COURT.upStop.back : COURT.stop.back;
    const pts = [A.pos, at(a0 - 0.12, COURT.R - bk + 0.2, 1.9), at((a0 + a1) / 2, COURT.R - bk - 0.3, 2.05), at(a1 + 0.2, COURT.R - bk + 0.2, 1.9), B.pos];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const looks = [A.look, at(a0 - 0.55, COURT.R, 3.9), at((a0 + a1) / 2 - 0.25, COURT.R, 4.1), at(a1 + 0.1, COURT.R, 3.8), B.look];
    const lookCurve = new THREE.CatmullRomCurve3(looks, false, 'centripetal');
    return { pos: curve.getPoint(t), look: lookCurve.getPoint(t), fov: lerp(A.fov, B.fov, t) };
  }

  /** The sun for playhead p: the azimuth the camera faces, plus the sun's place relative to it, and its height. */
  private sunAt(p: number): { az: number; el: number } {
    const L = locate(p);
    // where the sun stands at a doorway: high behind it (wide screens: the wall beside it goes into shade for the
    // words), or low behind us (upright screens: the floor below it does)
    const door = this.port ? UP.sun : SUN.door;
    if (L.rest) {
      if (L.stop === 0) return { az: this.theta + SUN.court.az, el: SUN.court.el };
      if (L.stop === TITLE_STOP) return { az: this.doorAt(DOORS) + SUN.up.az, el: SUN.up.el };
      return { az: this.doorAt(L.stop) + door.az, el: door.el };
    }
    const x = L.local, t = easeIO(x);
    if (L.leg === 0) {
      // from low behind us to high behind the doorway, swinging round by our right as we cross the court
      const face = lerp(this.entry.theta, this.entry.a, t);
      return { az: face + lerp(SUN.court.az, door.az + 2 * Math.PI, t), el: lerp(SUN.court.el, door.el, ss(0.1, 0.9, x)) };
    }
    if (L.leg === TITLE_STOP - 1) {
      const a = this.doorAt(DOORS);
      return { az: a + lerp(door.az, SUN.up.az, t), el: lerp(door.el, SUN.up.el, t) };
    }
    // between doorways a day goes by: the sun goes once round the sky, lower as it passes behind us, so its rain
    // sweeps across the wall that wipes the view
    const face = lerp(this.doorAt(L.leg), this.doorAt(L.leg + 1), t), s = Math.sin(Math.PI * x);
    return { az: face + door.az + SUN.swing * easeIO(x), el: door.el - SUN.dip * s * (this.port ? 0.4 : 1) };
  }

  private sig = '';
  private settle = 0;
  private slow: number[] = [];
  private stepping = false;

  // ── the films ───────────────────────────────────────────────────────────────────────────
  /** Play the five films (together; they loop on their own). */
  play() {
    this.reel.play();
    // (their pace is measured afresh: the time they were held, and their first frames, are not a stall)
    this.filmWatch.t = 0; this.filmWatch.short = 0;
  }


  /** Hold them (the court is out of sight, or the tab is hidden). */
  pause() { this.reel.pause(); }

  render(f: Frame) {
    const L = locate(f.p);
    // a still frame is not redrawn: once the pointer is still and the temporal AA has settled, nothing changes — unless
    // a film is playing, which is almost always
    const running0 = f.moving || (L.rest && L.stop === 0) || this.reel.live;
    const sig = running0 ? '' : `${f.p}|${f.pointer.active ? f.pointer.x.toFixed(3) + ',' + f.pointer.y.toFixed(3) : '-'}|${this.w}x${this.h}`;
    if (sig && sig === this.sig && this.settle > 24) return;
    if (sig !== this.sig) { this.sig = sig; this.settle = 0; }
    this.settle++;
    this.govern(f.dt, running0);
    // time runs while the camera moves and on the first screen; it stops at a doorway
    const start = L.rest && L.stop === 0;
    const running = f.moving || start;
    if (running) this.clock += f.dt;
    // the first screen: the court turns; leaving it lays the tour out from the doorway we go into
    if (start) this.theta -= SPIN * f.dt;
    else if (this.atStart) this.depart();
    this.atStart = start;
    // the sun keeps its place relative to the camera (so every doorway stands in the same light), swinging between
    // places while time runs; on the first screen the pointer nudges it
    const sun = this.sunAt(f.p);
    this.sunNudge += ((start && f.pointer.active ? f.pointer.x * 0.08 : 0) - this.sunNudge) * Math.min(1, f.dt * 3);
    const az = sun.az + this.sunNudge, el = sun.el;
    const sd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    // the sun's shadow map (the lattice, the dearest thing we draw): once a frame at most, only when the sun has
    // moved, and on the first screen — where it creeps round with the court — every other frame below the top tier
    this.shadowAge++;
    if (this.sunSeen.distanceToSquared(sd) > 1e-12 && this.shadowAge >= (start && this.quality !== 'high' ? 2 : 1)) {
      this.sun.shadow.needsUpdate = true;
      this.sunSeen.copy(sd);
      this.shadowAge = 0;
    }
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
    for (const r of this.court.rooms) {
      // a name hovered in the ring lights its doorway's world a little
      const g = r.glow as unknown as { value: number };
      const want = start && this.hovered === r.k ? 1.32 : 1;
      if (Math.abs(g.value - want) > 1e-3) g.value += (want - g.value) * Math.min(1, f.dt * 6);
    }

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
    this.watchFilms();
    // (not while the intro is up: its own full-screen compositing loads the GPU until it has gone)
    if (!animating || this.stepping || this.quality === 'low' || QX.get('gov') === '0' || document.documentElement.dataset.intro === 'on') return;
    this.slow.push(dt);
    if (this.slow.length < 90) return;
    const sorted = this.slow.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.slow.length = 0;
    if (median > 0.024) this.stepDown('frames');
  }

  /**
   * The films must keep their pace. A GPU the court keeps too busy starves the video decoder that shares it: a film
   * then drops frames, stutters, and at worst its clock stalls. Every second and a half, the frames the films actually
   * showed are counted against what they should have; short twice running, the court steps down a tier. (Not while the
   * intro is up: its own full-screen compositing loads the GPU until it has gone, and would read as the court's doing.)
   */
  private filmWatch = { t: 0, shown: 0, short: 0 };
  private watchFilms() {
    const w = this.filmWatch, now = performance.now();
    const introUp = document.documentElement.dataset.intro === 'on';
    if (!this.reel.live || this.stepping || introUp || this.quality === 'low' || QX.get('gov') === '0') { w.t = 0; return; }
    const shown = this.reel.shown();
    if (!w.t) { w.t = now; w.shown = shown; return; }
    const secs = (now - w.t) / 1000;
    if (secs < 1.5) return;
    const pace = (shown - w.shown) / (secs * FILM_FPS * this.reel.playing);
    w.t = now; w.shown = shown;
    this.timings.filmPace = +pace.toFixed(2);
    w.short = pace < 0.85 ? w.short + 1 : 0;
    if (w.short >= 2) { w.short = 0; w.t = 0; this.stepDown('films'); }
  }

  /** One tier down (rebuilt between frames; a short stall, once). */
  private stepDown(why: string) {
    this.stepping = true;
    (this as { quality: Quality }).quality = this.quality === 'high' ? 'medium' : 'low';
    this.buildPipeline();
    this.sun.shadow.mapSize.setScalar(shadowSize(this.quality));
    this.sun.shadow.needsUpdate = true;
    this.resize();
    this.timings.stepped = `${Math.round(performance.now())} ms, ${why}`;
    this.stepping = false;
    // (the rebuild's stall is not the films' fault: their pace is measured afresh)
    this.filmWatch.t = 0; this.filmWatch.short = 0; this.slow.length = 0;
  }

  dispose() { this.reel?.pause(); this.renderer.dispose(); }
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
async function tierFor(hint: Quality, canvas: HTMLCanvasElement): Promise<Quality> {
  if (hint === 'low') return 'low';
  // The top tier's traced light costs by the pixel, and the films' decoder shares the GPU: past about 1.6 million
  // pixels even a discrete laptop GPU (an RX 5600M at 1920 × 1080) gives the court all it has, and the films starve.
  // So the top tier is kept for screens that leave it room (measured: 1440 × 900 plays every frame; 1920 × 1080, under
  // half). The films' watch (watchFilms) still steps down later if they fall short.
  const px = (canvas.clientWidth || innerWidth) * (canvas.clientHeight || innerHeight) * Math.min(devicePixelRatio, 1.5) ** 2;
  const roomy = px <= qn('px', 1.6e6);
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(o: object): Promise<{ info?: { vendor?: string; architecture?: string } } | null> } }).gpu;
    const a = gpu ? await gpu.requestAdapter({ powerPreference: 'high-performance' }) : null;
    const v = (a?.info?.vendor ?? '').toLowerCase(), arch = (a?.info?.architecture ?? '').toLowerCase();
    gpuSeen = `${v} ${arch} · ${(px / 1e6).toFixed(2)} MP`;
    if (v.includes('nvidia')) return roomy ? 'high' : 'medium';
    if (v.includes('amd') && /rdna/.test(arch)) return roomy ? 'high' : 'medium';
    if (v.includes('apple')) return hint === 'high' && roomy ? 'high' : 'medium';
  } catch { /* fall through */ }
  return 'medium';
}
