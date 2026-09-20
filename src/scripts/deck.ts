/**
 * The workforce deck. Upgrades the static <ol> of five articles into a draggable stack + one detail panel.
 *
 * Inputs (all equivalent — there is no "accept/reject", either direction means "next"):
 *   drag / flick with mouse or touch · the two arrow buttons · ← → Home End on the focused deck
 * Without motion permission the list is simply left as it is.
 */
import { $, $$, clamp, env } from './core/env';

const STACK = [
  { x: 0, y: 0, r: 0, s: 1, o: 1 },
  { x: 16, y: 12, r: 3.2, s: 0.965, o: 1 },
  { x: -14, y: 24, r: -2.6, s: 0.93, o: 1 },
  { x: 0, y: 30, r: 0, s: 0.9, o: 0 },
];

export function initDeck() {
  const deck = $('[data-deck]');
  if (!deck || !env.motion) return;

  const items = $$('[data-deck-item]', deck);
  const cards = items.map((it) => $('[data-deck-card]', it)!);
  const ctrl = $('[data-deck-ctrl]', deck)!;
  const count = $('[data-deck-count]', deck)!;
  const n = items.length;
  if (n < 2) return;

  /** order[0] is the index of the card on top. */
  let order = items.map((_, i) => i);
  let busy = false;

  deck.dataset.live = '';
  deck.tabIndex = 0;
  deck.setAttribute('role', 'group');
  deck.setAttribute('aria-roledescription', 'carousel');
  deck.setAttribute('aria-label', 'The five workforces. Use the left and right arrow keys to change.');
  ctrl.hidden = false;

  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  deck.append(live);

  const set = (el: HTMLElement, p: { x: number; y: number; r: number; s: number; o: number }, z: number) => {
    el.style.setProperty('--x', `${p.x}px`); el.style.setProperty('--y', `${p.y}px`);
    el.style.setProperty('--r', `${p.r}deg`); el.style.setProperty('--s', String(p.s));
    el.style.setProperty('--z', String(z)); el.style.opacity = String(p.o);
  };

  function layout(animate = true, announce = false) {
    order.forEach((idx, pos) => {
      const card = cards[idx];
      if (animate) card.dataset.settling = ''; else delete card.dataset.settling;
      set(card, STACK[Math.min(pos, STACK.length - 1)], n - pos);
      if (pos === 0) { card.dataset.top = ''; card.dataset.cursor = 'Drag'; } else { delete card.dataset.top; delete card.dataset.cursor; }
      card.setAttribute('aria-hidden', String(pos !== 0));
    });
    const cur = order[0];
    items.forEach((it, i) => { if (i === cur) it.dataset.current = ''; else delete it.dataset.current; });
    deck!.dataset.sector = items[cur].dataset.sector ?? '';
    count.textContent = String(cur + 1).padStart(2, '0');
    if (announce) live.textContent = `${cur + 1} of ${n}: ${$('h3', items[cur])?.textContent ?? ''}`;
  }

  /** Send the top card away along (dirX, vy) and bring the next one forward. */
  function advance(dirX: number, vy = 0) {
    if (busy) return;
    busy = true;
    const top = cards[order[0]];
    const w = top.offsetWidth;
    top.dataset.settling = '';
    set(top, { x: dirX * w * 1.35, y: vy * 120 + 30, r: dirX * 16, s: 1, o: 0 }, n + 1);
    order = [...order.slice(1), order[0]];
    // The rest move up immediately; the thrown card re-enters at the back once it has left.
    order.slice(0, -1).forEach((idx, pos) => { cards[idx].dataset.settling = ''; set(cards[idx], STACK[Math.min(pos, STACK.length - 1)], n - pos); });
    layoutMeta();
    setTimeout(() => { delete top.dataset.settling; set(top, STACK[STACK.length - 1], 0); requestAnimationFrame(() => { layout(true); busy = false; }); }, 340);
  }

  /** Bring the bottom card back to the top, arriving from the side. */
  function retreat() {
    if (busy) return;
    busy = true;
    const idx = order[order.length - 1];
    const card = cards[idx];
    delete card.dataset.settling;
    set(card, { x: card.offsetWidth * 1.35, y: 30, r: 16, s: 1, o: 0 }, n + 1);
    order = [idx, ...order.slice(0, -1)];
    void card.offsetWidth; // commit the start position before transitioning
    requestAnimationFrame(() => { layout(true, true); setTimeout(() => { busy = false; }, 360); });
  }

  function layoutMeta() {
    const cur = order[0];
    items.forEach((it, i) => { if (i === cur) it.dataset.current = ''; else delete it.dataset.current; });
    deck!.dataset.sector = items[cur].dataset.sector ?? '';
    count.textContent = String(cur + 1).padStart(2, '0');
    live.textContent = `${cur + 1} of ${n}: ${$('h3', items[cur])?.textContent ?? ''}`;
    cards.forEach((c, i) => { if (i === cur) { c.dataset.top = ''; c.dataset.cursor = 'Drag'; } else { delete c.dataset.top; delete c.dataset.cursor; } c.setAttribute('aria-hidden', String(i !== cur)); });
  }

  function goTo(target: number) {
    // Rotate the order so `target` is on top, without animating every intermediate card.
    const at = order.indexOf(target);
    if (at <= 0) return;
    order = [...order.slice(at), ...order.slice(0, at)];
    layout(true, true);
  }

  // ── drag ────────────────────────────────────────────────────────────────────────────────
  let drag: { id: number; x0: number; y0: number; dx: number; dy: number; card: HTMLElement; samples: { t: number; x: number; y: number }[]; active: boolean } | null = null;

  deck.addEventListener('pointerdown', (e) => {
    const card = (e.target as Element).closest<HTMLElement>('[data-deck-card]');
    if (!card || card !== cards[order[0]] || busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, card, samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }], active: false };
  });
  deck.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x0; drag.dy = e.clientY - drag.y0;
    if (!drag.active) {
      if (Math.abs(drag.dx) < 6) return;
      if (Math.abs(drag.dy) > Math.abs(drag.dx) * 1.2) { drag = null; return; } // a vertical intent: let the page scroll
      drag.active = true;
      drag.card.setPointerCapture(drag.id);
      drag.card.dataset.dragging = '';
      delete drag.card.dataset.settling;
    }
    drag.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (drag.samples.length > 6) drag.samples.shift();
    set(drag.card, { x: drag.dx, y: drag.dy * 0.25, r: clamp(drag.dx / 18, -18, 18), s: 1.015, o: 1 }, n + 1);
  });
  const end = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.active) return;
    delete d.card.dataset.dragging;
    const a = d.samples[0], b = d.samples[d.samples.length - 1];
    const dt = Math.max(1, b.t - a.t);
    const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
    const far = Math.abs(d.dx) > d.card.offsetWidth * 0.28;
    const fast = Math.abs(vx) > 0.5 && Math.sign(vx) === Math.sign(d.dx || vx);
    if (far || fast) advance(Math.sign(d.dx || vx) || -1, clamp(vy, -1, 1));
    else layout(true);
  };
  deck.addEventListener('pointerup', end);
  deck.addEventListener('pointercancel', end);
  // A drag must never start a native image drag or select text.
  deck.addEventListener('dragstart', (e) => e.preventDefault());
  // …and a completed drag must not also register as a click on anything beneath.
  deck.addEventListener('click', (e) => { if ((e.target as Element).closest('[data-deck-card]')) e.preventDefault(); });

  $('[data-deck-next]', deck)?.addEventListener('click', () => advance(-1));
  $('[data-deck-prev]', deck)?.addEventListener('click', retreat);
  deck.addEventListener('keydown', (e) => {
    if (e.target !== deck) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); advance(-1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); retreat(); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(n - 1); }
  });

  // Deep links (#wf-events, or links from the hero/services) open the matching card.
  const fromHash = () => { const i = items.findIndex((it) => `#wf-${it.dataset.sector}` === location.hash); if (i > 0) goTo(i); };
  addEventListener('hashchange', fromHash);

  layout(false);
  fromHash();
}
