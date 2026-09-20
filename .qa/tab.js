// Walk the focusable order and report anything focusable that cannot be seen.
(() => {
  const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const out = [];
  let hidden = 0, n = 0;
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) continue;
    // display:none and visibility:hidden subtrees are already out of the tab order, and an explicit
    // tabindex="-1" takes an element out of it too: none of those are findings.
    if (el.tabIndex < 0 || !el.checkVisibility?.({ checkVisibilityCSS: true, checkOpacity: false })) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const invisible = (r.width === 0 && r.height === 0) || cs.visibility === 'hidden' || cs.display === 'none' || (cs.opacity === '0' && !el.closest('.skip'));
    n++;
    if (invisible) { hidden++; if (out.length < 8) out.push(`${el.tagName}.${(el.className || '').toString().slice(0, 26)} "${(el.textContent || '').trim().slice(0, 22)}"`); }
  }
  return JSON.stringify({ focusable: n, invisible: hidden, examples: out });
})();
