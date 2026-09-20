/** Capability and preference checks shared by every behaviour module. */
const root = document.documentElement;

export const env = {
  /** Set pre-paint by the inline script in Base.astro. */
  get motion() { return root.classList.contains('motion'); },
  get cinema() { return root.classList.contains('cinema'); },
  get finePointer() { return matchMedia('(hover: hover) and (pointer: fine)').matches; },
  get portrait() { return innerWidth / Math.max(1, innerHeight) < 1; },
  /** Phones and small tablets: used only to decide how aggressively to release decoded frames. */
  get smallScreen() { return Math.min(screen.width, screen.height) < 820; },
};

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number) => { const t = invLerp(a, b, v); return t * t * (3 - 2 * t); };
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => scope.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(sel));
