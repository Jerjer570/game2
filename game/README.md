# Backrooms Sekolah 3D — Three.js + Vite (asset GitHub auto-fetch)

Horor first-person: kamu terjebak di sekolah liminal tak berujung (lorong kuning, loker, kelas dengan meja-kursi).
Kumpulkan **5 air almond**, lalu kabur lewat pintu **EXIT** di pojok tenggara. **Siswa Bayangan** akan mengejarmu.

## Menjalankan
```
npm install
npm run fetch-assets   # opsional: cache lokal + hash
npm run dev
```
Kontrol: WASD, **Shift** lari (stamina), **F** senter, mouse = lihat (klik Mulai untuk pointer-lock). Mobile: joystick + geser layar.

## Struktur
```
src/  main.js  GameManager.js  PlayerController.js  EnemyAI.js  Level.js  Audio.js
      InventorySystem.js  SaveSystem.js  AssetFetcher.js  AssetLoader.js  PostFX.js  assetList.js
      unity_export_manifest.json
scripts/fetch-assets.js     public/asset-manifest.json     public/assets/…
```
- **Level.js**: maze DFS (21×21 tile, 3 m) + 6 kelas 3×3 tile; dinding instanced; panel neon plafon; loker; papan nama; meja/kursi; pintu EXIT.
- **EnemyAI.js**: patroli acak → mengejar (BFS di grid + line-of-sight, memori 6 dtk). Kecepatan kejar 3.4 m/s vs lari pemain 4.6 m/s (stamina terbatas).
- **PostFX.js**: GTAO, bloom, ACES, LUT kuning-hijau, grain/vignette/chromatic aberration yang menguat saat musuh dekat, SMAA.
- Audio prosedural WebAudio: dengung neon, langkah, detak jantung, chime.

## Asset dari GitHub
| Asset | URL raw |
|---|---|
| Soldier.glb (entitas, dimaterialkan hitam) | https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb |
| SheenChair.glb (kursi kelas) | https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb |
| WaterBottle.glb (air almond) | https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb |
| hardwood2_diffuse / _bump / _roughness.jpg (lantai) | https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/hardwood2_diffuse.jpg (dan `_bump`, `_roughness`) |

Fallback: jsDelivr `https://cdn.jsdelivr.net/gh/{user}/{repo}@{branch}/{path}` → file lokal `public/assets`.

## Catatan jujur
- **Belum diuji** (sandbox tanpa jaringan). Jalankan lalu cek console; verifikasi URL di atas sekali.
- Wallpaper, plafon, dan papan nama dibuat **prosedural (canvas)** karena tidak ada tekstur wallpaper/plafon CC0 yang pasti ada di repo GitHub yang dipakai.
- Lisensi: SheenChair CC-BY 4.0 (wajib atribusi), Soldier dari Mixamo — cek sebelum rilis komersial.
- Skala Soldier (1.2) dan intensitas lampu (`PointLight 10`) mungkin perlu disetel.
- Kursi hanya dekorasi; musuh menembus furnitur.

## Panduan Unity
1. Project Unity 2022.3 LTS+ template **HDRP**.
2. Package Manager → *Add package by name* → `com.unity.cloud.gltfast`.
3. Salin `public/assets/` ke `Assets/ThreeExport/`; `.glb` otomatis jadi prefab + material PBR + animasi.
4. Level: buat `LevelGenerator.cs` (port `Level.js`: DFS maze, ruang 3×3, tile 3 m). Dinding = Cube + material wallpaper (buat di Shader Graph/atau texture sendiri), GPU Instancing aktif.
5. Lantai: material Lit dengan diffuse/height/roughness (tiling 21×21).
6. Pencahayaan: Volume → Fog (warna #2f2a12), Tonemapping ACES, Bloom, Ambient Occlusion, Color Adjustments (kuning-hijau), Film Grain, Vignette, Chromatic Aberration. Lampu neon = Area Light/Emissive material; senter = Spot Light (shadow) di child kamera.
7. Player: `CharacterController` + kamera FPS; entitas: `NavMeshAgent` (bake NavMesh) + Animator (Idle/Walk/Run).
8. Port logika (tabel) lalu Build.

| Three.js | Unity C# |
|---|---|
| `setAnimationLoop` | `Update()` |
| `clock.getDelta()` | `Time.deltaTime` |
| `level.move()` + collision tile | `CharacterController.Move()` |
| `level.los()` | `Physics.Raycast` |
| `level.path()` BFS | `NavMeshAgent.SetDestination()` |
| `keys.KeyW` | `Input.GetKey(KeyCode.W)` |
| `AnimationMixer` | `Animator.CrossFade` |
| `InstancedMesh` | GPU Instancing / `Graphics.DrawMeshInstanced` |
| `SpotLight` di kamera | `Light(Spot)` child `Camera` |
| `localStorage` | `PlayerPrefs` |
