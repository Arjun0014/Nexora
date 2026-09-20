// Sample text/background pairs across the page and report WCAG contrast ratios.
(() => {
  const lum = (c) => {
    const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('p, li, a, dd, dt, span.label, h1, h2, h3, figcaption, button')) {
    const txt = (el.textContent || '').trim();
    if (!txt || el.children.length > 2 || el.offsetParent === null) continue;
    const cs = getComputedStyle(el);
    const key = cs.color + '|' + bgOf(el) + '|' + cs.fontSize;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = ratio(cs.color, bgOf(el));
    const px = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
    if (r < need) out.push(`${r.toFixed(2)} (need ${need}) ${Math.round(px)}px "${txt.slice(0, 30)}" ${cs.color} on ${bgOf(el)}`);
  }
  return out.length ? out.slice(0, 12).join('\n') : 'all sampled pairs pass';
})();
