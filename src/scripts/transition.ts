/**
 * Page transitions (markup and styles in src/layouts/Base.astro).
 *
 * Leaving: a click on an in-site link opens a maroon circle with a lit rim FROM THE POINT OF THE CLICK; the
 * destination's name rises in the centre; we navigate the moment the circle covers the screen. If the next page
 * is slow, the cover holds with a breathing hairline, so the site never looks frozen.
 * Arriving: the pre-paint script in Base.astro puts the cover up before the first paint (sessionStorage `nx-pt`
 * carries the name); here it lifts away as a dome drawing upwards while the page settles into place.
 * Links are prefetched on hover (astro.config `prefetch`). Reduced motion: plain navigation.
 */
import { $ } from './core/env';
import { gsap, EASE } from './core/motion';
import { lenis } from './core/scroll';

const NAMES: Record<string, string> = {
  '/': 'Nexora', '/services/': 'Services', '/industries/': 'Industries', '/about/': 'About', '/careers/': 'Careers',
  '/request/': 'Request workforce', '/contact/': 'Contact', '/privacy/': 'Privacy',
};

export function initTransitions() {
  const el = $('[data-pt]');
  const html = document.documentElement;
  if (!el || !html.classList.contains('motion')) { if (html.dataset.pt) delete html.dataset.pt; return; }
  const cover = el;
  const name = $('[data-pt-name]', cover)!;

  // ── arriving ────────────────────────────────────────────────────────────────────────────
  if (html.dataset.pt === 'in') {
    const state = { lift: 0 };
    cover.dataset.state = 'out';
    gsap.to(state, {
      lift: 1, duration: 1.1, ease: EASE.dive, delay: 0.15,
      onUpdate: () => { cover.style.setProperty('--lift', state.lift.toFixed(4)); html.style.setProperty('--settle', EASE.out(state.lift).toFixed(4)); },
      onComplete: () => { delete cover.dataset.state; delete html.dataset.pt; html.style.removeProperty('--settle'); cover.style.removeProperty('--lift'); },
    });
  }

  // ── leaving ─────────────────────────────────────────────────────────────────────────────
  let leaving = false;
  document.addEventListener('click', (e) => {
    if (leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && (url.hash || url.search === location.search)) return; // same page: let anchors scroll
    e.preventDefault();
    leaving = true;
    const label = NAMES[url.pathname] ?? (a.textContent || '').trim().slice(0, 40);
    name.textContent = label;
    try { sessionStorage.setItem('nx-pt', label); } catch { /* private mode: the next page just appears */ }

    const far = Math.hypot(Math.max(e.clientX, innerWidth - e.clientX), Math.max(e.clientY, innerHeight - e.clientY)) + 20;
    cover.style.setProperty('--x', `${e.clientX}px`);
    cover.style.setProperty('--y', `${e.clientY}px`);
    cover.dataset.state = 'in';
    lenis?.stop();
    const state = { r: 0 };
    gsap.to(state, {
      r: far, duration: 0.85, ease: EASE.inOut,
      onUpdate: () => cover.style.setProperty('--r', `${state.r.toFixed(1)}px`),
      onComplete: () => { location.href = url.href; },
    });
  });

  // Back/forward restores a page from the bfcache with the cover still up: take it down.
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    delete cover.dataset.state; delete html.dataset.pt;
    cover.style.setProperty('--r', '0px');
    lenis?.start();
  });
}
