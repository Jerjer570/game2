import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

/** LUT 3D prosedural: highlight kuning menyakitkan, shadow kehijauan, saturasi turun. */
function makeCinematicLUT(size = 32) {
  const d = new Uint8Array(size ** 3 * 4);
  const s = (x) => x * x * (3 - 2 * x);
  const c = (x) => THREE.MathUtils.clamp(x, 0, 1) * 255;
  let i = 0;
  for (let b = 0; b < size; b++) for (let g = 0; g < size; g++) for (let r = 0; r < size; r++) {
    let R = r / (size - 1), G = g / (size - 1), B = b / (size - 1);
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    R = THREE.MathUtils.lerp(R, s(R), 0.4); G = THREE.MathUtils.lerp(G, s(G), 0.4); B = THREE.MathUtils.lerp(B, s(B), 0.4);
    R += L * 0.06 - (1 - L) * 0.04; G += L * 0.05 + (1 - L) * 0.03; B += -L * 0.08 - (1 - L) * 0.01;
    const L2 = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    R = L2 + (R - L2) * 0.85; G = L2 + (G - L2) * 0.85; B = L2 + (B - L2) * 0.85;
    d[i++] = c(R); d[i++] = c(G); d[i++] = c(B); d[i++] = 255;
  }
  const t = new THREE.Data3DTexture(d, size, size, size);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}

const HorrorShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFear: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uFear; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uTime)*43758.5453); }
    void main(){
      vec2 d=vUv-.5; float r=dot(d,d); vec2 off=d*(0.002+0.014*uFear)*r*4.;
      vec3 c=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
      c+=(h(vUv*vec2(1920.,1080.))-.5)*(0.06+0.05*uFear);
      float v=1.-smoothstep(.15,.85,r*(1.6+1.4*uFear)); c*=mix(.2,1.,v);
      float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.-.45*uFear);
      gl_FragColor=vec4(c,1.); }`
};

export class PostFX {
  constructor(renderer, scene, camera) {
    const w = innerWidth, h = innerHeight, pr = renderer.getPixelRatio();
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    // GTAO = penerus SSAO di three.js (kualitas lebih baik, lebih murah)
    this.ao = new GTAOPass(scene, camera, w, h);
    this.ao.blendIntensity = 1;
    this.composer.addPass(this.ao);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.7, 0.9);
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass());   // ACES Filmic dari renderer.toneMapping
    this.composer.addPass(new LUTPass({ lut: makeCinematicLUT(), intensity: 0.75 }));
    this.horror = new ShaderPass(HorrorShader); this.composer.addPass(this.horror);
    this.composer.addPass(new SMAAPass(w * pr, h * pr));
  }
  setFear(f, t) { this.horror.uniforms.uFear.value = f; this.horror.uniforms.uTime.value = t % 100; }
  resize(w, h) { this.composer.setSize(w, h); }
  render(dt) { this.composer.render(dt); }
}
