(() => {
  const root = document.querySelector('[data-deck]');
  const stack = document.querySelector('[data-deck-stack]');
  const state = () => ({
    live: root?.dataset.live, sector: root?.dataset.sector,
    n: document.querySelector('[data-deck-count]')?.textContent,
    panel: [...document.querySelectorAll('[data-deck-panel]')].find(p => p.dataset.on === 'true')?.dataset.deckPanel,
    front: [...document.querySelectorAll('[data-deck-card]')].find(c => c.dataset.depth === '0')?.dataset.deckCard,
    live_text: document.querySelector('[data-deck-live]')?.textContent,
  });
  const drag = (dx, dy = 0, steps = 10, ms = 16) => new Promise((res) => {
    const card = [...document.querySelectorAll('[data-deck-card]')].find(c => c.dataset.depth === '0');
    const r = card.getBoundingClientRect();
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const opts = (x, y) => ({ pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y, bubbles: true, cancelable: true });
    card.setPointerCapture = () => {}; card.releasePointerCapture = () => {};
    card.dispatchEvent(new PointerEvent('pointerdown', opts(x0, y0)));
    let i = 0;
    const id = setInterval(() => {
      i++;
      card.dispatchEvent(new PointerEvent('pointermove', opts(x0 + dx * i / steps, y0 + dy * i / steps)));
      if (i >= steps) { clearInterval(id); card.dispatchEvent(new PointerEvent('pointerup', opts(x0 + dx, y0 + dy))); res(state()); }
    }, ms);
  });
  window.__deck = { state, drag };
  return JSON.stringify(state());
})();
