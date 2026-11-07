import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { AssetFetcher } from './AssetFetcher.js';
import { ASSETS } from './assetList.js';

export class AssetLoader {
  /** @param {THREE.WebGLRenderer} renderer  @param {(frac:number, label:string)=>void} onProgress */
  constructor(renderer, onProgress = () => {}) {
    this.onProgress = onProgress;
    this.fetcher = new AssetFetcher();
    this.manager = new THREE.LoadingManager();

    const draco = new DRACOLoader(this.manager)
      .setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const ktx2 = new KTX2Loader(this.manager)
      .setTranscoderPath(`https://cdn.jsdelivr.net/npm/three@0.${THREE.REVISION}.0/examples/jsm/libs/basis/`)
      .detectSupport(renderer);

    this.gltf = new GLTFLoader(this.manager)
      .setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
    this.rgbe = new RGBELoader(this.manager);
    this.tex = new THREE.TextureLoader(this.manager);
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
  }

  async loadAll() {
    const keys = Object.keys(ASSETS);
    const frac = Object.fromEntries(keys.map((k) => [k, 0]));
    const report = (label) => this.onProgress(keys.reduce((s, k) => s + frac[k], 0) / keys.length, label);
    const out = {};

    await Promise.all(keys.map(async (k) => {
      // 0..0.8 = unduh, 0.8..1 = parse/decode
      const { url, source } = await this.fetcher.getBlobURL(k, (f) => { frac[k] = f * 0.8; report(k); });
      const a = ASSETS[k];
      if (a.type === 'model')   out[k] = await this.gltf.loadAsync(url);
      if (a.type === 'hdr')     { out[k] = await this.rgbe.loadAsync(url); out[k].mapping = THREE.EquirectangularReflectionMapping; }
      if (a.type === 'texture') {
        const t = await this.tex.loadAsync(url);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = this.maxAniso;
        if (a.srgb) t.colorSpace = THREE.SRGBColorSpace;
        out[k] = t;
      }
      frac[k] = 1; report(`${k} ✓ (${source})`);
      URL.revokeObjectURL(url);
    }));
    return out;
  }
}
