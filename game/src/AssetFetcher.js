import { get, set } from 'idb-keyval';
import { ASSETS, rawUrl, cdnUrl } from './assetList.js';

const MIME = { glb: 'model/gltf-binary', hdr: 'application/octet-stream', jpg: 'image/jpeg', png: 'image/png' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Urutan: IndexedDB cache -> raw.githubusercontent (retry 3x, exp. backoff)
 *         -> jsDelivr CDN (retry 3x) -> file lokal /assets (hasil scripts/fetch-assets.js)
 */
export class AssetFetcher {
  constructor({ retries = 3 } = {}) {
    this.retries = retries;
    this.localBase = `${import.meta.env.BASE_URL}assets/`;
  }

  async _download(url, onFrac) {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    const total = +res.headers.get('content-length') || 0;
    if (!res.body || !res.body.getReader) {
      const b = await res.arrayBuffer(); onFrac?.(1); return b;
    }
    const reader = res.body.getReader();
    const chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (total) onFrac?.(Math.min(got / total, 0.99));
    }
    const out = new Uint8Array(got); let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    onFrac?.(1);
    return out.buffer;
  }

  async _retry(url, onFrac) {
    let err;
    for (let i = 0; i < this.retries; i++) {
      try { return await this._download(url, onFrac); }
      catch (e) { err = e; await sleep(400 * 2 ** i); }
    }
    throw err;
  }

  /** @returns {Promise<{url:string, source:string}>} blob URL siap dipakai loader */
  async getBlobURL(key, onFrac) {
    const a = ASSETS[key];
    if (!a) throw new Error(`Asset tidak dikenal: ${key}`);
    const cacheKey = `asset:${a.gh.join('/')}`;
    const ext = a.gh[3].split('.').pop().toLowerCase();
    let buf = null, source = 'cache';

    try { buf = await get(cacheKey); } catch { /* IndexedDB tidak tersedia */ }
    if (buf) { onFrac?.(1); }
    else {
      const sources = [
        ['github-raw', rawUrl(a.gh), true],
        ['jsdelivr',   cdnUrl(a.gh), true],
        ['local',      this.localBase + a.local, false]
      ];
      for (const [name, url, cacheable] of sources) {
        try {
          buf = await (name === 'local' ? this._download(url, onFrac) : this._retry(url, onFrac));
          source = name;
          if (cacheable) { try { await set(cacheKey, buf); } catch { /* quota */ } }
          break;
        } catch (e) { console.warn(`[AssetFetcher] ${key} gagal via ${name}:`, e.message); }
      }
    }
    if (!buf) throw new Error(`Semua sumber gagal untuk asset "${key}"`);
    return { url: URL.createObjectURL(new Blob([buf], { type: MIME[ext] || 'application/octet-stream' })), source };
  }
}
