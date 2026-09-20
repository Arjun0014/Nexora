// browse's `hover` dispatches element-level events that never reach a window listener, so drive the
// follower the way a real mouse does: a bubbling mousemove on the element under the point.
(() => {
  const at = (sel, fx = 0.3, fy = 0.5) => {
    const el = document.querySelector(sel);
    if (!el) return 'missing ' + sel;
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width * fx), y = Math.round(r.top + r.height * fy);
    const target = document.elementFromPoint(x, y) || el;
    target.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
    return 'moved to ' + sel;
  };
  const read = () => {
    const c = document.querySelector('[data-cursor-root]');
    return { state: c.dataset.state, op: getComputedStyle(c).opacity, text: c.querySelector('[data-cursor-text]').textContent, img: (c.querySelector('[data-cursor-img]').src || '').split('/').pop() };
  };
  window.__cur = { at, read };
  return 'ready';
})();
