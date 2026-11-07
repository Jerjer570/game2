// Pre-build: node scripts/fetch-assets.js
// Unduh semua asset GitHub -> public/assets, hash SHA-256 + cache, tulis asset-manifest.json
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ASSETS, rawUrl, cdnUrl } from '../src/assetList.js';

const OUT = path.resolve('public/assets');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dl(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return Buffer.from(await r.arrayBuffer()); }
    catch { await sleep(500 * 2 ** i); }
  }
  throw new Error('gagal: ' + url);
}

const manifest = { generatedAt: new Date().toISOString(), assets: [] };
for (const [id, a] of Object.entries(ASSETS)) {
  const file = path.join(OUT, a.local);
  await mkdir(path.dirname(file), { recursive: true });
  let buf, source = 'cache';
  try { buf = await readFile(file); }
  catch {
    try { buf = await dl(rawUrl(a.gh)); source = 'github-raw'; }
    catch { buf = await dl(cdnUrl(a.gh)); source = 'jsdelivr'; }
    await writeFile(file, buf);
  }
  manifest.assets.push({ id, type: a.type, local: `assets/${a.local}`, github: rawUrl(a.gh), sha256: sha(buf), bytes: buf.length });
  console.log(`✓ ${id} (${source}, ${(buf.length / 1024).toFixed(0)} KB)`);
}
await writeFile('public/asset-manifest.json', JSON.stringify(manifest, null, 2));
console.log('asset-manifest.json ditulis.');
