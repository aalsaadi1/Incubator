import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

function b64(f32orU32) {
  const bytes = new Uint8Array(f32orU32.buffer, f32orU32.byteOffset, f32orU32.byteLength);
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}

async function texToDataURL(tex, size, type, q) {
  if (!tex || !tex.image) return null;
  const img = tex.image;
  if (img.decode) { try { await img.decode(); } catch (e) {} }
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  return cv.toDataURL(type, q);
}

window.__status = 'loading';
(async () => {
  try {
    const buf = await (await fetch('/da630c0c-lod_basic_pbr.fbx')).arrayBuffer();
    const root = new FBXLoader().parse(buf, '/');
    await new Promise((r) => setTimeout(r, 2500)); // let embedded blob images load

    const meshes = [];
    let diffuse = null, normal = null;
    const report = [];
    root.traverse((n) => {
      if (!n.isMesh || n.name !== 'model_LOD1') return;
      n.updateWorldMatrix(true, false);
      let g = n.geometry.clone().applyMatrix4(n.matrixWorld);
      report.push({
        name: n.name, verts: g.attributes.position.count,
        indexed: !!g.index, groups: g.groups ? g.groups.length : 0,
        mats: Array.isArray(n.material) ? n.material.map((m) => m.name) : [n.material.name],
        hasUV: !!g.attributes.uv,
      });
      if (g.index) g = g.toNonIndexed();
      const rec = { name: n.name, position: b64(g.attributes.position.array) };
      if (g.attributes.normal) rec.normal = b64(g.attributes.normal.array);
      if (g.attributes.uv) rec.uv = b64(g.attributes.uv.array);
      if (g.groups && g.groups.length > 1) rec.groups = g.groups.map((gr) => ({ start: gr.start, count: gr.count, mat: gr.materialIndex }));
      meshes.push(rec);
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of mats) {
        if (!diffuse && m.map) diffuse = m.map;
        if (!normal && m.normalMap) normal = m.normalMap;
      }
    });

    const out = {
      meshes,
      diffuse: await texToDataURL(diffuse, 1024, 'image/jpeg', 0.92),
      normal: await texToDataURL(normal, 1024, 'image/jpeg', 0.92),
    };
    window.__report = JSON.stringify(report, null, 1);
    window.__result = JSON.stringify(out);
    window.__status = 'done';

    /* quick visual check: render it */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(900, 700);
    document.body.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0ebe1);
    const cam = new THREE.PerspectiveCamera(38, 900 / 700, 0.1, 1000);
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0xcdc3d8, 1.2));
    const dl = new THREE.DirectionalLight(0xffffff, 1.4);
    dl.position.set(2, 4, 4);
    scene.add(dl);
    root.traverse((n) => { if (n.isMesh && n.name !== 'model_LOD1') n.visible = false; });
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    root.position.sub(c);
    const s = 2 / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(s);
    root.position.multiplyScalar(s);
    scene.add(root);
    cam.position.set(0.4, 0.3, 4.4);
    renderer.render(scene, cam);
  } catch (e) {
    window.__status = 'error: ' + (e.stack || e.message);
  }
})();
