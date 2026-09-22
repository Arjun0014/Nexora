/**
 * Scene 9 — for employers (src/components/scenes/Employers.astro). One scrubbed progress q over the pinned stage:
 *   0.00 → 0.12  window   the photograph grows from a small centred window to the whole stage (ERA)
 *   0.12 → 0.20  column   it narrows into the left column; the ground turns sky; the playbook fades up
 *   0.20 → 0.96  play     four steps. A step change PLAYS: the new picture slides in behind six blinds, one after
 *                         another; the title's lines rise out of their masks; the numeral turns over.
 * The filmstrip on the right rises continuously with the scroll (Love & Money).
 */
import { $, $$, clamp, lerp, whenNear } from '../core/env';
import { gsap, ScrollTrigger, SplitText, EASE, DUR } from '../core/motion';

const GROW = 0.12, COL = 0.2, PLAY_END = 0.96;

export function initEmployers() {
  const root = $('[data-emp]');
  if (!root || !document.documentElement.classList.contains('motion')) return;
  const stage = $('[data-emp-stage]', root)!;
  const photo = $('[data-emp-photo]', root)!;
  const pics = $$('[data-emp-pic]', root);
  const steps = $$('[data-emp-step]', root);
  const nEl = $('[data-emp-n]', root)!;
  const reel = $('[data-emp-reel]', root)!;
  whenNear(root, () => { $$<HTMLImageElement>('img', photo).forEach((i) => { i.loading = 'eager'; }); });

  const splits = steps.map((s) => new SplitText($('.emp__t', s)!, { type: 'lines', linesClass: 'line', mask: 'lines' }));

  let step = -1;
  const show = (next: number) => {
    if (next === step) return;
    const prev = step, dir = next > prev ? 1 : -1;
    step = next;
    pics.forEach((p, i) => { p.style.zIndex = i === next ? '2' : i === prev ? '1' : '0'; });
    if (next >= 0) {
      pics[next].setAttribute('data-on', '');
      gsap.fromTo($$('.emp__blind', pics[next]), { xPercent: -102 * dir }, { xPercent: 0, duration: DUR.l, ease: EASE.inOut, stagger: 0.06, overwrite: true,
        onComplete: () => pics.forEach((p, i) => { if (i !== step) p.removeAttribute('data-on'); }) });
    } else pics.forEach((p) => p.removeAttribute('data-on'));

    const k = Math.max(0, next);
    steps.forEach((s, i) => s.toggleAttribute('data-on', i === k));
    gsap.fromTo(splits[k].lines, { yPercent: 110 * dir }, { yPercent: 0, duration: DUR.l, ease: EASE.out, stagger: 0.08, overwrite: true });
    gsap.fromTo([$('.emp__num', steps[k]), $('.emp__body', steps[k])], { opacity: 0, y: 30 * dir }, { opacity: 1, y: 0, duration: DUR.l, ease: EASE.out, stagger: 0.1, overwrite: true });
    nEl.textContent = String(k + 1).padStart(2, '0');
  };

  const render = (q: number) => {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const narrow = sw < 900 && sh >= sw; // the phone layout is for upright screens; a phone on its side keeps the column
    const small = { x: sw * 0.5 - sw * 0.13, y: sh * 0.22, w: sw * 0.26, h: sw * 0.26 * 0.66 };
    const full = { x: 0, y: 0, w: sw, h: sh };
    const col = narrow ? { x: 0, y: 0, w: sw, h: sh * 0.34 } : { x: 0, y: 0, w: sw * 0.38, h: sh };
    const g = EASE.inOut(clamp(q / GROW));
    const c = EASE.inOut(clamp((q - GROW) / (COL - GROW)));
    const box = (k: 'x' | 'y' | 'w' | 'h') => lerp(lerp(small[k], full[k], g), col[k], c);
    Object.assign(photo.style, { left: `${box('x')}px`, top: `${box('y')}px`, width: `${box('w')}px`, height: `${box('h')}px`, borderRadius: `${(1 - g) * 4}px` });
    stage.style.setProperty('--sky-o', c.toFixed(3));
    stage.style.setProperty('--play', clamp((q - GROW - 0.03) / 0.06).toFixed(3));
    reel.style.transform = `translate3d(0, ${(-q * (reel.scrollHeight / 2 - sh * 0.2)).toFixed(1)}px, 0)`;
    const pq = (q - COL) / (PLAY_END - COL);
    show(pq < 0 ? -1 : Math.min(steps.length - 1, Math.floor(pq * steps.length)));
  };

  ScrollTrigger.create({
    trigger: root, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => render(self.progress),
  });
  // Before the pin engages, the window sits small at the foot of the limestone as the stage scrolls in.
  render(0);
}
