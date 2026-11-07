import * as THREE from 'three';

export class PlayerController {
  constructor(camera, dom, level, obstacles, audio) {
    Object.assign(this, { camera, dom, level, obstacles, audio });
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.stamina = 1; this.tired = false;
    this.bob = 0; this.stepAcc = 0; this.keys = {}; this.joy = new THREE.Vector2();
    camera.rotation.order = 'YXZ';
    addEventListener('keydown', (e) => { this.keys[e.code] = true; if (e.code === 'KeyF') this.onFlash?.(); });
    addEventListener('keyup', (e) => (this.keys[e.code] = false));
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== dom) return;
      this.yaw -= e.movementX * 0.0022; this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.4, 1.4);
    });
    // Look dengan sentuhan (drag layar)
    const last = new Map();
    dom.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') last.set(e.pointerId, [e.clientX, e.clientY]); });
    dom.addEventListener('pointermove', (e) => {
      const l = last.get(e.pointerId); if (!l) return;
      this.yaw -= (e.clientX - l[0]) * 0.006; this.pitch = THREE.MathUtils.clamp(this.pitch - (e.clientY - l[1]) * 0.006, -1.4, 1.4); l[0] = e.clientX; l[1] = e.clientY;
    });
    const end = (e) => last.delete(e.pointerId); dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);
    this._bindJoystick();
  }
  _bindJoystick() {
    const base = document.getElementById('joy'), stick = document.getElementById('stick'); if (!base) return;
    let id = null; const R = 50;
    const set = (e) => {
      const r = base.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
      stick.style.transform = `translate(${dx}px,${dy}px)`; this.joy.set(dx / R, dy / R);
    };
    base.addEventListener('pointerdown', (e) => { id = e.pointerId; base.setPointerCapture(id); set(e); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; stick.style.transform = ''; this.joy.set(0, 0); };
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  }
  update(dt) {
    const k = this.keys;
    let ix = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + this.joy.x, iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - this.joy.y;
    const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
    const moving = len > 0.05;
    const want = (k.ShiftLeft || k.ShiftRight || this.joy.length() > 0.9) && moving;
    if (this.stamina <= 0.02) this.tired = true; if (this.tired && this.stamina > 0.3) this.tired = false;
    const sprint = want && !this.tired;
    this.stamina = THREE.MathUtils.clamp(this.stamina + (sprint ? -0.22 : 0.14) * dt, 0, 1);
    const speed = sprint ? 4.6 : 2.4, sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const mx = -sy * iz + cy * ix, mz = -cy * iz - sy * ix;
    const before = this.pos.clone();
    this.level.move(this.pos, mx * speed * dt, mz * speed * dt, 0.3, this.obstacles);
    const moved = before.distanceTo(this.pos);
    this.bob += moved * (sprint ? 2.6 : 3.2); this.stepAcc += moved;
    if (this.stepAcc > (sprint ? 1.3 : 1.0)) { this.stepAcc = 0; this.audio.step(sprint); }
    this.camera.position.set(this.pos.x, 1.65 + Math.sin(this.bob) * 0.04 * (moving ? 1 : 0), this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
