/**
 * The hero world: five moments held in time, floating over night water in a ring around a lantern.
 *
 * Everything on screen is a pure function of the playhead `p` (see ../timeline.ts) plus three small pieces of
 * state that must stay continuous: the ring's angle (it turns while the world is seen whole), the ambient clock
 * (water, dust and stars: it runs while time runs and stops dead when time freezes), and the pointer.
 *
 *   stop 0         the ring, turning; every moment frozen
 *   leg 0          the dive: the ring slows, the camera swings down and in to the first moment
 *   stops 1…5      a moment, frozen; the pointer moves the camera around it, and time trembles near the pointer
 *   legs 1…4       time runs: the moment finishes, the camera tracks through the lattice screen, the next moment
 *                  arrives still moving and freezes on its key frame
 *   leg 5 / stop 6 the camera lifts back out to the ring, which starts to turn again (behind the NEXORA mask)
 */
import {
  Color, DirectionalLight, Fog, Group, HalfFloatType, Mesh, NoToneMapping, PerspectiveCamera, Plane, Raycaster, Scene,
  SpotLight, SRGBColorSpace, Vector2, Vector3, WebGLRenderer, type Texture,
} from 'three';
import {
  BlendFunction, BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass,
  SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { buildEnvironment, HUB_Y, makeEnvMap, R } from './env';
import { DIAL, makeDial, makeRipple } from './dial';
import { makeMaterials } from './materials';
import { camEase, clamp01, easeOut, fontsReady, mix, sstep } from './kit';
import { makeWord, type Word } from './words';
import { hospitality } from './tableaux/hospitality';
import { events } from './tableaux/events';
import { facilities } from './tableaux/facilities';
import { technical } from './tableaux/technical';
import { recruitment } from './tableaux/recruitment';
import type { Tableau } from './tableaux/types';
import { worlds } from '../../../data/worlds';
import { buildLegs, locate, TITLE_STOP } from '../timeline';
import { simulateSheet, type SheetSim } from './sheet-sim';

/** The linen's simulation, in a worker when there is one (the main thread stays free for the intro). */
function startSheetSim(): Promise<SheetSim> {
  return new Promise((resolve) => {
    try {
      const w = new Worker(new URL('./sheet.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<SheetSim>) => { resolve(e.data); w.terminate(); };
      w.onerror = () => { resolve(simulateSheet()); w.terminate(); };
      w.postMessage(0);
    } catch { resolve(simulateSheet()); }
  });
}

export type Quality = 'high' | 'medium' | 'low';
export interface Frame {
  p: number;
  moving: boolean;
  dt: number;
  /** pointer in NDC (-1..1), and whether it is over the stage */
  pointer: { x: number; y: number; active: boolean };
}

const TAU = Math.PI * 2;
const PHI0 = Math.PI / 2;
const phi = (k: number) => PHI0 - (k * TAU) / 5; // the camera travels to the right: clockwise seen from above
const OMEGA = -TAU / 72; // the ring's idle turn: once in 72 s, clockwise seen from above (as the diorama turned)
const TABLEAU_Y = 1.55;
const KEY = 0.5, START = 0.14;
const SPIN_END = 0.7; // the dive: the ring's turn to present the first moment is complete by this point
const UP = new Vector3(0, 1, 0);

const WORD_COLOR: Record<string, Color> = {
  hospitality: new Color(1.0, 0.74, 0.46).multiplyScalar(0.86),
  events: new Color(0.8, 0.66, 1.0).multiplyScalar(0.82),
  facilities: new Color(0.78, 0.97, 0.93).multiplyScalar(0.78),
  technical: new Color(0.7, 0.82, 1.0).multiplyScalar(0.82),
  recruitment: new Color(0.62, 0.9, 1.0).multiplyScalar(0.82),
};

interface Pose { pos: Vector3; tgt: Vector3; fov: number }
const pose = (pos: Vector3, tgt: Vector3, fov: number): Pose => ({ pos, tgt, fov });

/** Cylindrical interpolation about the ring's axis: camera moves read as orbits, not straight lines. */
function orbitLerp(a: Pose, b: Pose, t: number, delta: number, swing = { r: 0, h: 0 }, tt = t): Pose {
  const cyl = (v: Vector3) => ({ ang: Math.atan2(v.x, v.z), r: Math.hypot(v.x, v.z), h: v.y });
  const A = cyl(a.pos), B = cyl(b.pos);
  const ang = A.ang + delta * t;
  const r = mix(A.r, B.r, t) + swing.r * Math.sin(Math.PI * t);
  const h = mix(A.h, B.h, t) + swing.h * Math.sin(Math.PI * t);
  const TA = cyl(a.tgt), TB = cyl(b.tgt);
  let td = TB.ang - TA.ang; td = Math.atan2(Math.sin(td), Math.cos(td));
  if (TA.r < 0.5 || TB.r < 0.5) {
    // one end looks at the axis: interpolate the target as a point
    return pose(new Vector3(Math.sin(ang) * r, h, Math.cos(ang) * r), a.tgt.clone().lerp(b.tgt, tt), mix(a.fov, b.fov, t));
  }
  // the aim takes its OWN shortest way round (in a sector leg that is the same 72° as the camera; on the dive it is
  // not, and borrowing the camera's angle left the aim short until the last frame snapped it into place)
  const tAng = TA.ang + td * tt;
  const tr = mix(TA.r, TB.r, tt), th = mix(TA.h, TB.h, tt);
  return pose(new Vector3(Math.sin(ang) * r, h, Math.cos(ang) * r), new Vector3(Math.sin(tAng) * tr, th, Math.cos(tAng) * tr), mix(a.fov, b.fov, t));
}

const wrapPi = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));

export class World {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 1, 0.05, 400);
  private composer: EffectComposer;
  private bloom: BloomEffect;
  private chroma: ChromaticAberrationEffect;
  private ring = new Group();
  private env!: ReturnType<typeof buildEnvironment>;
  private tableaux: Tableau[] = [];
  private words: Word[] = [];
  private screens: Mesh[] = [];
  private legs = buildLegs();
  private portrait = false;
  private w = 1; private h = 1;
  private quality: Quality;
  private dpr = 1;

  // continuous state
  private ringAngle = 0.35;
  private clock = 0;
  private timeScale = 1;
  private exitDelta: number | null = null;
  private spin: { A: number; D: number } | null = null;
  private prevP = 0;
  private lastA = [-1, -1, -1, -1, -1];
  private rig = new Vector2();
  private breath = 0;
  private freezePulse = 0;
  private ripplePulse = 0;
  private ripple: ReturnType<typeof makeRipple> | null = null;
  private wasMoving = false;
  private lensAmt = 0;
  private ray = new Raycaster();
  private plane = new Plane();
  private hit = new Vector3();
  // the follow spot and the moonlight (see render())
  private key = new SpotLight(new Color('#ffffff'), 0, 16, 0.5, 0.8, 1.2);
  private moon = new DirectionalLight(new Color('#a9bcdc'), 0);
  private kPos = new Vector3(); private kTgt = new Vector3(); private kCol = new Color(); private tmpV = new Vector3();
  // idle skip and the frame-rate governor
  private lastCam = new Float32Array(16);
  private drawn = false;
  private times: number[] = [];
  private dprCeil = Infinity;
  /** ?qa-nowords: the stills for the static page are rendered without the names (the page sets them as text). */
  private noWords = new URLSearchParams(location.search).has('qa-nowords');

  private constructor(private canvas: HTMLCanvasElement, quality: Quality) {
    this.quality = quality;
    this.renderer = new WebGLRenderer({ canvas, antialias: false, stencil: false, depth: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(new Color('#050608'), 1);
    this.moon.position.set(4, 16, 11);
    this.key.decay = 1.2;
    // No multisampling: MSAA buffers + the mipmap bloom render BLACK on some GPUs (seen on an AMD integrated GPU
    // through ANGLE/D3D11), and software rendering hides it. Edges are smoothed by SMAA in a pass of its own.
    this.composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.82, luminanceSmoothing: 0.3, intensity: 1.15, radius: 0.74 });
    this.chroma = new ChromaticAberrationEffect({ offset: new Vector2(0.0005, 0.0004), radialModulation: true, modulationOffset: 0.3 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const vignette = new VignetteEffect({ offset: 0.24, darkness: 0.66 });
    const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN });
    noise.blendMode.opacity.value = 0.045;
    this.composer.addPass(new EffectPass(this.camera, this.bloom, this.chroma, tone, vignette));
    // SMAA and the chromatic fringe both read neighbouring pixels, so they cannot share a pass; the grain goes last
    // so the anti-aliasing never smears it.
    if (quality === 'low') this.composer.addPass(new EffectPass(this.camera, noise));
    else this.composer.addPass(new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.HIGH }), noise));
  }

  /** Milliseconds spent in each stage of create(), for QA (?qa exposes the world). */
  readonly timings: Record<string, number> = {};

  /**
   * Builds the world while the intro is up, without ever holding the main thread for long: the linen is simulated
   * in a worker, the build yields a frame between its pieces, and the shaders compile asynchronously (the driver
   * compiles in parallel; on Windows a blocking compile of the whole scene froze the intro for seconds).
   */
  static async create(canvas: HTMLCanvasElement, quality: Quality, onProgress: (f: number) => void = () => {}) {
    const world = new World(canvas, quality);
    let t = performance.now();
    const lap = (k: string) => { const n = performance.now(); world.timings[k] = Math.round(n - t); t = n; };
    const breathe = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    const sheet = startSheetSim();
    await fontsReady();
    lap('fonts');
    onProgress(0.08);
    let chunk = 0;
    for await (const f of world.build(sheet, breathe)) { onProgress(0.08 + 0.52 * f); lap(`build${chunk++}`); }
    world.resize();
    // Compile every program now, so no leg ever stalls on a shader: things hidden at the opening (the screens, the
    // names, the parts of a moment that come later) are shown for the compile, then put back.
    const hidden: { visible: boolean }[] = [];
    world.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    world.pose(0.5);
    // Compile against the composer's own buffer: a program's variant depends on its target (linear, no tone
    // mapping, into the buffer; sRGB onto the screen), and only the buffer's variants are ever drawn.
    world.renderer.setRenderTarget(world.composer.inputBuffer);
    try { await world.renderer.compileAsync(world.scene, world.camera); } catch { world.renderer.compile(world.scene, world.camera); }
    world.renderer.setRenderTarget(null);
    lap('compile');
    onProgress(0.9);
    await breathe();
    // One real frame through the post chain compiles its (few) programs.
    world.render({ p: 0.5, moving: true, dt: 0.016, pointer: { x: 0, y: 0, active: false } });
    lap('warm');
    hidden.forEach((o) => { o.visible = false; });
    // Open with the first moment just right of front: the turn carries it round toward the camera.
    world.ringAngle = world.frontAngle() + 0.6;
    world.render({ p: 0, moving: false, dt: 0, pointer: { x: 0, y: 0, active: false } });
    await breathe();
    onProgress(1);
    return world;
  }

  /** Camera and moments at a playhead position without drawing (used to present the scene for the compile). */
  private pose(p: number) {
    const sh = this.shot(p);
    this.camera.position.copy(sh.pos); this.camera.lookAt(sh.tgt); this.camera.fov = sh.fov; this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  private async *build(sheet: Promise<SheetSim>, breathe: () => Promise<void>) {
    const r = this.renderer;
    const envMap = makeEnvMap(r);
    const mats = makeMaterials(envMap);
    // Linear haze whose near and far follow the shot: the moment in front stays clear, the far side of the ring
    // sinks into the night, and the whole ring is clear again when seen from above.
    this.scene.fog = new Fog(new Color('#060811'), 7, 18);
    const reflScale = this.quality === 'high' ? 0.5 : this.quality === 'medium' ? 0.34 : 0.25;
    this.env = buildEnvironment({ reflW: innerWidth * reflScale, reflH: innerHeight * reflScale, dust: this.quality === 'low' ? 600 : 1400 });
    this.env.water.userData.reflScale = reflScale;
    this.scene.add(this.env.root, this.ring, this.key, this.key.target, this.moon, this.moon.target);
    yield 0.15; await breathe();

    // the dial the five moments hover above: the "one world"
    const dial = makeDial({
      angles: [0, 1, 2, 3, 4].map(phi), names: worlds.map((w) => w.title), env: envMap, px: this.quality === 'high' ? 2048 : 1024,
      colors: ['#e9ae62', '#b98ae8', '#78d0c4', '#79aef0', '#6fd2f2'],
    });
    this.ring.add(dial.group);
    this.ripple = makeRipple();
    this.ring.add(this.ripple.mesh);
    yield 0.3; await breathe();

    const ctx = { mats, quality: this.quality, sheet: await sheet };
    const builders = [hospitality, events, facilities, technical, recruitment];
    for (let k = 0; k < builders.length; k++) {
      this.tableaux.push(builders[k](ctx));
      yield 0.3 + 0.14 * (k + 1); await breathe();
    }
    this.tableaux.forEach((t, k) => {
      const f = phi(k);
      t.group.position.set(Math.cos(f) * R, TABLEAU_Y, Math.sin(f) * R);
      t.group.rotation.y = PHI0 - f;
      this.ring.add(t.group);
      t.group.updateMatrix();
      for (const l of t.lights ?? []) { l.position.applyMatrix4(t.group.matrix); this.ring.add(l); }
      // the lattice screen on this moment's right-hand side: folded into the dial while the ring is seen whole,
      // it rises as the camera comes down, so each moment is seen in its own room
      const s = this.env.makeScreen();
      s.rotation.y = -(f - Math.PI / 5);
      s.position.y = DIAL.y + DIAL.h / 2;
      this.ring.add(s);
      this.screens.push(s);
      // the name, standing behind the moment
      const wd = worlds[k];
      const two = wd.titleLines.length > 1;
      const word = makeWord(wd.titleLines.map((l) => l.toUpperCase()), { px: this.quality === 'low' ? 150 : 240, color: WORD_COLOR[wd.id], worldHeight: two ? 1.16 : 0.72 });
      // Behind the moment, centred on the frame (the camera looks a little left of the moment, so the moment sits
      // right of centre and overlaps the name, the way a cover sets its title behind its subject).
      word.mesh.position.set(-0.62, two ? 0.44 : 0.64, -1.95);
      t.group.add(word.mesh);
      this.words.push(word);
    });
    yield 0.95; await breathe();
    // Upload every texture now, a few per frame, rather than all at once on the first real frame.
    const textures = new Set<Texture>();
    this.scene.traverse((o) => {
      const m = (o as Mesh).material as unknown as Record<string, unknown> | undefined;
      if (!m) return;
      for (const v of Object.values(m)) if (v && (v as Texture).isTexture) textures.add(v as Texture);
      const u = (m.uniforms as Record<string, { value: unknown }> | undefined);
      if (u) for (const { value } of Object.values(u)) if (value && (value as Texture).isTexture) textures.add(value as Texture);
    });
    let n = 0;
    for (const t of textures) { this.renderer.initTexture(t); if (++n % 3 === 0) await breathe(); }
    yield 1;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(rect.width)); this.h = Math.max(1, Math.round(rect.height));
    this.portrait = this.w / this.h < 0.9;
    const cap = this.quality === 'high' ? 1.75 : this.quality === 'medium' ? 1.5 : 1;
    this.dpr = Math.min(devicePixelRatio || 1, cap, this.dprCeil);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    // Names: set behind the moment and a little left in a wide frame (the moment sits right of centre); centred,
    // smaller and higher in an upright one, where the moment sits in the upper middle and the copy below it.
    this.words.forEach((wd, k) => {
      const two = worlds[k].titleLines.length > 1;
      if (this.portrait) { wd.mesh.scale.setScalar(0.74); wd.mesh.position.set(0, two ? 1.08 : 1.2, -1.95); }
      else { wd.mesh.scale.setScalar(1); wd.mesh.position.set(-0.62, two ? 0.44 : 0.64, -1.95); }
    });
    // an upright frame sees higher: lift the lantern out of it (it hung behind the header as a bright dot)
    this.env.hub.group.position.y = this.portrait ? 6.4 : HUB_Y;
    this.applySize();
  }

  /** Buffers at the current size and pixel ratio (the governor lowers the ratio; a resize keeps what it chose). */
  private applySize() {
    this.dprCeil = Math.min(this.dprCeil, this.dpr);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.composer.setSize(this.w, this.h, false);
    this.drawn = false;
    const k = this.env.water.userData.reflScale as number;
    this.env.water.getRenderTarget().setSize(Math.round(this.w * this.dpr * k), Math.round(this.h * this.dpr * k));
    (this.env.stars.material as unknown as { uniforms: { uPx: { value: number } } }).uniforms.uPx.value = this.dpr;
    const ps = this.h * this.dpr * 0.012;
    (this.env.dust.material as unknown as { uniforms: { uScale: { value: number } } }).uniforms.uScale.value = ps;
    (this.tableaux[2].group.userData.pointScale as (s: number) => void)(ps);
  }

  // ── camera poses ───────────────────────────────────────────────────────────────────────────
  /** The camera for moment k, in the RING's frame (so it turns with the ring). */
  private sectorPoseRing(k: number): Pose {
    const f = phi(k);
    const out = new Vector3(Math.cos(f), 0, Math.sin(f));
    const right = new Vector3(Math.sin(f), 0, -Math.cos(f));
    const c = new Vector3(Math.cos(f) * R, TABLEAU_Y, Math.sin(f) * R);
    if (this.portrait) {
      return pose(c.clone().addScaledVector(out, 5.9).add(new Vector3(0, 0.05, 0)), c.clone().add(new Vector3(0, -0.52, 0)), 44);
    }
    return pose(
      c.clone().addScaledVector(out, 4.7).addScaledVector(right, -0.25).add(new Vector3(0, -0.1, 0)),
      c.clone().addScaledVector(right, -0.5).add(new Vector3(0, 0.04, 0)),
      30,
    );
  }
  private toWorld(p: Pose): Pose {
    return pose(p.pos.clone().applyAxisAngle(UP, this.ringAngle), p.tgt.clone().applyAxisAngle(UP, this.ringAngle), p.fov);
  }
  /** The ring angle at which the first moment faces the opening camera. */
  private frontAngle() {
    const o = this.overviewPose();
    return Math.atan2(o.pos.x, o.pos.z);
  }
  private overviewPose(title = false): Pose {
    // Upright: steeper and further back, so the whole dial fits the width with the headline beneath it.
    if (this.portrait) return title ? pose(new Vector3(0, 27, 13), new Vector3(0, 0.4, 0.4), 44) : pose(new Vector3(0, 29, 17), new Vector3(0, 0.2, 4.2), 44);
    return title ? pose(new Vector3(0, 15.5, 12.5), new Vector3(0, 0.8, 0), 34) : pose(new Vector3(-0.9, 17.4, 13.4), new Vector3(-2.0, 0.3, 0.3), 36);
  }

  private shot(p: number): Pose {
    const loc = locate(p);
    if (loc.rest) {
      this.exitDelta = null;
      if (loc.stop === 0) return this.overviewPose();
      if (loc.stop === TITLE_STOP) return this.overviewPose(true);
      return this.toWorld(this.sectorPoseRing(loc.stop - 1));
    }
    const leg = this.legs[loc.leg], t = loc.local;
    if (leg.kind === 'entry') {
      this.exitDelta = null;
      // aim for where the first moment WILL be when the ring stops, not where it is now
      const A = this.overviewPose();
      const end = this.spin ? this.spin.A + this.spin.D : this.ringAngle;
      const s = this.sectorPoseRing(0);
      const B = pose(s.pos.clone().applyAxisAngle(UP, end), s.tgt.clone().applyAxisAngle(UP, end), s.fov);
      const delta = wrapPi(Math.atan2(B.pos.x, B.pos.z) - Math.atan2(A.pos.x, A.pos.z));
      const e = camEase(t);
      // the aim settles on the moment well before the camera does, so the approach is toward it
      return orbitLerp(A, B, e, delta, { r: 0, h: 0.6 }, camEase(Math.min(1, t * 1.45)));
    }
    if (leg.kind === 'exit') {
      const A = this.toWorld(this.sectorPoseRing(4)), B = this.overviewPose(true);
      const raw = wrapPi(Math.atan2(B.pos.x, B.pos.z) - Math.atan2(A.pos.x, A.pos.z));
      this.exitDelta = this.exitDelta === null ? raw : this.exitDelta + wrapPi(raw - this.exitDelta);
      const e = camEase(t);
      return orbitLerp(A, B, e, this.exitDelta, { r: 0, h: 0.8 }, camEase(Math.min(1, t * 1.2)));
    }
    this.exitDelta = null;
    const from = loc.leg - 1;
    const A = this.toWorld(this.sectorPoseRing(from)), B = this.toWorld(this.sectorPoseRing(from + 1));
    const e = camEase(t);
    // atan2(x, z) grows with k, so the next moment is +72° around the ring: the camera tracks to its right.
    // Halfway round, the camera swings in through the lattice wall between the two moments, and turns to look
    // along its path as it does, so it meets the wall face-on and goes through it: that is the wipe.
    const sh = orbitLerp(A, B, e, TAU / 5, { r: this.portrait ? -2.6 : -2.4, h: 0.28 }, e);
    const w = Math.pow(Math.sin(Math.PI * e), 1.6) * 0.92;
    if (w > 1e-4) {
      const ang = Math.atan2(sh.pos.x, sh.pos.z) + 0.55, rr = Math.hypot(sh.pos.x, sh.pos.z) - 0.4;
      sh.tgt.lerp(new Vector3(Math.sin(ang) * rr, sh.pos.y - 0.15, Math.cos(ang) * rr), w);
    }
    return sh;
  }

  // ── the moments' clocks ───────────────────────────────────────────────────────────────────
  private actions(p: number): number[] {
    const a = [KEY, KEY, KEY, KEY, KEY];
    const loc = locate(p);
    if (loc.rest) return a;
    const leg = this.legs[loc.leg], t = loc.local;
    if (leg.kind === 'sector') {
      const from = loc.leg - 1, to = loc.leg;
      // time runs on in the moment we leave (hidden once the screen has passed), and the next one arrives in motion
      a[from] = t < 0.62 ? KEY + (1 - KEY) * sstep(0, 0.5, t) : KEY;
      a[to] = t < 0.4 ? START : START + (KEY - START) * easeOut((t - 0.4) / 0.6);
    } else if (leg.kind === 'entry') {
      a[0] = KEY;
    }
    return a;
  }

  private wordReveal(p: number, k: number): [number, 1 | -1] {
    const loc = locate(p);
    const stopOf = k + 1;
    if (loc.rest) return [loc.stop === stopOf ? 1 : 0, 1];
    const leg = this.legs[loc.leg], t = loc.local;
    if (leg.kind === 'entry') return k === 0 ? [sstep(0.58, 1, t), 1] : [0, 1];
    if (leg.kind === 'exit') return k === 4 ? [1 - sstep(0, 0.28, t), -1] : [0, 1];
    const from = loc.leg - 1, to = loc.leg;
    if (k === from) return [1 - sstep(0, 0.3, t), -1];
    if (k === to) return [sstep(0.62, 1, t), 1];
    return [0, 1];
  }

  // ── frame ──────────────────────────────────────────────────────────────────────────────────
  render(f: Frame) {
    const dt = f.dt;
    const loc = locate(f.p);
    const leg = this.legs[loc.leg];

    // The ring turns while the world is seen whole. On the dive it turns like a turntable presenting a dish: from
    // its idle pace it speeds up and eases to a stop with the first moment facing the camera, just as the camera
    // lands (so the camera's own path is always the same clean line down). On the way out it picks up again.
    if (!loc.rest && leg.kind === 'entry') {
      if (!this.spin) {
        const fromAbove = f.p > this.prevP || this.prevP <= 0;
        const sgn = Math.sign(OMEGA);
        if (fromAbove) {
          // keep turning the way it was turning, at least a little, to the next angle that faces the camera
          const A = this.ringAngle, front = this.frontAngle(), lead = A + sgn * 0.45;
          this.spin = { A, D: sgn * (0.45 + ((((front - lead) * sgn) % TAU) + TAU) % TAU) };
        } else this.spin = { A: this.ringAngle - sgn * 0.55, D: sgn * 0.55 };
      }
      // The turn is done by SPIN_END of the dive, so the first moment is in place (and in frame) for the approach.
      const t = Math.min(1, loc.local / SPIN_END), m0 = Math.min(3, (OMEGA * this.legs[0].seconds * SPIN_END) / this.spin.D);
      this.ringAngle = this.spin.A + this.spin.D * ((t * t * t - 2 * t * t + t) * m0 + (-2 * t * t * t + 3 * t * t));
    } else {
      this.spin = null;
      let rate = 0;
      if (loc.rest) rate = loc.stop === 0 || loc.stop === TITLE_STOP ? OMEGA : 0;
      else if (leg.kind === 'exit') rate = OMEGA * loc.local;
      this.ringAngle += rate * dt;
    }
    this.prevP = f.p;
    this.ring.rotation.y = this.ringAngle;

    // time: runs while anything moves, freezes on a moment
    const running = f.moving || (loc.rest && (loc.stop === 0 || loc.stop === TITLE_STOP));
    this.timeScale += ((running ? 1 : 0) - this.timeScale) * (1 - Math.exp(-dt / (running ? 0.18 : 0.42)));
    this.clock += dt * this.timeScale;
    if (this.wasMoving && !f.moving && loc.rest && loc.stop > 0 && loc.stop < TITLE_STOP) { this.freezePulse = 1; this.ripplePulse = 1; }
    this.wasMoving = f.moving;
    this.freezePulse = Math.max(0, this.freezePulse - dt / 0.9);
    this.ripplePulse = Math.max(0, this.ripplePulse - dt / 1.9);
    if (this.ripple) {
      const k = Math.max(0, loc.stop - 1), fk = phi(k);
      this.ripple.set(loc.rest && loc.stop > 0 && loc.stop < TITLE_STOP ? this.ripplePulse : 0, Math.cos(fk) * R, Math.sin(fk) * R, WORD_COLOR[worlds[Math.min(4, k)].id]);
    }

    // the moments: all of them when the ring is seen whole; otherwise only the one(s) the camera is with (the far
    // side's sparks and beams are light, which no haze hides; and what is not drawn costs nothing)
    const whole = loc.rest ? loc.stop === 0 || loc.stop === TITLE_STOP
      : leg.kind === 'entry' ? loc.local < 0.82 : leg.kind === 'exit' ? loc.local > 0.3 : false;
    this.tableaux.forEach((t, k) => {
      const mine = loc.rest ? k === loc.stop - 1 : leg.kind === 'entry' ? k === 0 : leg.kind === 'exit' ? k === 4 : k === loc.leg - 1 || k === loc.leg;
      t.group.visible = whole || mine;
    });
    const a = this.actions(f.p);
    this.tableaux.forEach((t, k) => {
      if (Math.abs(a[k] - this.lastA[k]) > 1e-5) { t.pose(a[k]); this.lastA[k] = a[k]; }
      const [rv, dir] = this.wordReveal(f.p, k);
      this.words[k].set(this.noWords ? 0 : rv, dir);
    });

    // the camera
    const sh = this.shot(f.p);
    const atMoment = loc.rest && loc.stop > 0 && loc.stop < TITLE_STOP;
    // (each settles exactly, so a still frame really is still and need not be drawn again)
    const settle = (v: number, to: number, tau: number) => { const n = v + (to - v) * (1 - Math.exp(-dt / tau)); return Math.abs(to - n) < 1e-4 ? to : n; };
    this.breath = settle(this.breath, atMoment ? 1 : 0, atMoment ? 3.5 : 0.4);
    const amp = atMoment ? 1 : 0.35;
    this.rig.x = settle(this.rig.x, (f.pointer.active ? f.pointer.x : 0) * amp, 0.45);
    this.rig.y = settle(this.rig.y, (f.pointer.active ? f.pointer.y : 0) * amp, 0.45);
    const off = sh.pos.clone().sub(sh.tgt);
    off.multiplyScalar(1 - 0.035 * this.breath);
    off.applyAxisAngle(UP, -this.rig.x * 0.16);
    const side = new Vector3().crossVectors(off, UP).normalize();
    off.applyAxisAngle(side, this.rig.y * 0.07);
    this.camera.position.copy(sh.tgt).add(off);
    this.camera.lookAt(sh.tgt);
    if (Math.abs(this.camera.fov - sh.fov) > 1e-3) { this.camera.fov = sh.fov; this.camera.updateProjectionMatrix(); }
    this.camera.updateMatrixWorld();

    // lights follow the focus
    const focus = this.focus(f.p);
    const fa = this.focusAmount(f.p);
    // One follow spot, carried from moment to moment (weighted by focus), and a cool moonlight for the ring seen
    // whole, which fades as the camera comes down.
    let wsum = 0, inten = 0, ang = 0, pen = 0;
    const kp = this.kPos.set(0, 0, 0), kt = this.kTgt.set(0, 0, 0), kc = this.kCol.setRGB(0, 0, 0);
    this.tableaux.forEach((t, k) => {
      const w = focus[k];
      if (w <= 0) return;
      wsum += w;
      kp.addScaledVector(t.group.localToWorld(this.tmpV.copy(t.key.pos)), w);
      kt.addScaledVector(t.group.localToWorld(this.tmpV.copy(t.key.target)), w);
      kc.r += t.key.color.r * w; kc.g += t.key.color.g * w; kc.b += t.key.color.b * w;
      inten += t.key.intensity * w; ang += t.key.angle * w; pen += t.key.penumbra * w;
    });
    if (wsum > 0) {
      this.key.position.copy(kp.divideScalar(wsum)); this.key.target.position.copy(kt.divideScalar(wsum));
      this.key.color.copy(kc.multiplyScalar(1 / wsum)); this.key.angle = ang / wsum; this.key.penumbra = pen / wsum;
      this.key.intensity = (inten / wsum) * fa;
    } else this.key.intensity = 0;
    this.key.target.updateMatrixWorld();
    this.moon.intensity = 1.6 * (1 - fa);

    // time held under the pointer: frozen particles near it drift a little way along their paths
    const lensTarget = atMoment && !f.moving && f.pointer.active ? 0.55 : 0;
    this.lensAmt += (lensTarget - this.lensAmt) * (1 - Math.exp(-dt / 0.5));
    if (atMoment && this.lensAmt > 0.001) {
      const k = loc.stop - 1;
      const tg = this.tableaux[k].group;
      const c = tg.getWorldPosition(new Vector3());
      this.plane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new Vector3()).negate(), c);
      this.ray.setFromCamera(new Vector2(f.pointer.x, f.pointer.y), this.camera);
      const got = this.ray.ray.intersectPlane(this.plane, this.hit);
      this.tableaux[k].lens?.(got ? this.hit : null, this.lensAmt * (0.8 + 0.2 * Math.sin(this.clock * 2)));
      this.lastA[k] = -1; // re-pose next frame so the lens is applied
    }

    // the haze follows the shot: clear to just beyond the moment, gone by the far side of the ring
    const fog = this.scene.fog as Fog;
    fog.near = mix(19, 6.2, fa); fog.far = mix(46, 17, fa);
    // the screens rise out of the dial as the camera comes down (a little ahead of it, so they frame the arrival)
    const rise = sstep(0.05, 0.75, fa);
    for (const s of this.screens) { s.scale.y = Math.max(0.001, rise); s.visible = rise > 0.002; }

    // the environment's clocks
    const env = this.env;
    (env.water.material as unknown as { uniforms: Record<string, { value: unknown }> }).uniforms.uTime.value = this.clock;
    ((env.water.material as unknown as { uniforms: Record<string, { value: Vector3 }> }).uniforms.uCam.value).copy(this.camera.position);
    (env.dust.material as unknown as { uniforms: Record<string, { value: number }> }).uniforms.uTime.value = this.clock;
    (env.stars.material as unknown as { uniforms: Record<string, { value: number }> }).uniforms.uTime.value = this.clock;
    // the lantern carries the whole ring when it is seen from above, and steps back behind a single moment
    env.hub.light.intensity = mix(52, 34, fa) + 4 * Math.sin(this.clock * 1.7);
    const glow = mix(5, 3.2, fa);
    (env.hub.core.material as unknown as { color: Color }).color.setRGB(1.0 * glow, 0.64 * glow, 0.32 * glow);
    env.hub.halo.quaternion.copy(this.camera.quaternion);
    const hv = (this.tableaux[2].group.userData.hubView as { value: Vector3 });
    hv.value.copy(env.hub.group.position).applyMatrix4(this.camera.matrixWorldInverse);

    // grade: a breath of chromatic fringe when time stops
    this.chroma.offset.set(0.0005 + 0.0022 * this.freezePulse, 0.0004 + 0.0016 * this.freezePulse);
    this.bloom.intensity = 1.15 + 0.25 * this.freezePulse;

    // A frozen moment that nobody is moving around is not drawn again: the canvas keeps its last frame (a laptop
    // on battery, a phone in a hand).
    const e = this.camera.matrixWorld.elements;
    if (this.drawn && !f.moving && this.timeScale < 0.002 && this.lensAmt < 0.002 && this.freezePulse === 0 && this.ripplePulse === 0) {
      let same = true;
      for (let i = 0; i < 16; i++) if (Math.abs(e[i] - this.lastCam[i]) > 1e-5) { same = false; break; }
      if (same) return;
    }
    this.lastCam.set(e);
    this.composer.render(dt);
    this.drawn = true;
    this.govern(dt);
  }

  /**
   * Keeps the frame rate: if frames run long for a couple of seconds, the resolution steps down (never below 0.7 of
   * a CSS pixel). It only ever steps down, so it cannot oscillate.
   */
  private govern(dt: number) {
    if (dt <= 0) return;
    this.times.push(dt * 1000);
    if (this.times.length < 120) return;
    const sorted = this.times.sort((a, b) => a - b), med = sorted[sorted.length >> 1];
    this.times = [];
    if (med > 23 && this.dpr > 0.72) {
      this.dpr = Math.max(0.7, this.dpr * 0.84);
      this.applySize();
    }
  }

  /** 0 when the ring is seen whole, 1 when the camera is at a moment. */
  private focusAmount(p: number) {
    const loc = locate(p);
    if (loc.rest) return loc.stop === 0 || loc.stop === TITLE_STOP ? 0 : 1;
    const leg = this.legs[loc.leg];
    if (leg.kind === 'entry') return camEase(loc.local);
    if (leg.kind === 'exit') return 1 - camEase(loc.local);
    return 1;
  }

  /** How much each moment is "the one we are looking at" (0..1). */
  private focus(p: number) {
    const loc = locate(p);
    const out = [0, 0, 0, 0, 0];
    if (loc.rest) {
      if (loc.stop === 0 || loc.stop === TITLE_STOP) return out.map(() => 0.55);
      out[loc.stop - 1] = 1; return out;
    }
    const leg = this.legs[loc.leg], t = loc.local;
    if (leg.kind === 'entry') { out.fill(0.55 * (1 - t)); out[0] = mix(0.55, 1, t); return out; }
    if (leg.kind === 'exit') { out.fill(0.55 * t); out[4] = mix(1, 0.55, t); return out; }
    out[loc.leg - 1] = 1 - clamp01(t * 1.4); out[loc.leg] = clamp01(t * 1.4 - 0.4);
    return out;
  }

  dispose() {
    this.composer.dispose();
    this.renderer.dispose();
    this.scene.traverse((o) => { const m = o as Mesh; if (m.isMesh) { m.geometry.dispose(); } });
  }
}
