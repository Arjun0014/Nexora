// Contact sheet: node .qa/pw/sheet.mjs <out.png> <cols> <cellWidth> file1 file2 ...
import sharp from 'sharp';
const [out, colsS, cwS, ...files] = process.argv.slice(2);
const cols = Number(colsS), cw = Number(cwS);
const meta = await sharp(files[0]).metadata();
const ch = Math.round((cw * meta.height) / meta.width);
const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map((f) => sharp(f).resize(cw, ch).toBuffer()));
await sharp({ create: { width: cols * cw + (cols - 1) * 6, height: rows * ch + (rows - 1) * 6, channels: 3, background: '#111' } })
  .composite(tiles.map((b, i) => ({ input: b, left: (i % cols) * (cw + 6), top: Math.floor(i / cols) * (ch + 6) })))
  .png().toFile(out);
console.log(out);
