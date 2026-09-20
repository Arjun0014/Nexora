/**
 * Header behaviour:
 *  - ink (light/dark) follows the data-theme of whatever section is under the bar
 *  - transparent while over a [data-header-clear] region (the hero), a slim solid bar afterwards
 *  - hides on scroll-down, returns on scroll-up; never hides while focus is inside it or a form
 */
import { $, $$ } from './core/env';

export function initHeader() {
  const el = $('[data-header]');
  if (!el) return;
  const header: HTMLElement = el;

  const themed = () => $$('[data-theme]').filter((el) => el !== document.documentElement && !el.closest('[data-menu]') && !el.closest('[data-header]'));
  const clearZone = $('[data-header-clear]');
  const probeY = () => header.offsetHeight / 2;

  let lastY = scrollY;
  let ticking = false;

  function update() {
    ticking = false;
    const y = scrollY;
    const py = probeY();

    // Which surface is under the middle of the bar?
    let ink: 'light' | 'dark' = document.documentElement.dataset.theme === 'paper' ? 'dark' : 'light';
    for (const el of themed()) {
      const r = el.getBoundingClientRect();
      if (r.top <= py && r.bottom > py) ink = el.dataset.theme === 'paper' ? 'dark' : 'light';
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
  addEventListener('resize', request, { passive: true });
  update();
}
