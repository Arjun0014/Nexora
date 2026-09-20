/** Full-screen menu sheet: focus trap, Esc to close, background inert, focus returned to the trigger. */
import { $, $$ } from './core/env';

export function initMenu() {
  const sheet = $('[data-menu]');
  const opener = $<HTMLButtonElement>('[data-menu-open]');
  if (!sheet || !opener) return;
  const closer = $<HTMLButtonElement>('[data-menu-close]', sheet);
  const outside = () => $$('body > *').filter((el) => el !== sheet && el.tagName !== 'SCRIPT');

  const focusables = () => $$<HTMLElement>('a[href], button:not([disabled])', sheet);

  function open() {
    sheet!.hidden = false;
    sheet!.dataset.open = 'true';
    opener!.setAttribute('aria-expanded', 'true');
    outside().forEach((el) => el.setAttribute('inert', ''));
    document.documentElement.style.overflow = 'hidden';
    (closer ?? focusables()[0])?.focus();
  }
  function close(returnFocus = true) {
    sheet!.hidden = true;
    sheet!.dataset.open = 'false';
    opener!.setAttribute('aria-expanded', 'false');
    outside().forEach((el) => el.removeAttribute('inert'));
    document.documentElement.style.overflow = '';
    if (returnFocus) opener!.focus();
  }

  opener.addEventListener('click', open);
  closer?.addEventListener('click', () => close());
  sheet.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) close(false); });
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // If the viewport grows past the mobile breakpoint while open, close it.
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches && !sheet.hidden) close(false); });
}
