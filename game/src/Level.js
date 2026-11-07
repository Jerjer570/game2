import * as THREE from 'three';

export const TILE = 3, WALL_H = 3;
const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------- Tekstur prosedural ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
function wallpaper() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#c9b955'; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = 'rgba(120,100,30,.22)'; g.fillRect(x, 0, 16, 512); g.fillStyle = 'rgba(255,240,150,.08)'; g.fillRect(x + 16, 0, 6, 512); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${60 + Math.random() * 60 | 0},${50 + Math.random() * 50 | 0},10,${Math.random() * 0.08})`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  for (let i = 0; i < 7; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 30 + Math.random() * 60; const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(70,50,10,.28)'); gr.addColorStop(1, 'rgba(70,50,10,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.fillStyle = 'rgba(55,75,50,.45)'; g.fillRect(0, 350, 512, 162);   // keramik/cat bawah ala dinding sekolah
  g.fillStyle = 'rgba(25,25,10,.5)'; g.fillRect(0, 346, 512, 6);
  return tex(c);
}
function ceilingTex() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#b9b49a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(60,55,40,${Math.random() * 0.12})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.strokeStyle = 'rgba(40,35,20,.7)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256);
  return tex(c);
}
function signTex(text, bg = '#1f5a3a', fg = '#f2f2f2') {
  const [c, g] = canvas(256, 80);
  g.fillStyle = bg; g.fillRect(0, 0, 256, 80); g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 248, 72);
  g.fillStyle = fg; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 42);
  return tex(c);
}
function fitHeight(obj, h) { const b = new THREE.Box3().setFromObject(obj), s = b.getSize(new THREE.Vector3()); obj.scale.multiplyScalar(h / s.y); return obj; }

export class Level {
  constructor(seed = 11, N = 10) {
    this.rand = mulberry(seed); this.n = 2 * N + 1;
    const n = this.n, R = this.rand, at = (i, j) => j * n + i;
    this.g = new Uint8Array(n * n).fill(1);                       // 1 = dinding, 0 = ruang
    // DFS maze di sel ganjil
    const st = [[1, 1]]; this.g[at(1, 1)] = 0;
    while (st.length) {
      const [i, j] = st[st.length - 1];
      const ds = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([a, b]) => { const x = i + a, y = j + b; return x > 0 && y > 0 && x < n - 1 && y < n - 1 && this.g[at(x, y)] === 1; });
      if (!ds.length) { st.pop(); continue; }
      const [a, b] = ds[Math.floor(R() * ds.length)];
      this.g[at(i + a / 2, j + b / 2)] = 0; this.g[at(i + a, j + b)] = 0; st.push([i + a, j + b]);
    }
    // Ruang kelas 3x3 tile (9x9 m)
    this.rooms = [];
    for (let k = 0; k < 6; k++) {
      const ci = 1 + 2 * (1 + Math.floor(R() * (N - 2))), cj = 1 + 2 * (1 + Math.floor(R() * (N - 2)));
      if (ci + cj < 8 || (n - ci) + (n - cj) < 8 || this.rooms.some((r) => Math.abs(r.i - ci) + Math.abs(r.j - cj) < 6)) continue;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) this.g[at(ci + a, cj + b)] = 0;
      this.rooms.push({ i: ci, j: cj });
    }
    // Loop tambahan supaya tidak buntu
    for (let i = 1; i < n - 1; i++) for (let j = 1; j < n - 1; j++) if ((i + j) % 2 === 1 && this.g[at(i, j)] === 1 && R() < 0.12) this.g[at(i, j)] = 0;
    this.openTiles = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!this.g[at(i, j)]) this.openTiles.push([i, j]);
    this.exit = { i: n - 2, j: n - 2 };
  }
  tileOf(x, z) { return [Math.floor(x / TILE), Math.floor(z / TILE)]; }
  center(i, j, y = 0) { return new THREE.Vector3((i + 0.5) * TILE, y, (j + 0.5) * TILE); }
  solidTile(i, j) { return i < 0 || j < 0 || i >= this.n || j >= this.n || this.g[j * this.n + i] === 1; }
  isSolid(x, z) { return this.solidTile(Math.floor(x / TILE), Math.floor(z / TILE)); }
  hit(x, z, r) { return this.isSolid(x - r, z - r) || this.isSolid(x + r, z - r) || this.isSolid(x - r, z + r) || this.isSolid(x + r, z + r); }
  move(pos, dx, dz, r, obs) {
    let x = pos.x + dx; if (this.hit(x, pos.z, r)) x = pos.x;
    let z = pos.z + dz; if (this.hit(x, z, r)) z = pos.z;
    for (const o of obs) { const ox = x - o.x, oz = z - o.z, d = Math.hypot(ox, oz), m = o.r + r; if (d < m && d > 1e-4) { x = o.x + (ox / d) * m; z = o.z + (oz / d) * m; } }
    if (this.hit(x, z, r)) { x = pos.x; z = pos.z; }
    pos.x = x; pos.z = z;
  }
  los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), steps = Math.ceil(d / 0.5);
    for (let k = 1; k < steps; k++) { const t = k / steps; if (this.isSolid(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  path(si, sj, ti, tj) {
    const n = this.n, prev = new Int32Array(n * n).fill(-2), s = si + sj * n, t = ti + tj * n, q = [s]; prev[s] = -1;
    for (let h = 0; h < q.length && q[h] !== t; h++) {
      const c = q[h], ci = c % n, cj = (c / n) | 0;
      for (const [a, b] of D) { const x = ci + a, y = cj + b, k = x + y * n; if (!this.solidTile(x, y) && prev[k] === -2) { prev[k] = c; q.push(k); } }
    }
    if (prev[t] === -2) return [];
    const p = []; for (let c = t; c !== s; c = prev[c]) p.push([c % n, (c / n) | 0]);
    return p.reverse();
  }

  /** Bangun semua mesh level. Mengembalikan { obstacles, lights, setExitOpen, exitPos } */
  build(scene, A) {
    const n = this.n, R = this.rand, W = n * TILE;
    const out = { obstacles: [], lights: [] };

    // Lantai kayu PBR (diffuse + bump + roughness dari GitHub)
    for (const t of [A.floorDiff, A.floorBump, A.floorRough]) t.repeat.set(n, n);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshStandardMaterial({ map: A.floorDiff, bumpMap: A.floorBump, bumpScale: 1, roughnessMap: A.floorRough, color: 0xb5a47a }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 0, W / 2); floor.receiveShadow = true; scene.add(floor);

    const ct = ceilingTex(); ct.repeat.set(n * 2, n * 2);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshStandardMaterial({ map: ct, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(W / 2, WALL_H, W / 2); scene.add(ceil);

    // Dinding (instanced) — hanya tile yang berbatasan dengan ruang terbuka
    const walls = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      if (!this.solidTile(i, j)) continue;
      let vis = false; for (let a = -1; a <= 1 && !vis; a++) for (let b = -1; b <= 1; b++) if (!this.solidTile(i + a, j + b)) { vis = true; break; }
      if (vis) walls.push([i, j]);
    }
    const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, WALL_H, TILE), new THREE.MeshStandardMaterial({ map: wallpaper(), roughness: 0.95 }), walls.length);
    const o = new THREE.Object3D();
    walls.forEach(([i, j], k) => { o.position.set((i + 0.5) * TILE, WALL_H / 2, (j + 0.5) * TILE); o.rotation.set(0, 0, 0); o.updateMatrix(); wm.setMatrixAt(k, o.matrix); });
    wm.castShadow = wm.receiveShadow = true; scene.add(wm);

    // Panel lampu neon di plafon (emissive, HDR agar kena bloom)
    const panelSpots = this.openTiles.filter(([i, j]) => (i + j) % 2 === 0);
    const pm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 0.5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true }), panelSpots.length);
    panelSpots.forEach(([i, j], k) => {
      const c = this.center(i, j, WALL_H - 0.02); o.position.copy(c); o.rotation.set(0, 0, 0); o.updateMatrix(); pm.setMatrixAt(k, o.matrix);
      const dead = R() < 0.2; pm.setColorAt(k, dead ? new THREE.Color(0.08, 0.08, 0.06) : new THREE.Color(3.2, 3.0, 2.2));
      if (!dead) out.lights.push(c.clone().setY(WALL_H - 0.3));
    });
    scene.add(pm);

    // Loker di sepanjang dinding lorong
    const used = new Set(), lockers = [];
    for (const [i, j] of this.openTiles) for (const [a, b] of D) if (this.solidTile(i + a, j + b) && R() < 0.1 && !(i === 1 && j === 1)) { lockers.push([i, j, a, b]); used.add(`${i},${j},${a},${b}`); }
    const lm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 2.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x56707c, metalness: 0.5, roughness: 0.45 }), lockers.length);
    lockers.forEach(([i, j, a, b], k) => {
      const c = this.center(i, j); o.position.set(c.x + a * (TILE / 2 - 0.25), 1.05, c.z + b * (TILE / 2 - 0.25)); o.rotation.set(0, Math.atan2(a, b), 0); o.updateMatrix(); lm.setMatrixAt(k, o.matrix);
      out.obstacles.push({ x: o.position.x, z: o.position.z, r: 0.55 });
    });
    lm.castShadow = lm.receiveShadow = true; scene.add(lm);

    // Papan nama ruangan
    const names = ['KELAS 7A', 'KELAS 8C', 'UKS', 'PERPUSTAKAAN', 'LAB IPA', 'TOILET', 'RUANG GURU', 'KANTIN'];
    const shuffled = [...this.openTiles].sort(() => R() - 0.5); let ns = 0;
    for (const [i, j] of shuffled) {
      if (ns >= names.length) break;
      const d = D.find(([a, b]) => this.solidTile(i + a, j + b) && !used.has(`${i},${j},${a},${b}`)); if (!d) continue;
      const [a, b] = d; used.add(`${i},${j},${a},${b}`);
      const c = this.center(i, j), m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.44), new THREE.MeshStandardMaterial({ map: signTex(names[ns++]), roughness: 0.6 }));
      m.position.set(c.x + a * (TILE / 2 - 0.02), 2.05, c.z + b * (TILE / 2 - 0.02)); m.rotation.y = Math.atan2(-a, -b); scene.add(m);
    }

    // Meja + kursi (kursi dari glTF GitHub) di ruang kelas
    const chairProto = fitHeight(A.chair.scene.clone(true), 0.9);
    chairProto.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
    const desks = [];
    for (const r of this.rooms) {
      const c = this.center(r.i, r.j);
      for (const [ox, oz] of [[-2.8, -2.4], [0, -2.4], [2.8, -2.4], [-2.8, 1.6], [0, 1.6], [2.8, 1.6]]) {
        if (R() < 0.2) continue;
        const yaw = (R() < 0.5 ? 0 : Math.PI) + (R() - 0.5) * 0.3, dx = c.x + ox, dz = c.z + oz;
        desks.push([dx, dz, yaw]); out.obstacles.push({ x: dx, z: dz, r: 0.5 });
        const ch = chairProto.clone(true), s = yaw > 1.5 ? -1 : 1;
        ch.position.set(dx + Math.sin(yaw) * 0.0, 0, dz + 0.65 * s); ch.rotation.y = yaw + Math.PI + (R() - 0.5) * 0.6; scene.add(ch);
        out.obstacles.push({ x: ch.position.x, z: ch.position.z, r: 0.3 });
      }
    }
    const dm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.75, 0.55).translate(0, 0.375, 0), new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.7 }), desks.length);
    desks.forEach(([x, z, yaw], k) => { o.position.set(x, 0, z); o.rotation.set(0, yaw, 0); o.updateMatrix(); dm.setMatrixAt(k, o.matrix); });
    dm.castShadow = dm.receiveShadow = true; scene.add(dm);

    // Pintu EXIT (terkunci sampai semua air almond terkumpul)
    const ec = this.center(this.exit.i, this.exit.j);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.3), new THREE.MeshStandardMaterial({ color: 0x2c3338, metalness: 0.6, roughness: 0.4 }));
    door.position.set(ec.x + TILE / 2 - 0.02, 1.15, ec.z); door.rotation.y = -Math.PI / 2; scene.add(door);
    const redT = signTex('EXIT', '#7a1010'), grnT = signTex('EXIT', '#12803a');
    const exitMat = new THREE.MeshBasicMaterial({ map: redT });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.38), exitMat);
    sign.position.set(ec.x + TILE / 2 - 0.03, 2.55, ec.z); sign.rotation.y = -Math.PI / 2; scene.add(sign);
    out.exitPos = new THREE.Vector3(ec.x + TILE / 2, 0, ec.z);
    out.setExitOpen = (v) => { exitMat.map = v ? grnT : redT; exitMat.color.setScalar(v ? 2.2 : 1); exitMat.needsUpdate = true; };
    return out;
  }
}
