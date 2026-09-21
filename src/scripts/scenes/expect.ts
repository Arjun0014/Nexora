/**
 * Scene 8 — what to expect (src/components/scenes/Expect.astro).
 * Each line of the poem turns in when it reaches 85% of the viewport: letters rise half a line and turn from 90°
 * on Y, staggered (ERA's animateTextH). Its footnote follows. Hover/focus lights a line and its footnote and
 * dims the rest. Clouds drift at the edges on their own parallax.
 */
import { $, $$ } from '../core/env';
import { gsap, ScrollTrigger, SplitText, EASE, DUR } from '../core/motion';

export function initExpect() {
  const root = $('[data-exp]');
  if (!root) return;
  const lines = $$('[data-exp-line]', root);
  const notes = $$('[data-exp-note]', root);

  const light = (i: number | null) => {
    root.toggleAttribute('data-hover', i !== null);
    lines.forEach((l, k) => l.toggleAttribute('data-on', k === i));
    notes.forEach((n, k) => n.toggleAttribute('data-on', k === i));
  };
  lines.forEach((l, i) => {
    l.addEventListener('pointerenter', () => light(i));
    l.addEventListener('pointerleave', () => light(null));
    l.addEventListener('focus', () => light(i));
    l.addEventListener('blur', () => light(null));
  });

  if (!document.documentElement.classList.contains('motion')) return;

  lines.forEach((l, i) => {
    const text = $('[data-exp-text]', l)!;
    const split = new SplitText(text, { type: 'words,chars', wordsClass: 'word', charsClass: 'char' });
    gsap.set(split.chars, { opacity: 0, yPercent: 50, rotateY: 90 });
    gsap.set(notes[i], { opacity: 0, y: 24 });
    ScrollTrigger.create({
      trigger: l, start: 'top 86%', once: true,
      onEnter: () => {
        gsap.to(split.chars, { opacity: 1, yPercent: 0, rotateY: 0, duration: DUR.l, ease: EASE.out, stagger: 0.022 });
        gsap.to(notes[i], { opacity: 1, y: 0, duration: DUR.l, ease: EASE.out, delay: 0.25 });
      },
    });
  });

  $$<HTMLElement>('[data-exp-cloud]', root).forEach((c) => {
    gsap.fromTo(c, { y: 0 }, { y: `${c.dataset.expCloud}vh`, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
  });
}
