// Fetch Poly Haven (CC0) assets into media/ph/<id>/ — the originals the scene's build scripts read.
//   node scripts/ph-fetch.mjs tex <id> [res]      diffuse, normal (GL), roughness, AO (+ arm) as JPG
//   node scripts/ph-fetch.mjs hdri <id> [res]     .hdr
//   node scripts/ph-fetch.mjs model <id> [res]    glTF + its textures
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const [kind, id, res = kind === 'hdri' ? '4k' : '2k'] = process.argv.slice(2);
if (!kind || !id) { console.log('usage: ph-fetch.mjs tex|hdri|model <id> [res]'); process.exit(1); }
const dir = join('media/ph', id);
mkdirSync(dir, { recursive: true });
const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
async function get(url, out) {
  if (existsSync(out)) return console.log('·', out);
  mkdirSync(dirname(out), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log('✓', out);
}
if (kind === 'hdri') {
  const f = files.hdri[res].hdr;
  await get(f.url, join(dir, `${id}_${res}.hdr`));
} else if (kind === 'tex') {
  for (const map of ['Diffuse', 'nor_gl', 'Rough', 'AO', 'arm', 'Displacement']) {
    const f = files[map]?.[res]?.jpg ?? files[map]?.[res]?.png;
    if (f) await get(f.url, join(dir, `${id}_${map.toLowerCase()}_${res}.${f.url.split('.').pop()}`));
  }
} else if (kind === 'model') {
  const g = files.gltf[res].gltf;
  await get(g.url, join(dir, `${id}_${res}.gltf`));
  for (const [rel, inc] of Object.entries(g.include ?? {})) await get(inc.url, join(dir, rel));
}
