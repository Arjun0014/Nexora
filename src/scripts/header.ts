/**
 * Header behaviour:
 *  - ink (light/dark) follows the data-theme of whatever section is under the bar
 *  - transparent while over a [data-header-clear] region (the hero), a slim solid bar afterwards
 *  - hides on scroll-down, returns on scroll-up; never hides while focus is inside it or a form
 *  - carries the name of the chapter you are in (Lama Lama): the chrome narrates, so the page needs no
 *    numbered progress rail
 */
import { $, $$ } from './core/env';

export function initHeader() {
  const el = $('[data-header]');
  if (!el) return;
  const header: HTMLElement = el;

  // Any element that declares its ground: data-bg="light|dark" (scenes) or data-theme="paper|dark" (older markup).
  // When several overlap under the bar, the LAST in document order wins (scenes that overlay earlier ones).
  const themed = () => $$('[data-theme], [data-bg]').filter((el) => el !== document.documentElement && !el.closest('[data-menu]') && !el.closest('[data-header]'));
  const isLight = (el: HTMLElement) => (el.dataset.bg ? el.dataset.bg === 'light' : el.dataset.theme === 'paper' || el.dataset.theme === 'light');
  const clearZone = $('[data-header-clear]');
  const probeY = () => header.offsetHeight / 2;

  // ── the chapter label ───────────────────────────────────────────────────────────────────
  const labelEl = $('[data-chapter-label]', header);
  const textEl = $('[data-chapter-text]', header);
  const chapters = $$<HTMLElement>('[data-chapter-name]');
  let chapter = '';
  let swapAt = 0;

  function updateChapter(now: number) {
    if (!labelEl || !textEl) return;
    // The current chapter is the last one whose top has passed the header.
    let name = '';
    for (const el of chapters) {
      if (el.getBoundingClientRect().top <= header.offsetHeight + 8) name = el.dataset.chapterName ?? '';
    }
    if (name !== chapter) {
      chapter = name;
      // Let the old word leave before the new one is written, so it reads as a change, not a flicker.
      labelEl.dataset.swap = 'true';
      swapAt = now + 220;
    }
    if (swapAt && now >= swapAt) {
      swapAt = 0;
      textEl.textContent = chapter;
      labelEl.dataset.swap = 'false';
      labelEl.dataset.on = String(!!chapter);
    }
  }

  let lastY = scrollY;
  let ticking = false;

  function update() {
    ticking = false;
    updateChapter(performance.now());
    const y = scrollY;
    const py = probeY();

    // Which surface is under the middle of the bar?
    let ink: 'light' | 'dark' = document.documentElement.dataset.theme === 'paper' ? 'dark' : 'light';
    for (const el of themed()) {
      if (el.dataset.bg === '' ) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= py && r.bottom > py) ink = isLight(el) ? 'dark' : 'light';
    }
    header.dataset.ink = ink;

    // Turn solid a little BEFORE the hero ends, so the title card's last lines pass under a bar, not through the nav.
    const overClear = clearZone ? clearZone.getBoundingClientRect().bottom > header.offsetHeight * 2.4 : false;
    header.dataset.solid = String(!overClear && y > 8);

    const dy = y - lastY;
    const formFocused = !!document.activeElement?.closest('form');
    if (overClear || y < 120 || formFocused) header.dataset.hidden = 'false';
    else if (dy > 8) header.dataset.hidden = 'true';
    else if (dy < -8) header.dataset.hidden = 'false';
    if (Math.abs(dy) > 8) lastY = y;
  }

  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('nx:ground', request);
  addEventListener('resize', request, { passive: true });
  // The swap is time-based, so it needs a frame after the scroll that triggered it.
  setInterval(() => { if (swapAt) request(); }, 80);
  update();
}
