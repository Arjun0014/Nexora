/**
 * The hero world, version 5: a living mashrabiya in the Doha sun, and behind it five moments of work held in time.
 * See docs/redesign/05-HERO-V5.md.
 *
 * Everything drawn is a pure function of the playhead `p` (../timeline.ts) plus the pointer:
 *
 *   stop 0         the screen, shut and carved; a circle of it open — the one world — onto the first moment.
 *                  The pointer is a lens: wherever you look, the screen opens a little onto what is behind it.
 *   leg 0          the circle opens and becomes an arch: the first world's window
 *   stops 1…5      a world, held: seen through an arch in the screen; the pointer leans round the frozen moment
 *   legs 1…4       time runs: the arch shuts like an iris, the screen slides on by one bay, it opens on the next
 *   leg 5 / stop 6 the arch shuts; the NEXORA title card closes over the screen (../mask.ts, unchanged)
 *
 * One fragment shader draws it (./shader.ts). The layout of the opening is published to CSS as custom properties on
 * the hero, so the DOM copy is set against the arch exactly (no guessing in CSS what the canvas drew).
 */
import {
  BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color, GLSL3, LinearFilter, LinearMipmapLinearFilter, Mesh,
  NoToneMapping, OrthographicCamera, RawShaderMaterial, RepeatWrapping, Scene, SRGBColorSpace, TextureLoader,
  Vector2, Vector3, Vector4, WebGLRenderer, type Texture,
} from 'three';
import { SCREEN_FRAG, SCREEN_VERT } from './shader';
import { locate, TITLE_STOP, buildLegs } from '../timeline';
import { worlds } from '../../../data/worlds';
import wordmark from '../../../data/wordmark.json';

export type Quality = 'high' | 'medium' | 'low';
export interface Frame {
  p: number;
  moving: boolean;
  dt: number;
  /** pointer in NDC (-1..1), and whether it is over the stage */
  pointer: { x: number; y: number; active: boolean };
}

const WORLDS = worlds.map((w) => w.id); // the order of the film (and of public/media/hero5)
const SUN = new Vector3(0.55, 0.52, -0.66).normalize();
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the opening sits, in CSS px and in shader units (h: fractions of the viewport height, centred, y up). */
export interface Layout {
  portrait: boolean;
  arch: { x: number; y: number; w: number; h: number };  // CSS px, centre + size
  circle: { x: number; y: number; r: number };            // CSS px
  bay: number;                                            // h: how far the screen slides between worlds
}

export class World {
  readonly timings: Record<string, number> = {};
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: RawShaderMaterial;
  private u: Record<string, { value: unknown }>;
  private photos: Texture[] = [];
  private depths: Texture[] = [];
  private rooms: Color[] = [];
  private aspects: number[] = [];
  private legs = buildLegs();
  private w = 1; private h = 1; private dpr = 1;
  private layout!: Layout;
  private archHome = new Vector2();
  private quality: Quality;
  // continuous state
  private lens = new Vector2(9, 9);
  private lensAmt = 0;
  private lean = new Vector2();
  private camOff = new Vector2();
  private clock = 0;
  private drawn = false;
  private times: number[] = [];
  private dprCeil = Infinity;

  private constructor(private canvas: HTMLCanvasElement, quality: Quality, private root: HTMLElement | null) {
    this.quality = quality;
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.setClearColor(new Color('#e9e1d3'), 1);
    this.u = {
      uRes: { value: new Vector2(1, 1) }, uTime: { value: 0 },
      uCell: { value: 0.052 }, uThick: { value: 0.014 }, uDepth: { value: 0.12 },
      uCam: { value: new Vector3(0, 0, 2.4) }, uSun: { value: SUN.clone() },
      uSunCol: { value: new Color('#fff0dc').multiplyScalar(1.5) }, uSkyCol: { value: new Color('#d3dde1') },
      uStone: { value: new Color('#f1ebe1') }, uScroll: { value: 0 },
      uCircle: { value: new Vector4() }, uArch: { value: new Vector4() }, uArchB: { value: new Vector2(9, 9) }, uMorph: { value: 0 }, uIris: { value: 1 },
      uRim: { value: 0.12 }, uOpen: { value: 1 }, uOpenB: { value: 0 }, uLens: { value: new Vector3(9, 9, 0.13) }, uLensAmt: { value: 0 },
      uBase: { value: 0 },
      tWorld: { value: null }, tDepthMap: { value: null }, uWorldRect: { value: new Vector4(0, 0, 1, 1) }, uRoom: { value: new Color() },
      uLean: { value: new Vector2() }, uPush: { value: 0 }, uWorldLit: { value: 1 },
      tWorld2: { value: null }, tDepthMap2: { value: null }, uWorldRect2: { value: new Vector4(0, 0, 1, 1) }, uRoom2: { value: new Color() },
      uWorldMix: { value: 0 },
      tStrip: { value: null }, uStripMix: { value: 0 }, uStripSeams: { value: new Vector4() }, uStripBox: { value: new Vector4() },
      tPlaster: { value: null }, tPlasterN: { value: null }, uPlasterScale: { value: 2.2 },
      uPlasterAvg: { value: new Color().setRGB(0.271, 0.245, 0.197) }, uExposure: { value: 1.02 }, uGrain: { value: 0.02 }, uPatches: { value: 1 },
    };
    this.mat = new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: SCREEN_VERT, fragmentShader: SCREEN_FRAG, uniforms: this.u, depthTest: false, depthWrite: false });
    const tri = new BufferGeometry();
    tri.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const mesh = new Mesh(tri, this.mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  static async create(canvas: HTMLCanvasElement, quality: Quality, onProgress: (f: number) => void = () => {}) {
    const root = canvas.closest<HTMLElement>('[data-hero]');
    const world = new World(canvas, quality, root);
    let t = performance.now();
    const lap = (k: string) => { const n = performance.now(); world.timings[k] = Math.round(n - t); t = n; };
    const loader = new TextureLoader();
    const size = quality === 'low' ? 900 : 1400;
    const jobs: Promise<unknown>[] = [];
    let done = 0;
    const total = WORLDS.length * 2 + 2;
    const tick = () => onProgress(0.05 + 0.85 * (++done / total));
    const load = (url: string, srgb: boolean, repeat = false) => loader.loadAsync(url).then((tex) => {
      if (srgb) tex.colorSpace = SRGBColorSpace;
      tex.wrapS = tex.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
      tex.minFilter = LinearMipmapLinearFilter; tex.magFilter = LinearFilter;
      tex.anisotropy = 4;
      tick();
      return tex;
    });
    WORLDS.forEach((id, k) => {
      jobs.push(load(`/media/hero5/${id}-${size}.webp`, true).then((tex) => {
        world.photos[k] = tex;
        const img = tex.image as HTMLImageElement;
        world.aspects[k] = img.width / img.height;
        world.rooms[k] = roomColour(img);
      }));
      jobs.push(load(`/media/hero5/${id}-depth.webp`, false).then((tex) => { world.depths[k] = tex; }));
    });
    jobs.push(load('/media/textures/screen-plaster.webp', true, true).then((tex) => { world.u.tPlaster.value = tex; }));
    jobs.push(load('/media/textures/screen-plaster-n.webp', false, true).then((tex) => { world.u.tPlasterN.value = tex; }));
    await Promise.all(jobs);
    world.u.tStrip.value = stripAtlas(world.photos.map((t) => t.image as HTMLImageElement));
    lap('textures');
    world.resize();
    // compile and upload everything before the intro lets go
    world.renderer.compile(world.scene, world.cam);
    for (const tex of [...world.photos, ...world.depths]) world.renderer.initTexture(tex);
    world.render({ p: 0, moving: false, dt: 0, pointer: { x: 0, y: 0, active: false } });
    lap('first-frame');
    onProgress(1);
    return world;
  }

  /** The opening's geometry for this viewport, and the CSS properties that let the copy line up with it. */
  private computeLayout(): Layout {
    const W = this.w, H = this.h;
    const portrait = W / H < 1.05;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) * 16 || 76;
    const margin = Math.max(20, Math.min(64, W * 0.036));
    if (portrait) {
      const top = header + H * 0.02;
      const w = W - margin * 2;
      // the words need about 45% of the height under the window, whatever the phone; the arch stays upright (a wide
      // tablet does not get a squat dome), the circle may use the full width
      const h = Math.min(H * 0.41, w * 1.16);
      const aw = Math.min(w, h * 0.9);
      const arch = { x: W / 2, y: top + h / 2, w: aw, h };
      return { portrait, arch, circle: { x: W / 2, y: arch.y + h * 0.03, r: Math.min(w * 0.46, h * 0.5) }, bay: (W * 0.8) / H };
    }
    const top = header + H * 0.04;
    const bottom = H * 0.94;
    const h = bottom - top;
    const w = Math.min(h * 0.8, W * 0.46);
    const right = W - margin - W * 0.035;
    const arch = { x: right - w / 2, y: top + h / 2, w, h };
    const circle = { x: arch.x, y: arch.y + h * 0.02, r: Math.min(w * 0.6, h * 0.42) };
    return { portrait, arch, circle, bay: (W * 0.72) / H };
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
    const cap = this.quality === 'high' ? 1.5 : this.quality === 'medium' ? 1.25 : 1;
    this.dpr = Math.min(devicePixelRatio || 1, cap, this.dprCeil);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.w, this.h, false);
    (this.u.uRes.value as Vector2).set(this.w * this.dpr, this.h * this.dpr);
    this.layout = this.computeLayout();
    const L = this.layout;
    // lattice pitch: a comfortable star size on every screen (about 44 CSS px on a laptop)
    this.u.uCell.value = Math.max(34, Math.min(52, this.h * 0.05)) / this.h;
    this.u.uRim.value = (L.portrait ? 0.09 : 0.11);
    const toH = (x: number, y: number) => new Vector2((x - this.w / 2) / this.h, (this.h / 2 - y) / this.h);
    const c = toH(L.circle.x, L.circle.y), a = toH(L.arch.x, L.arch.y);
    (this.u.uCircle.value as Vector4).set(c.x, c.y, L.circle.r / this.h, 0);
    (this.u.uArch.value as Vector4).set(a.x, a.y, L.arch.w / 2 / this.h, L.arch.h / 2 / this.h);
    this.archHome.set(a.x, a.y);
    // the title card's word (as ../mask.ts sets it) and the gaps between its letters
    {
      const ww = this.w * 0.88, k = ww / wordmark.width, wh = wordmark.height * k;
      const left = (this.w - ww) / 2, cy = this.h * (this.w / this.h < 1 ? 0.34 : 0.42);
      const hx = (x: number) => (x - this.w / 2) / this.h, hy = (y: number) => (this.h / 2 - y) / this.h;
      const g = LETTER_GAPS.map((u) => hx(left + u * k));
      (this.u.uStripSeams.value as Vector4).set(g[0], g[1], g[2], g[3]);
      (this.u.uStripBox.value as Vector4).set(hx(left), hx(left + ww), hy(cy + wh / 2), hy(cy - wh / 2));
    }
    if (this.root) {
      const s = this.root.style;
      s.setProperty('--arch-x', `${Math.round(L.arch.x)}px`); s.setProperty('--arch-y', `${Math.round(L.arch.y)}px`);
      s.setProperty('--arch-w', `${Math.round(L.arch.w)}px`); s.setProperty('--arch-h', `${Math.round(L.arch.h)}px`);
      s.setProperty('--arch-top', `${Math.round(L.arch.y - L.arch.h / 2)}px`); s.setProperty('--arch-bottom', `${Math.round(L.arch.y + L.arch.h / 2)}px`);
      s.setProperty('--arch-left', `${Math.round(L.arch.x - L.arch.w / 2)}px`);
      s.setProperty('--circle-x', `${Math.round(L.circle.x)}px`); s.setProperty('--circle-y', `${Math.round(L.circle.y)}px`); s.setProperty('--circle-r', `${Math.round(L.circle.r)}px`);
      this.root.dataset.layout = L.portrait ? 'portrait' : 'landscape';
    }
    this.drawn = false;
  }

  /** The photograph's rectangle (h units): it covers the arch with room to lean, centred on it. */
  private rectFor(k: number, dx = 0) {
    const L = this.layout;
    const aw = L.arch.w / this.h, ah = L.arch.h / this.h;
    const ia = this.aspects[k] || 1.25;
    let rh = ah * 1.1, rw = rh * ia;
    if (rw < aw * 1.1) { rw = aw * 1.1; rh = rw / ia; }
    return new Vector4(this.archHome.x + dx, this.archHome.y, rw, rh);
  }

  private setWorld(k: number, slot: 1 | 2, dx = 0) {
    const i = Math.max(0, Math.min(WORLDS.length - 1, k));
    if (slot === 1) {
      this.u.tWorld.value = this.photos[i]; this.u.tDepthMap.value = this.depths[i];
      (this.u.uWorldRect.value as Vector4).copy(this.rectFor(i, dx)); (this.u.uRoom.value as Color).copy(this.rooms[i]);
    } else {
      this.u.tWorld2.value = this.photos[i]; this.u.tDepthMap2.value = this.depths[i];
      (this.u.uWorldRect2.value as Vector4).copy(this.rectFor(i, dx)); (this.u.uRoom2.value as Color).copy(this.rooms[i]);
    }
  }

  /** The choreography: every uniform that depends on the playhead. */
  private stage(p: number) {
    const loc = locate(p);
    const u = this.u;
    const bay = this.layout.bay;
    let morph = 1, iris = 1, open = 1.36, openB = 0, slide = 0, push = 0, lit = 0.55, base = 0, strip = 0;
    let worldA = 0, worldB = 1, scroll = 0;
    if (loc.rest) {
      const s = loc.stop;
      if (s === 0) { morph = 0; open = 1.2; lit = 1; worldA = 0; }
      else if (s === TITLE_STOP) { iris = 0; open = 0; worldA = 4; scroll = 5 * bay; base = 1.5; strip = 1; lit = 0; }
      else { worldA = s - 1; scroll = (s - 1) * bay; }
    } else {
      const t = loc.local, leg = this.legs[loc.leg];
      if (leg.kind === 'entry') {
        morph = easeIO(ss(0.08, 0.78, t));
        open = mix(1.2, 1.36, ss(0.3, 0.92, t));
        lit = mix(1, 0.55, ss(0.3, 0.9, t));
        push = 0.03 * (1 - easeOut(t));
      } else if (leg.kind === 'exit') {
        worldA = 4;
        slide = 0.35 * bay * easeIn(ss(0, 0.6, t));
        scroll = 4 * bay + slide;
        open = mix(1.36, 0, ss(0, 0.38, t));
        push = 0.04 * ss(0, 0.5, t);
        // as the word closes in, the whole screen opens behind it onto all five moments at once
        strip = t > 0.32 ? 1 : 0;
        base = 1.5 * ss(0.34, 0.86, t);
        lit = 0.55 * (1 - ss(0.34, 0.86, t));
      } else {
        // the camera walks along the screen by one bay: the window you were at leaves to the left, its stars
        // closing; the wall passes; the next window arrives from the right, its stars opening as it comes to rest
        const from = loc.leg - 1;
        worldA = from; worldB = from + 1;
        slide = bay * easeIO(ss(0.08, 0.92, t));
        scroll = from * bay + slide;
        // passing, a window is not quite shut: the world glints through its smallest stars, then it closes altogether
        open = mix(1.36, 0.22, ss(0.0, 0.3, t)) * (1 - ss(0.3, 0.55, t));
        openB = mix(0.22, 1.36, ss(0.62, 1.0, t)) * ss(0.4, 0.55, t);
        push = 0.03 * ss(0, 0.4, t);
      }
    }
    // windows travel with the screen; what is behind them, further off, travels a little less
    const ax = this.archHome.x - slide;
    (u.uArch.value as Vector4).x = ax;
    (u.uArchB.value as Vector2).set(ax + bay, this.archHome.y);
    u.uMorph.value = morph; u.uIris.value = Math.max(0, iris); u.uOpen.value = open; u.uOpenB.value = openB;
    u.uScroll.value = scroll; u.uPush.value = push; u.uWorldLit.value = lit; u.uBase.value = base; u.uStripMix.value = strip;
    this.setWorld(worldA, 1, -slide * 0.86);
    if (openB > 0) this.setWorld(worldB, 2, bay - slide * 0.86);
    return loc;
  }

  render(f: Frame) {
    const dt = Math.min(0.1, f.dt);
    const loc = this.stage(f.p);
    const atRest = loc.rest && loc.stop < TITLE_STOP;
    const atOverview = loc.rest && loc.stop === 0;
    // pointer: in h units
    const px = (f.pointer.x * this.w) / 2 / this.h, py = (f.pointer.y * this.h) / 2 / this.h;
    const ease = (v: number, to: number, tau: number) => { const n = v + (to - v) * (1 - Math.exp(-dt / tau)); return Math.abs(to - n) < 1e-4 ? to : n; };
    const lensTo = f.pointer.active && atOverview ? 0.95 : 0;
    this.lensAmt = ease(this.lensAmt, lensTo, lensTo > this.lensAmt ? 0.35 : 0.25);
    if (f.pointer.active) { this.lens.x = ease(this.lens.x, px, 0.12); this.lens.y = ease(this.lens.y, py, 0.12); }
    (this.u.uLens.value as Vector3).set(this.lens.x, this.lens.y, this.layout.portrait ? 0.1 : 0.13);
    this.u.uLensAmt.value = this.lensAmt;
    // leaning round the frozen moment (and the screen's apertures show their walls as the eye moves)
    const lx = f.pointer.active && atRest ? f.pointer.x : 0, ly = f.pointer.active && atRest ? f.pointer.y : 0;
    this.lean.x = ease(this.lean.x, -lx * 0.016, 0.5); this.lean.y = ease(this.lean.y, -ly * 0.012, 0.5);
    (this.u.uLean.value as Vector2).copy(this.lean);
    this.camOff.x = ease(this.camOff.x, lx * 0.28 - 0.18, 0.6); this.camOff.y = ease(this.camOff.y, ly * 0.16 + 0.08, 0.6);
    (this.u.uCam.value as Vector3).set(this.camOff.x, this.camOff.y, 2.4);
    // time runs while the film moves, and on the first screen (the sun crosses the stone); it holds at a moment
    const ambient = atOverview;
    if (f.moving || ambient) this.clock += dt;
    this.u.uTime.value = this.clock;

    // a held frame that nobody is moving is not drawn again; the first screen's slow sun is drawn at 20 fps when idle
    const sig = `${f.p}|${this.lensAmt.toFixed(4)}|${this.lens.x.toFixed(4)}|${this.lens.y.toFixed(4)}|${this.lean.x.toFixed(5)}|${this.lean.y.toFixed(5)}|${this.camOff.x.toFixed(4)}|${this.camOff.y.toFixed(4)}`;
    if (this.drawn && !f.moving && sig === this.sig) {
      if (!ambient) return;
      this.idle += dt;
      if (this.idle < 0.05) return;
      this.idle = 0;
    }
    this.sig = sig;
    this.renderer.render(this.scene, this.cam);
    this.drawn = true;
    this.govern(dt);
  }
  private sig = '';
  private idle = 0;

  /** Steps the resolution down if frames run long (never below 0.75 of a CSS pixel); only ever down. */
  private govern(dt: number) {
    if (dt <= 0) return;
    this.times.push(dt * 1000);
    if (this.times.length < 90) return;
    const sorted = this.times.sort((a, b) => a - b), med = sorted[sorted.length >> 1];
    this.times = [];
    if (med > 22 && this.dpr > 0.8) { this.dprCeil = this.dpr = Math.max(0.75, this.dpr * 0.85); this.resize(); }
  }

  dispose() {
    this.mat.dispose();
    this.renderer.dispose();
  }
}

/** The average colour of a photograph, darkened: the room beyond its edges. */
function roomColour(img: HTMLImageElement) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, 8, 8);
  const d = g.getImageData(0, 0, 8, 8).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return new Color(`rgb(${Math.round(r / n * 0.55)}, ${Math.round(gg / n * 0.55)}, ${Math.round(b / n * 0.55)})`);
}

/** The five photographs as one row of panels, for the title card. */
function stripAtlas(imgs: HTMLImageElement[]) {
  const pw = 450, ph = 500;
  const c = document.createElement('canvas');
  c.width = pw * imgs.length; c.height = ph;
  const g = c.getContext('2d')!;
  imgs.forEach((img, k) => g.drawImage(img, k * pw, 0, pw, ph));
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter;
  return t;
}

/**
 * Where the gaps between the letters of NEXORA fall, in wordmark units: each letter is the union of the sub-paths whose
 * horizontal extents overlap (an O's counter sits inside its bowl). Four gaps: N|E, E|X, X|O, O|R (R and A share a panel).
 */
const LETTER_GAPS = (() => {
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
  return [gaps[0], gaps[1], gaps[2], gaps[3]].map((g, i) => g ?? ((i + 1) * wordmark.width) / 5);
})();
