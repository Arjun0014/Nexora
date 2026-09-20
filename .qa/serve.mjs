#!/usr/bin/env node
/**
 * Static server for QA of the production build. CDP network/media emulation is not allow-listed in the browse
 * daemon, so the two things that need emulating are done here instead:
 *
 *   ?nojs    strips every <script> from the HTML   → the no-JS fallback
 *   ?slow=N  delays hero frame + video responses   → a starved network
 *
 * Both are query flags on the PAGE, remembered per connection through a cookie, so linked assets inherit them.
 *
 *   node .qa/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.argv[2] || 4330);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')));
  const nojs = url.searchParams.has('nojs') || cookies.qa_nojs === '1';
  const slow = Number(url.searchParams.get('slow') || cookies.qa_slow || 0);

  let file = decodeURIComponent(url.pathname);
  if (file.endsWith('/')) file += 'index.html';
  let abs = path.join(ROOT, file);

  try {
    const info = await stat(abs).catch(() => null);
    if (!info || info.isDirectory()) abs = path.join(ROOT, '404.html');
    let body = await readFile(abs);
    const ext = path.extname(abs);

    // A starved network: only the film's own payload is delayed, so the hero's gating is what is under test.
    if (slow && (/\/media\/hero\/seq\//.test(file) || /\/media\/hero\/loop/.test(file))) await sleep(slow);

    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' };
    if (ext === '.html') {
      headers['set-cookie'] = [`qa_nojs=${nojs ? 1 : 0}; Path=/`, `qa_slow=${slow}; Path=/`];
      if (nojs) {
        body = Buffer.from(
          body.toString('utf8')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<script\b[^>]*\/>/gi, ''),
        );
      }
    }
    res.writeHead(info || abs.endsWith('404.html') ? (info ? 200 : 404) : 404, headers);
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err));
  }
}).listen(PORT, () => console.log(`qa server → http://localhost:${PORT}/  (?nojs, ?slow=ms)`));
