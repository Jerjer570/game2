import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { AssetLoader } from './AssetLoader.js';
import { PostFX } from './PostFX.js';
import { GameManager } from './GameManager.js';

const $ = (id) => document.getElementById(id);

// physicallyCorrectLights dihapus di three r155+ (perilaku fisik kini default).
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const stats = new Stats(); document.body.appendChild(stats.dom); stats.dom.style.left = 'auto'; stats.dom.style.right = '0';

const FOG = 0x2f2a12;
const scene = new THREE.Scene();
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.FogExp2(FOG, 0.05);               // kabut kuning pekat khas Backrooms
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 80);
scene.add(camera);

const loader = new AssetLoader(renderer, (f, label) => {
  $('fill').style.width = `${Math.round(f * 100)}%`; $('lsub').textContent = `${Math.round(f * 100)}% — ${label}`;
});
let assets;
try { assets = await loader.loadAll(); }
catch (e) { $('ltext').textContent = 'Gagal memuat asset: ' + e.message; throw e; }

const fx = new PostFX(renderer, scene, camera);
const game = new GameManager({ scene, camera, renderer, assets, fx });

$('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 700);
$('start').style.display = 'flex';

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); fx.resize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  game.update(Math.min(clock.getDelta(), 0.05));
  fx.render();
  stats.update();
});
