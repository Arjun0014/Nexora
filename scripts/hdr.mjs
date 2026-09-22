// Radiance RGBE (.hdr) read / box-downsample / write, in float, for the courtyard's sky (ffmpeg's scaler clamps it).
import { readFileSync, writeFileSync } from 'node:fs';

export function readHDR(path) {
  const b = readFileSync(path);
  let i = 0;
  const line = () => { let s = ''; while (b[i] !== 10) s += String.fromCharCode(b[i++]); i++; return s; };
  for (let s = line(); s !== ''; s = line()) { /* header */ }
  const res = line().trim().split(/\s+/); // -Y H +X W
  const H = Number(res[1]), W = Number(res[3]);
  const out = new Float32Array(W * H * 3);
  const row = new Uint8Array(W * 4);
  for (let y = 0; y < H; y++) {
    if (b[i] === 2 && b[i + 1] === 2 && ((b[i + 2] << 8) | b[i + 3]) === W) {
      i += 4;
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < W) {
          let n = b[i++];
          if (n > 128) { n -= 128; const v = b[i++]; while (n--) row[(x++) * 4 + c] = v; }
          else { while (n--) row[(x++) * 4 + c] = b[i++]; }
        }
      }
    } else {
      for (let x = 0; x < W * 4; x++) row[x] = b[i++];
    }
    for (let x = 0; x < W; x++) {
      const e = row[x * 4 + 3], o = (y * W + x) * 3;
      if (!e) { out[o] = out[o + 1] = out[o + 2] = 0; continue; }
      const f = Math.pow(2, e - 136);
      out[o] = row[x * 4] * f; out[o + 1] = row[x * 4 + 1] * f; out[o + 2] = row[x * 4 + 2] * f;
    }
  }
  return { width: W, height: H, data: out };
}

export function downsample({ width: W, height: H, data }, w) {
  const k = W / w, h = Math.round(H / k);
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, bl = 0, n = 0;
    for (let yy = Math.floor(y * k); yy < Math.floor((y + 1) * k); yy++) for (let xx = Math.floor(x * k); xx < Math.floor((x + 1) * k); xx++) {
      const o = (yy * W + xx) * 3; r += data[o]; g += data[o + 1]; bl += data[o + 2]; n++;
    }
    const o = (y * w + x) * 3;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = bl / n;
  }
  return { width: w, height: h, data: out };
}

function rgbe(r, g, b) {
  const m = Math.max(r, g, b);
  if (m < 1e-32) return [0, 0, 0, 0];
  const e = Math.ceil(Math.log2(m) + 1e-9);
  const f = 256 / Math.pow(2, e);
  return [Math.min(255, Math.floor(r * f)), Math.min(255, Math.floor(g * f)), Math.min(255, Math.floor(b * f)), e + 128];
}

/** Writes new-style RLE scanlines. */
export function writeHDR(path, { width: W, height: H, data }) {
  const chunks = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`, 'ascii')];
  const row = new Uint8Array(W * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) { const o = (y * W + x) * 3; row.set(rgbe(data[o], data[o + 1], data[o + 2]), x * 4); }
    const bytes = [2, 2, W >> 8, W & 255];
    for (let c = 0; c < 4; c++) {
      let x = 0;
      while (x < W) {
        // a run of equal bytes?
        let run = 1;
        while (x + run < W && run < 127 && row[(x + run) * 4 + c] === row[x * 4 + c]) run++;
        if (run >= 3) { bytes.push(128 + run, row[x * 4 + c]); x += run; continue; }
        // literal stretch up to the next run of 3
        let lit = 0;
        while (x + lit < W && lit < 128) {
          const a = row[(x + lit) * 4 + c];
          if (x + lit + 2 < W && row[(x + lit + 1) * 4 + c] === a && row[(x + lit + 2) * 4 + c] === a) break;
          lit++;
        }
        if (!lit) lit = 1;
        bytes.push(lit);
        for (let j = 0; j < lit; j++) bytes.push(row[(x + j) * 4 + c]);
        x += lit;
      }
    }
    chunks.push(Buffer.from(bytes));
  }
  writeFileSync(path, Buffer.concat(chunks));
}
