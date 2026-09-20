(() => {
  const log = [];
  const t0 = performance.now();
  const hero = document.querySelector('[data-hero]');
  const intro = document.querySelector('[data-intro-root]');
  const cv = document.querySelector('[data-canvas]');
  const sample = () => {
    if (!cv) return 'no-canvas';
    const c = document.createElement('canvas'); c.width = 8; c.height = 8;
    const x = c.getContext('2d'); x.drawImage(cv, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
    return Math.round(s / (d.length / 4) / 3);
  };
  const id = setInterval(() => {
    log.push([Math.round(performance.now() - t0), intro?.isConnected ? `${intro.dataset.wipe || '-'}/${intro.dataset.clear || '-'}/${intro.dataset.done || '-'}` : 'removed', hero?.dataset.mode, hero?.dataset.ready, 'lum' + sample()].join(' '));
    if (performance.now() - t0 > 9000) clearInterval(id);
  }, 150);
  window.__iw = log;
  return 'watching';
})();
