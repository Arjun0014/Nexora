// QA helpers for the hero, loaded into the page with `browse eval .qa/probe.js`.
// They synthesise input the way real devices emit it, and log the hero's observable state over time.
(() => {
  const hero = document.querySelector('[data-hero]');
  const state = () => ({
    t: Math.round(performance.now()),
    mode: hero?.dataset.mode,
    stop: hero?.dataset.stop,
    ch: [...document.querySelectorAll('[data-chapter]')].filter((c) => c.dataset.active === 'true').map((c) => c.dataset.chapter).join(','),
    y: Math.round(scrollY),
  });
  const wheel = (dy) => window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }));

  window.__qa = {
    state,
    log: [],
    /** One mouse-wheel notch. */
    notch(dir = 1) { wheel(100 * dir); },
    /** A trackpad flick: quick ramp up, then ~1 s of decaying inertia at 60 Hz. */
    flick(dir = 1, peak = 90) {
      let i = 0;
      clearInterval(this._flick); // fingers back on the pad stop the previous inertia, as on a real device
      const id = this._flick = setInterval(() => {
        const mag = i < 4 ? peak * ((i + 1) / 4) : peak * Math.exp(-(i - 4) / 14);
        if (mag < 1) { clearInterval(id); return; }
        wheel(mag * dir); i++;
      }, 16);
    },
    /** A free-spinning wheel: notches that slow down from 12 ms apart to 260 ms apart. */
    freespin(dir = 1, n = 22) {
      let gap = 12, i = 0;
      const next = () => { if (i++ >= n) return; wheel(100 * dir); gap *= 1.16; setTimeout(next, gap); };
      next();
    },
    /** A touch swipe on the hero. dir 1 = finger moves up (onwards). */
    swipe(dir = 1, dist = 180) {
      const el = hero, x = innerWidth / 2, y0 = innerHeight * (dir > 0 ? 0.7 : 0.3);
      const mk = (type, y) => {
        const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
      };
      mk('touchstart', y0);
      let k = 0;
      const id = setInterval(() => { k++; mk('touchmove', y0 - dir * dist * (k / 8)); if (k >= 8) { clearInterval(id); mk('touchend', y0 - dir * dist); } }, 16);
    },
    /** Sample the state every `every` ms for `ms` ms into __qa.log (compressed: only changes are kept). */
    watch(ms = 8000, every = 100) {
      this.log = [];
      let last = '';
      const t0 = performance.now();
      const id = setInterval(() => {
        const s = state();
        const key = `${s.mode}|${s.stop}|${s.ch}|${s.y}`;
        if (key !== last) { last = key; this.log.push(`${Math.round(performance.now() - t0)}ms ${key}`); }
        if (performance.now() - t0 > ms) clearInterval(id);
      }, every);
    },
  };
  return 'qa ready';
})();
