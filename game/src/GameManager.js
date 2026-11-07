import * as THREE from 'three';
import { Level, TILE } from './Level.js';
import { PlayerController } from './PlayerController.js';
import { EnemyAI } from './EnemyAI.js';
import { InventorySystem } from './InventorySystem.js';
import { SaveSystem } from './SaveSystem.js';
import { GameAudio } from './Audio.js';

const $ = (id) => document.getElementById(id);
const NEED = 5;

export class GameManager {
  constructor({ scene, camera, renderer, assets, fx }) {
    this.scene = scene; this.camera = camera; this.fx = fx; this.dom = renderer.domElement; this.state = 'menu';
    this.coarse = matchMedia('(pointer:coarse)').matches;
    this.audio = new GameAudio(); this.inv = new InventorySystem(); this.save = new SaveSystem('backrooms-sekolah');

    this.level = new Level(11, 10);
    this.built = this.level.build(scene, assets);
    this.player = new PlayerController(camera, this.dom, this.level, this.built.obstacles, this.audio);
    const s = this.level.center(1, 1); this.player.pos.set(s.x, 0, s.z); this.player.yaw = this.level.solidTile(2, 1) ? 0 : Math.PI;
    if (!this.level.solidTile(2, 1)) this.player.yaw = -Math.PI / 2;

    // Senter (SpotLight dengan shadow) menempel pada kamera
    this.flash = new THREE.SpotLight(0xfff0cc, 120, 28, 0.45, 0.6, 2);
    this.flash.castShadow = true; this.flash.shadow.mapSize.set(1024, 1024); this.flash.shadow.bias = -0.0005;
    this.flash.position.set(0.15, -0.1, 0); this.flash.target.position.set(0, 0, -5);
    camera.add(this.flash, this.flash.target); this.player.onFlash = () => { this.flash.visible = !this.flash.visible; this.audio.tone(300, 0.05, 0.1, 'square'); };

    scene.add(new THREE.HemisphereLight(0xd9c97a, 0x4a3f1a, 0.35));
    this.pool = Array.from({ length: 6 }, () => { const l = new THREE.PointLight(0xfff0b0, 10, 14, 2); scene.add(l); return l; });

    // Entitas
    const far = [this.level.n - 2, 1]; this.entity = new EnemyAI(assets.entity, this.level, far); scene.add(this.entity.root);

    // Air almond (botol dari glTF GitHub) + glow
    const proto = assets.bottle.scene.clone(true); const bb = new THREE.Box3().setFromObject(proto).getSize(new THREE.Vector3()); proto.scale.multiplyScalar(0.45 / bb.y);
    const glowC = document.createElement('canvas'); glowC.width = glowC.height = 64; const g = glowC.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(180,255,160,.9)'); gr.addColorStop(1, 'rgba(180,255,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowC), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.bottles = [];
    const cands = this.level.openTiles.filter(([i, j]) => this.level.path(1, 1, i, j).length > 10 && !(i === this.level.exit.i && j === this.level.exit.j)).sort(() => this.level.rand() - 0.5);
    for (const [i, j] of cands.slice(0, NEED)) {
      const b = proto.clone(true), c = this.level.center(i, j); b.position.set(c.x + (this.level.rand() - 0.5) * 1.2, 0.25, c.z + (this.level.rand() - 0.5) * 1.2);
      b.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      const sp = new THREE.Sprite(glowMat); sp.scale.setScalar(1.3); sp.position.y = 0.3; b.add(sp); scene.add(b); this.bottles.push(b);
    }
    $('bottlesMax').textContent = NEED; this.setHint('Cari 5 air almond, lalu kabur lewat pintu EXIT.');
    this.built.setExitOpen(false); this.t = 0; this.time = 0; this.fear = 0;

    $('btn').addEventListener('click', () => this.start());
    document.addEventListener('pointerlockchange', () => { if (this.state === 'play' && !this.coarse && document.pointerLockElement !== this.dom) this.pause(); });
    $('retry').addEventListener('click', () => location.reload());
  }
  setHint(t) { $('hint').textContent = t; }
  show(id, on) { $(id).style.display = on ? 'flex' : 'none'; }
  start() {
    this.audio.start(); if (!this.coarse) this.dom.requestPointerLock?.();
    this.state = 'play'; this.show('start', false); $('hud').style.display = 'block';
  }
  pause() { this.state = 'menu'; $('startTitle').textContent = 'Dijeda'; $('btn').textContent = 'Lanjut'; this.show('start', true); }
  end(win) {
    this.state = win ? 'win' : 'dead'; document.exitPointerLock?.();
    const best = this.save.load()?.best;
    if (win && (!best || this.time < best)) this.save.save({ best: this.time });
    $('endTitle').textContent = win ? 'Kamu berhasil keluar!' : 'Kamu tertangkap…';
    $('endText').textContent = win ? `Waktu ${this.time.toFixed(1)} dtk${best ? ` • terbaik ${Math.min(best, this.time).toFixed(1)} dtk` : ''}` : 'Siswa Bayangan menemukanmu.';
    this.show('end', true);
  }
  updateLights(t, f) {
    const p = this.player.pos, L = this.built.lights, used = new Set();
    for (const light of this.pool) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < L.length; i++) { if (used.has(i)) continue; const d = (L[i].x - p.x) ** 2 + (L[i].z - p.z) ** 2; if (d < bd) { bd = d; best = i; } }
      if (best < 0) { light.visible = false; continue; }
      used.add(best); const c = L[best]; light.position.copy(c);
      const ph = c.x * 7.3 + c.z * 13.1, off = Math.sin(t * 37 + ph) * Math.sin(t * 11.3 + ph * 2) > 0.93 - 0.35 * f;
      light.intensity = off ? 2 : 10; light.visible = true;
    }
  }
  update(dt) {
    this.t += dt;
    if (this.state === 'play') {
      this.time += dt; this.player.update(dt);
      const pp = this.player.pos, dist = this.entity.update(dt, pp);
      this.fear = THREE.MathUtils.clamp(this.entity.chase ? 1 - dist / 26 : (1 - dist / 10) * 0.6, 0, 1);
      for (let i = this.bottles.length - 1; i >= 0; i--) {
        const b = this.bottles[i]; b.rotation.y += dt * 1.5; b.position.y = 0.25 + Math.sin(this.t * 2 + i) * 0.05;
        if (Math.hypot(b.position.x - pp.x, b.position.z - pp.z) < 1.1) {
          this.scene.remove(b); this.bottles.splice(i, 1); this.inv.add('almond'); this.audio.chime();
          const c = this.inv.count('almond'); if (c >= NEED) { this.built.setExitOpen(true); this.setHint('Semua terkumpul! Lari ke pintu EXIT (pojok tenggara).'); } else this.setHint(`Air almond ${c}/${NEED}`);
        }
      }
      if (Math.hypot(pp.x - this.built.exitPos.x, pp.z - this.built.exitPos.z) < 1.6) {
        if (this.inv.count('almond') >= NEED) this.end(true); else this.setHint(`Pintu terkunci — butuh ${NEED} air almond.`);
      }
      if (dist < 0.95) this.end(false);
      $('bottles').textContent = this.inv.count('almond'); $('stamFill').style.width = `${this.player.stamina * 100}%`; $('time').textContent = this.time.toFixed(0);
      this.audio.beat(this.fear, dt);
    }
    this.updateLights(this.t, this.fear); this.fx.setFear(this.fear, this.t);
  }
}
