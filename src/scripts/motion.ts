/**
 * Footer motion toggle. Lets a visitor switch the film and all animation off (or back on) regardless of
 * their OS setting. The choice is read pre-paint by the inline script in Base.astro, so applying it is a reload.
 */
import { $ } from './core/env';

export function initMotionToggle() {
  const btn = $<HTMLButtonElement>('[data-motion-toggle]');
  if (!btn) return;
  const label = $('[data-motion-label]', btn);
  const reduced = !document.documentElement.classList.contains('motion');
  btn.hidden = false;
  btn.setAttribute('aria-pressed', String(reduced));
  if (label) label.textContent = reduced ? 'Motion is reduced — turn on' : 'Reduce motion';
  btn.addEventListener('click', () => {
    try { localStorage.setItem('nx-motion', reduced ? 'on' : 'off'); } catch { /* private mode: nothing to persist */ }
    location.reload();
  });
}
