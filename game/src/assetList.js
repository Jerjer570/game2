// Sumber tunggal daftar asset (browser + Node). gh: [user, repo, branch, path]
export const ASSETS = {
  entity:     { type: 'model',   gh: ['mrdoob','three.js','dev','examples/models/gltf/Soldier.glb'],                              local: 'models/Soldier.glb' },
  chair:      { type: 'model',   gh: ['KhronosGroup','glTF-Sample-Assets','main','Models/SheenChair/glTF-Binary/SheenChair.glb'], local: 'models/SheenChair.glb' },
  bottle:     { type: 'model',   gh: ['KhronosGroup','glTF-Sample-Assets','main','Models/WaterBottle/glTF-Binary/WaterBottle.glb'], local: 'models/WaterBottle.glb' },
  floorDiff:  { type: 'texture', srgb: true,  gh: ['mrdoob','three.js','dev','examples/textures/hardwood2_diffuse.jpg'],   local: 'textures/hardwood2_diffuse.jpg' },
  floorBump:  { type: 'texture', srgb: false, gh: ['mrdoob','three.js','dev','examples/textures/hardwood2_bump.jpg'],      local: 'textures/hardwood2_bump.jpg' },
  floorRough: { type: 'texture', srgb: false, gh: ['mrdoob','three.js','dev','examples/textures/hardwood2_roughness.jpg'], local: 'textures/hardwood2_roughness.jpg' }
};
export const rawUrl = ([u, r, b, p]) => `https://raw.githubusercontent.com/${u}/${r}/${b}/${p}`;
export const cdnUrl = ([u, r, b, p]) => `https://cdn.jsdelivr.net/gh/${u}/${r}@${b}/${p}`;
