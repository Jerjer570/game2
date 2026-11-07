import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/** "Siswa Bayangan": menjelajah, lalu mengejar via BFS tile begitu melihat/mendengar pemain. */
export class EnemyAI {
  constructor(gltf, level, tile) {
    this.level = level; this.root = SkeletonUtils.clone(gltf.scene); this.root.scale.setScalar(1.2);
    const c = level.center(tile[0], tile[1]); this.root.position.copy(c);
    const dark = new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.5, emissive: 0x1a0000 });
    this.root.traverse((m) => { if (m.isMesh) { m.material = dark; m.castShadow = true; m.frustumCulled = false; } });
    this.mixer = new THREE.AnimationMixer(this.root); this.actions = {};
    for (const a of gltf.animations) this.actions[a.name] = this.mixer.clipAction(a);
    this.cur = null; this.play('Idle'); this.path = []; this.repath = 0; this.alert = 0; this.chase = false;
  }
  play(n) { const a = this.actions[n]; if (!a || a === this.cur) return; a.reset().fadeIn(0.25).play(); this.cur?.fadeOut(0.25); this.cur = a; }
  update(dt, pp) {
    const L = this.level, p = this.root.position, dist = Math.hypot(pp.x - p.x, pp.z - p.z), los = L.los(p.x, p.z, pp.x, pp.z);
    if ((los && dist < 24) || dist < 6) this.alert = 6; else this.alert -= dt;
    this.chase = this.alert > 0;
    this.repath -= dt;
    if (this.repath <= 0 || !this.path.length) {
      this.repath = this.chase ? 0.35 : 1.0;
      const [si, sj] = L.tileOf(p.x, p.z);
      let t;
      if (this.chase) t = L.tileOf(pp.x, pp.z);
      else if (!this.path.length) t = L.openTiles[Math.floor(Math.random() * L.openTiles.length)];
      if (t) this.path = L.path(si, sj, t[0], t[1]);
    }
    let tx = null, tz = null;
    if (this.chase && los && dist < 5) { tx = pp.x; tz = pp.z; }
    else if (this.path.length) {
      const c = L.center(this.path[0][0], this.path[0][1]); tx = c.x; tz = c.z;
      if (Math.hypot(tx - p.x, tz - p.z) < 0.4) this.path.shift();
    }
    if (tx !== null) {
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1, sp = this.chase ? 3.4 : 1.5;
      p.x += (dx / d) * sp * dt; p.z += (dz / d) * sp * dt;
      const t = Math.atan2(dx, dz), diff = ((t - this.root.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      this.root.rotation.y += diff * Math.min(1, 9 * dt); this.play(this.chase ? 'Run' : 'Walk');
    } else this.play('Idle');
    this.mixer.update(dt);
    return dist;
  }
}
