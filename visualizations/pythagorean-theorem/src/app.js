import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ---------------- scene ---------------- */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0.5, 0.25, 4.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 1.6;
controls.maxDistance = 7;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;

/* lights — soft cream key + warm inner glow like the reference */
scene.add(new THREE.HemisphereLight(0xfff6e8, 0xcdc3d8, 1.15));
const key = new THREE.DirectionalLight(0xffffff, 1.3);
key.position.set(2.5, 4, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xbcc4ff, 0.55);
rim.position.set(-3, -1, -3);
scene.add(rim);

const glowGroup = new THREE.Group();
[[0, -0.42, 0.5], [-0.46, 0.52, 0.5], [0.5, 0.55, 0.5]].forEach(([x, y, z]) => {
  const p = new THREE.PointLight(0xffcf9a, 1.2, 1.3, 2);
  p.position.set(x, y, z);
  glowGroup.add(p);
});
scene.add(glowGroup);

/* soft ground shadow */
{
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 126);
  g.addColorStop(0, 'rgba(90,75,100,.30)');
  g.addColorStop(1, 'rgba(90,75,100,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 1.35),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.22;
  scene.add(shadow);
}

/* ---------------- geometry analysis helpers ---------------- */

/* connected components over a non-indexed BufferGeometry (weld by rounded position) */
function splitComponents(geom) {
  const pos = geom.attributes.position;
  const triCount = pos.count / 3;
  const parent = new Int32Array(triCount);
  for (let i = 0; i < triCount; i++) parent[i] = i;
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const vmap = new Map();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const key = `${Math.round(pos.getX(i) * 1500)},${Math.round(pos.getY(i) * 1500)},${Math.round(pos.getZ(i) * 1500)}`;
      const seen = vmap.get(key);
      if (seen === undefined) vmap.set(key, t);
      else union(t, seen);
    }
  }
  const groups = new Map();
  for (let t = 0; t < triCount; t++) {
    const r = find(t);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(t);
  }
  return [...groups.values()];
}

function geomFromTris(srcGeom, tris) {
  const g = new THREE.BufferGeometry();
  for (const [name, itemSize] of [['position', 3], ['normal', 3], ['uv', 2]]) {
    const src = srcGeom.attributes[name];
    if (!src) continue;
    const arr = new Float32Array(tris.length * 3 * itemSize);
    let o = 0;
    for (const t of tris) {
      for (let k = 0; k < 3; k++) {
        const i = t * 3 + k;
        for (let c = 0; c < itemSize; c++) arr[o++] = src.array[i * itemSize + c];
      }
    }
    g.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/* front-facing projected area + centroid + bbox of a component */
function compStats(srcPos, tris) {
  let frontArea = 0, cx = 0, cy = 0, n = 0;
  const bb = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9, maxZ: -1e9 };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cr = new THREE.Vector3();
  for (const t of tris) {
    a.fromBufferAttribute(srcPos, t * 3); b.fromBufferAttribute(srcPos, t * 3 + 1); c.fromBufferAttribute(srcPos, t * 3 + 2);
    for (const v of [a, b, c]) {
      if (v.x < bb.minX) bb.minX = v.x; if (v.x > bb.maxX) bb.maxX = v.x;
      if (v.y < bb.minY) bb.minY = v.y; if (v.y > bb.maxY) bb.maxY = v.y;
      if (v.z > bb.maxZ) bb.maxZ = v.z;
    }
    cx += (a.x + b.x + c.x) / 3; cy += (a.y + b.y + c.y) / 3; n++;
    ab.subVectors(b, a); ac.subVectors(c, a); cr.crossVectors(ab, ac);
    const area = cr.length() / 2;
    if (area > 0 && cr.z / cr.length() > 0.6 && (a.z + b.z + c.z) / 3 > 0) frontArea += area;
  }
  return { frontArea, centroid: { x: cx / n, y: cy / n }, bb };
}

/* convex hull (monotone chain) + min-area rectangle via rotating edges */
function convexHull(pts) {
  pts = [...pts].sort((p, q) => p.x - q.x || p.y - q.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}
function minAreaRect(pts) {
  const hull = convexHull(pts);
  let best = null;
  for (let i = 0; i < hull.length; i++) {
    const p = hull[i], q = hull[(i + 1) % hull.length];
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    const cos = Math.cos(-ang), sin = Math.sin(-ang);
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const pt of hull) {
      const x = pt.x * cos - pt.y * sin, y = pt.x * sin + pt.y * cos;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
    const area = (maxx - minx) * (maxy - miny);
    if (!best || area < best.area) best = { area, ang, minx, maxx, miny, maxy };
  }
  const rcx = (best.minx + best.maxx) / 2, rcy = (best.miny + best.maxy) / 2;
  const cos = Math.cos(best.ang), sin = Math.sin(best.ang);
  return {
    center: { x: rcx * cos - rcy * sin, y: rcx * sin + rcy * cos },
    width: best.maxx - best.minx,
    height: best.maxy - best.miny,
    angle: best.ang,
  };
}

/* ---------------- floating labels (canvas sprites) ---------------- */
function makeLabel() {
  const cv = document.createElement('canvas');
  cv.width = 380; cv.height = 150;
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.renderOrder = 20;
  sprite.scale.set(0.56, 0.221, 1);
  const set = (text) => {
    ctx.clearRect(0, 0, 380, 150);
    ctx.fillStyle = 'rgba(251,249,244,.97)';
    ctx.strokeStyle = '#ddd4c4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, 368, 138, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b5468';
    ctx.font = '700 72px Archivo, "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 190, 80);
    tex.needsUpdate = true;
  };
  return { sprite, set };
}

/* ---------------- model: load, segment, decorate ---------------- */
const model = new THREE.Group();
scene.add(model);
const parts = {};           // a | b | c -> part record
let frameGroup = null;
const raycastTargets = [];
const sideLetters = [];

const PART_N = { a: 3, b: 4, c: 5 };

{
  const data = JSON.parse(document.getElementById('modeldata').textContent);
  const f32 = (s) => {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Float32Array(bytes.buffer);
  };

  /* textures (baked colors + engraved detail), scrubbed of the baked-in
     side letters: within the UV area of front-facing triangles, dark marks
     sitting on a bright ground are the letters — inpaint them from their
     surroundings in BOTH maps. Crisp letter sprites replace them in 3D. */
  const TS = 1024;
  let cleanMaskTris = null; // filled after segmentation, before images decode
  const texJobs = { diff: null, norm: null, pending: 0 };

  function buildMask() {
    const mcv = document.createElement('canvas');
    mcv.width = mcv.height = TS;
    const mctx = mcv.getContext('2d');
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, TS, TS);
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    for (const t of cleanMaskTris) {
      mctx.moveTo(t[0] * TS, (1 - t[1]) * TS);
      mctx.lineTo(t[2] * TS, (1 - t[3]) * TS);
      mctx.lineTo(t[4] * TS, (1 - t[5]) * TS);
      mctx.closePath();
    }
    mctx.fill();
    const m = mctx.getImageData(0, 0, TS, TS).data;
    const mask = new Uint8Array(TS * TS);
    for (let i = 0; i < TS * TS; i++) mask[i] = m[i * 4] > 128 ? 1 : 0;
    /* erode 3px so island-edge bevels are untouched */
    const eroded = new Uint8Array(TS * TS);
    for (let y = 3; y < TS - 3; y++) for (let x = 3; x < TS - 3; x++) {
      if (!mask[y * TS + x]) continue;
      let ok = true;
      for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3 && dx <= 3 && ok; dx++) if (!mask[(y + dy) * TS + x + dx]) ok = false;
      if (ok) eroded[y * TS + x] = 1;
    }
    return eroded;
  }

  function detectLetters(d, eroded) {
    const lum = new Float32Array(TS * TS);
    for (let i = 0; i < TS * TS; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const bad = new Uint8Array(TS * TS);
    const seeds = [];
    const R = 9, SAMPLES = 16;
    for (let y = R; y < TS - R; y++) for (let x = R; x < TS - R; x++) {
      const i = y * TS + x;
      if (!eroded[i] || lum[i] >= 128) continue;
      let ring = 0;
      for (let s = 0; s < SAMPLES; s++) {
        const ang = (s / SAMPLES) * Math.PI * 2;
        ring += lum[((y + Math.round(Math.sin(ang) * R)) * TS) + x + Math.round(Math.cos(ang) * R)];
      }
      if (ring / SAMPLES > 150) { bad[i] = 1; seeds.push(i); }
    }
    /* flood into connected dark pixels (thick letter interiors) */
    let frontier = seeds.slice();
    while (frontier.length) {
      const next = [];
      for (const i of frontier) {
        const x = i % TS, y = (i / TS) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (y + dy) * TS + x + dx;
          if (eroded[j] && !bad[j] && lum[j] < 148) { bad[j] = 1; next.push(j); seeds.push(j); }
        }
      }
      frontier = next;
    }
    /* dilate 2px */
    let list = seeds;
    for (let pass = 0; pass < 3; pass++) {
      const grown = [];
      for (const i of list) {
        const x = i % TS, y = (i / TS) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (y + dy) * TS + x + dx;
          if (eroded[j] && !bad[j]) { bad[j] = 1; grown.push(j); }
        }
      }
      list = list.concat(grown);
    }
    return { bad, list };
  }

  function inpaint(d, badIn, listIn) {
    const bad = badIn.slice();
    let remaining = listIn.slice();
    for (let iter = 0; iter < 120 && remaining.length; iter++) {
      const next = [], filled = [];
      for (const i of remaining) {
        const x = i % TS, y = (i / TS) | 0;
        let r = 0, g = 0, b = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= TS || yy >= TS) continue;
          const j = yy * TS + xx;
          if (bad[j]) continue;
          r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
        }
        if (n >= 2) { d[i * 4] = r / n; d[i * 4 + 1] = g / n; d[i * 4 + 2] = b / n; filled.push(i); }
        else next.push(i);
      }
      if (!filled.length) break;
      for (const i of filled) bad[i] = 0;
      remaining = next;
    }
  }

  function finishTextures() {
    if (texJobs.pending > 0 || !texJobs.diff || !cleanMaskTris) return;
    const eroded = buildMask();
    const dImg = texJobs.diff.ctx.getImageData(0, 0, TS, TS);
    const { bad, list } = detectLetters(dImg.data, eroded);
    /* baked-in sculpting-tool marks the thresholds miss — scrub these spots outright (uv + radius px) */
    for (const [u, v, r] of [[0.141, 0.187, 13]]) {
      const cx = Math.round(u * TS), cy = Math.round((1 - v) * TS);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= TS || y >= TS) continue;
        const i = y * TS + x;
        if (!bad[i]) { bad[i] = 1; list.push(i); }
      }
    }
    inpaint(dImg.data, bad, list);
    texJobs.diff.ctx.putImageData(dImg, 0, 0);
    texJobs.diff.tex.needsUpdate = true;
    if (texJobs.norm) {
      /* the letters are engraved in the normal map slightly wider than their
         color marks — flatten any bump deviation NEAR the detected letters,
         without touching the grid engraving elsewhere */
      const region = new Uint8Array(TS * TS);
      let frontier = list.slice();
      for (const i of list) region[i] = 1;
      for (let pass = 0; pass < 10; pass++) {
        const next = [];
        for (const i of frontier) {
          const x = i % TS, y = (i / TS) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= TS || yy >= TS) continue;
            const j = yy * TS + xx;
            if (!region[j] && eroded[j]) { region[j] = 1; next.push(j); }
          }
        }
        frontier = next;
      }
      const nImg = texJobs.norm.ctx.getImageData(0, 0, TS, TS);
      const nd = nImg.data;
      const badN = bad.slice();
      const listN = list.slice();
      for (let i = 0; i < TS * TS; i++) {
        if (!region[i] || badN[i]) continue;
        if (Math.abs(nd[i * 4] - 128) > 22 || Math.abs(nd[i * 4 + 1] - 128) > 22) { badN[i] = 1; listN.push(i); }
      }
      inpaint(nd, badN, listN);
      texJobs.norm.ctx.putImageData(nImg, 0, 0);
      texJobs.norm.tex.needsUpdate = true;
    }
  }

  const mkTex = (dataURL, srgb, slot) => {
    if (!dataURL) return null;
    const cv = document.createElement('canvas');
    cv.width = cv.height = TS;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const tex = new THREE.CanvasTexture(cv);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    texJobs.pending++;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, TS, TS);
      tex.needsUpdate = true;
      texJobs[slot] = { ctx, tex };
      texJobs.pending--;
      document.getElementById('loader').classList.add('hide');
      finishTextures();
    };
    img.src = dataURL;
    return tex;
  };
  const diffTex = mkTex(data.diffuse, true, 'diff');
  const normTex = mkTex(data.normal, false, 'norm');

  /* geometry: decode, then normalize to the same local span the layout constants assume */
  const mesh0 = data.meshes[0];
  const srcGeom = new THREE.BufferGeometry();
  srcGeom.setAttribute('position', new THREE.BufferAttribute(f32(mesh0.position), 3));
  if (mesh0.normal) srcGeom.setAttribute('normal', new THREE.BufferAttribute(f32(mesh0.normal), 3));
  if (mesh0.uv) srcGeom.setAttribute('uv', new THREE.BufferAttribute(f32(mesh0.uv), 2));
  srcGeom.center();
  {
    srcGeom.computeBoundingBox();
    const size = srcGeom.boundingBox.getSize(new THREE.Vector3());
    const k = 1.9 / Math.max(size.x, size.y, size.z);
    const pos = srcGeom.attributes.position.array;
    for (let i = 0; i < pos.length; i++) pos[i] *= k;
  }
  const srcPos = srcGeom.attributes.position;

  const sqMat = () => new THREE.MeshStandardMaterial({
    map: diffTex,
    normalMap: normTex,
    roughness: 0.5,
    metalness: 0.05,
    emissive: 0xffffff,
    emissiveMap: diffTex,
    emissiveIntensity: 0.12,
  });

  /* segment into connected components; the three biggest front faces are the squares */
  const comps = splitComponents(srcGeom).map((tris) => ({ tris, ...compStats(srcPos, tris) }));

  /* front-facing UV triangles of the whole model -> letter-cleaning mask */
  if (srcGeom.attributes.uv) {
    const uv = srcGeom.attributes.uv.array;
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cr = new THREE.Vector3();
    cleanMaskTris = [];
    const triCount = srcPos.count / 3;
    for (let t = 0; t < triCount; t++) {
      va.fromBufferAttribute(srcPos, t * 3); vb.fromBufferAttribute(srcPos, t * 3 + 1); vc.fromBufferAttribute(srcPos, t * 3 + 2);
      ab.subVectors(vb, va); ac.subVectors(vc, va); cr.crossVectors(ab, ac);
      const len = cr.length();
      const front = len > 0 && cr.z / len > 0.3 && (va.z + vb.z + vc.z) / 3 > 0;
      const top = len > 0 && cr.y / len > 0.35;
      if (front || top) {
        const i0 = t * 3, i1 = t * 3 + 1, i2 = t * 3 + 2;
        cleanMaskTris.push([uv[i0 * 2], uv[i0 * 2 + 1], uv[i1 * 2], uv[i1 * 2 + 1], uv[i2 * 2], uv[i2 * 2 + 1]]);
      }
    }
    finishTextures();
  }
  comps.sort((p, q) => q.frontArea - p.frontArea);
  const squares = comps.slice(0, Math.min(3, comps.length));
  const rest = comps.slice(squares.length);

  /* the model engraves its own letters: a = top-left, b = top-right, c = bottom */
  const used = new Set();
  const keyFor = (comp) => {
    const k = comp.centroid.y < -0.05 ? 'c' : comp.centroid.x < 0 ? 'a' : 'b';
    return used.has(k) ? null : k;
  };
  const ranked = [...squares].sort((p, q) => p.frontArea - q.frontArea); // a smallest .. c biggest fallback
  squares.forEach((compData) => {
    let keyName = keyFor(compData);
    if (!keyName) keyName = ['a', 'b', 'c'].find((k) => !used.has(k));
    used.add(keyName);
    const g = geomFromTris(srcGeom, compData.tris);
    const mat = sqMat();
    const mesh = new THREE.Mesh(g, mat);
    mesh.userData.part = keyName;
    const group = new THREE.Group();
    group.add(mesh);

    /* fitted front rectangle -> counting tile grid */
    const frontPts = [];
    for (const t of compData.tris) {
      for (let k = 0; k < 3; k++) {
        const i = t * 3 + k;
        if (srcPos.getZ(i) > compData.bb.maxZ - 0.03) frontPts.push({ x: srcPos.getX(i), y: srcPos.getY(i) });
      }
    }
    let rect = null;
    if (frontPts.length > 8) rect = minAreaRect(frontPts);
    let tiles = null;
    if (rect) {
      const n = PART_N[keyName];
      const cw = rect.width / n, ch = rect.height / n;
      const tileGeom = new THREE.BoxGeometry(cw * 0.84, ch * 0.84, 0.02);
      const tileMat = new THREE.MeshBasicMaterial({ color: 0xffedc4, transparent: true, opacity: 0.95 });
      const im = new THREE.InstancedMesh(tileGeom, tileMat, n * n);
      im.renderOrder = 10;
      const mtx = new THREE.Matrix4();
      const positions = [];
      const cos = Math.cos(rect.angle), sin = Math.sin(rect.angle);
      for (let r = 0; r < n; r++) {
        for (let col = 0; col < n; col++) {
          const lx = -rect.width / 2 + (col + 0.5) * cw;
          const ly = rect.height / 2 - (r + 0.5) * ch;
          positions.push(new THREE.Vector3(
            rect.center.x + lx * cos - ly * sin,
            rect.center.y + lx * sin + ly * cos,
            compData.bb.maxZ + 0.018
          ));
        }
      }
      positions.forEach((p, i) => { mtx.compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rect.angle), new THREE.Vector3(0, 0, 0)); im.setMatrixAt(i, mtx); });
      im.instanceMatrix.needsUpdate = true;
      im.userData = { positions, angle: rect.angle };
      group.add(im);
      tiles = im;
    }

    /* floating value label */
    const label = makeLabel();
    label.sprite.position.set(compData.centroid.x, compData.centroid.y, compData.bb.maxZ + 0.3);
    group.add(label.sprite);

    model.add(group);
    raycastTargets.push(mesh);
    parts[keyName] = {
      key: keyName, group, mesh, mat, label, tiles, n: PART_N[keyName],
      rect, center2d: rect ? rect.center : compData.centroid,
      dir: new THREE.Vector3(compData.centroid.x, compData.centroid.y, 0).normalize(),
      baseEmissive: 0.12,
    };
  });

  /* everything else: the cream triangle frame (its baked letters get scrubbed) */
  if (rest.length) {
    const allTris = rest.flatMap((r) => r.tris);
    const g = geomFromTris(srcGeom, allTris);
    const mat = sqMat();
    const mesh = new THREE.Mesh(g, mat);
    frameGroup = new THREE.Group();
    frameGroup.add(mesh);
    model.add(frameGroup);

    /* crisp side letters on the bars, matching the app's typography */
    const frameStats = compStats(srcPos, allTris);
    const frontZ = frameStats.bb.maxZ;
    const T = frameStats.centroid;
    for (const k of Object.keys(parts)) {
      const p = parts[k];
      if (!p.rect) continue;
      const S = p.center2d;
      const dir = new THREE.Vector2(T.x - S.x, T.y - S.y).normalize();
      const half = Math.min(p.rect.width, p.rect.height) / 2;
      const cv = document.createElement('canvas');
      cv.width = cv.height = 200;
      const ctx = cv.getContext('2d');
      ctx.font = 'italic 700 128px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(251,249,244,.95)';
      ctx.lineWidth = 26;
      ctx.strokeText(k, 100, 108);
      ctx.fillStyle = '#6b5468';
      ctx.fillText(k, 100, 108);
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.scale.set(0.15, 0.15, 1);
      sprite.position.set(S.x + dir.x * (half + 0.01), S.y + dir.y * (half + 0.01), frontZ + 0.045);
      /* the a/b bars are welded to their squares (they travel on explode); c's bar stays with the frame */
      (k === 'c' ? frameGroup : p.group).add(sprite);
      sideLetters.push(sprite);
    }
  }

  model.position.y = 0.02;
}

/* ---------------- shared helpers ---------------- */
const $ = (id) => document.getElementById(id);
const chip = $('chip'), chipT1 = $('chipT1'), chipT2 = $('chipT2'), chipAnswers = $('chipAnswers');
const chipStreak = $('chipStreak'), hintBtn = $('hintBtn');
const toast = $('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/* ---------------- 3D labels: values or letters ---------------- */
let labelMode = 'values';
function refreshLabels() {
  for (const k of Object.keys(parts)) {
    const p = parts[k];
    p.label.set(labelMode === 'values' ? `${k}² = ${p.n * p.n}` : k);
  }
}
refreshLabels();

/* ---------------- counting animation ---------------- */
let countState = null; // { part, i, timer, endTimer }
function hideTiles(part) {
  if (!part.tiles) return;
  const im = part.tiles, mtx = new THREE.Matrix4();
  im.userData.positions.forEach((p, i) => {
    mtx.compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), im.userData.angle), new THREE.Vector3(0, 0, 0));
    im.setMatrixAt(i, mtx);
  });
  im.instanceMatrix.needsUpdate = true;
}
function stopCount() {
  if (!countState) return;
  clearInterval(countState.timer);
  clearTimeout(countState.endTimer);
  hideTiles(countState.part);
  refreshLabels();
  countState = null;
}
function startCount(part, onDone) {
  stopCount();
  if (!part.tiles) return;
  const im = part.tiles;
  const total = part.n * part.n;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), im.userData.angle);
  const mtx = new THREE.Matrix4();
  const per = part.n === 5 ? 85 : part.n === 4 ? 115 : 150;
  let i = 0;
  part.label.set('0');
  countState = { part, timer: null, endTimer: null };
  countState.timer = setInterval(() => {
    mtx.compose(im.userData.positions[i], q, new THREE.Vector3(1, 1, 1));
    im.setMatrixAt(i, mtx);
    im.instanceMatrix.needsUpdate = true;
    i++;
    part.label.set(String(i));
    if (chipCountFollows) chipT2.textContent = `${i} of ${total} unit squares`;
    if (i >= total) {
      clearInterval(countState.timer);
      part.label.set(`${part.key}² = ${total}`);
      countState.endTimer = setTimeout(() => {
        hideTiles(part);
        refreshLabels();
        countState = null;
        if (onDone) onDone();
      }, 1500);
    }
  }, per);
}
let chipCountFollows = false;
function countWithChip(part) {
  chipCountFollows = true;
  const total = part.n * part.n;
  chipT1.textContent = `Counting ${part.key}² — side ${part.n}`;
  chipT2.textContent = `0 of ${total} unit squares`;
  pulseRow(part.key, true);
  startCount(part, () => {
    chipCountFollows = false;
    chipT1.textContent = `${part.key}² = ${part.n} × ${part.n} = ${total}`;
    chipT2.textContent = total === 25 ? '9 + 16 = 25 — the theorem in cubes!' : 'Every side carries its own square';
    pulseRow(part.key, false);
    if (mode === 'explore') setTimeout(() => { if (mode === 'explore' && !countState) setExploreChip(); }, 2600);
  });
}
function pulseRow(k, on) {
  const row = { a: $('rowA'), b: $('rowB'), c: $('rowC') }[k];
  if (!row) return;
  if (on) row.classList.add('pulse'); else row.classList.remove('pulse');
}

/* ---------------- hover + click picking ---------------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoverPart = null;
let downPos = null;

function pickPart(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(raycastTargets, false)[0];
  return hit ? parts[hit.object.userData.part] : null;
}
renderer.domElement.addEventListener('pointermove', (e) => {
  const p = pickPart(e);
  if (p !== hoverPart) {
    hoverPart = p;
    renderer.domElement.style.cursor = p ? 'pointer' : '';
  }
});
renderer.domElement.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 6) return;
  const p = pickPart(e);
  if (p) countWithChip(p);
});

/* ---------------- view tools ---------------- */
let exploded = false, explodeF = 0;
$('btnExplode').addEventListener('click', () => {
  exploded = !exploded;
  $('btnExplode').classList.toggle('on', exploded);
});
$('btnLabels').addEventListener('click', () => {
  const on = $('btnLabels').classList.toggle('on');
  for (const k of Object.keys(parts)) parts[k].label.sprite.visible = on;
  for (const s of sideLetters) s.visible = on;
});

/* ---------------- render loop ---------------- */
let highlightKey = null;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  glowGroup.children.forEach((p, i) => (p.intensity = 1.1 + Math.sin(t * 2.1 + i * 1.7) * 0.4));
  model.position.y = 0.02 + Math.sin(t * 0.8) * 0.022;

  explodeF += ((exploded ? 1 : 0) - explodeF) * 0.07;
  for (const k of Object.keys(parts)) {
    const p = parts[k];
    p.group.position.copy(p.dir).multiplyScalar(0.34 * explodeF);
    let target = p.baseEmissive;
    if (hoverPart === p) target += 0.3;
    if (highlightKey === k) target += 0.35 + Math.sin(t * 5) * 0.18;
    if (countState && countState.part === p) target += 0.4;
    p.mat.emissiveIntensity += (target - p.mat.emissiveIntensity) * 0.15;
  }

  controls.update();
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------------- progress (persisted) ---------------- */
const DEFAULT_PROGRESS = { xp: 22, level: 10, done: {}, correct: 0, streakBest: 0 };
let progress = { ...DEFAULT_PROGRESS };
try {
  const saved = JSON.parse(localStorage.getItem('mathExplorerProgress'));
  if (saved && typeof saved === 'object') progress = { ...DEFAULT_PROGRESS, ...saved };
} catch (e) { /* fresh start */ }
function save() {
  try { localStorage.setItem('mathExplorerProgress', JSON.stringify(progress)); } catch (e) { /* private mode */ }
}
function renderProgress() {
  $('xpFill').style.width = progress.xp + '%';
  $('levelLabel').textContent = 'LEVEL ' + progress.level;
  document.querySelectorAll('.concept').forEach((b) => b.classList.toggle('done', !!progress.done[b.dataset.topic]));
  $('obj1').classList.toggle('done', !!progress.done.rightangles);
  $('obj2').classList.toggle('done', progress.correct >= 3);
  $('obj3').classList.toggle('done', !!(progress.done.squares || progress.done.proof));
}
function addXP(n) {
  progress.xp += n;
  if (progress.xp >= 100) {
    progress.xp -= 100;
    progress.level++;
    showToast(`Level up! Welcome to Level ${progress.level} 🎉`);
  }
  save();
  renderProgress();
}
function completeTopic(topic, name) {
  if (progress.done[topic]) { showToast(`"${name}" already mastered ✓`); return; }
  progress.done[topic] = true;
  showToast(`Topic complete: ${name} ✓  +15 XP`);
  addXP(15);
}
renderProgress();

/* ---------------- adjustable triangle ---------------- */
const tri = { a: 3, b: 4 };
const isPerfect = () => Number.isInteger(Math.sqrt(tri.a * tri.a + tri.b * tri.b));
const hyp = () => Math.sqrt(tri.a * tri.a + tri.b * tri.b);
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2));

function renderTriangle() {
  const a = tri.a, b = tri.b, c = hyp();
  $('unitsA').textContent = a + ' units';
  $('unitsB').textContent = b + ' units';
  $('unitsC').textContent = fmt(c) + ' units';
  $('barA').style.width = Math.min(100, a * 15.3) + '%';
  $('barB').style.width = Math.min(100, b * 15.3) + '%';
  $('barC').style.width = Math.min(100, c * 15.3) + '%';
  $('sumLine').textContent = `${a * a} + ${b * b} = ${a * a + b * b}`;
  $('sumNote').textContent = isPerfect()
    ? `perfect triple — c = ${c} exactly`
    : `c = √${a * a + b * b} ≈ ${c.toFixed(2)}`;
  if (mode === 'explore' && !countState) setExploreChip();
}
function setExploreChip() {
  const c = hyp();
  if (isPerfect()) {
    chipT1.textContent = `${tri.a}:${tri.b}:${c} Triangle`;
    chipT2.textContent = 'Tap a square on the model to count its cells';
  } else {
    chipT1.textContent = `Right Triangle  a=${tri.a}, b=${tri.b}`;
    chipT2.textContent = `c = √${tri.a * tri.a + tri.b * tri.b} ≈ ${c.toFixed(2)}`;
  }
}
function setSides(a, b, announce) {
  tri.a = Math.min(12, Math.max(1, a));
  tri.b = Math.min(12, Math.max(1, b));
  renderTriangle();
  if (announce) showToast(`Triangle set to a=${tri.a}, b=${tri.b} — check the panel!`);
}
document.querySelectorAll('.stepbtn').forEach((btn) => {
  if (!btn.dataset.side) return;
  btn.addEventListener('click', () => {
    const d = Number(btn.dataset.d);
    if (btn.dataset.side === 'a') setSides(tri.a + d, tri.b);
    else setSides(tri.a, tri.b + d);
    if (mode === 'practice') showPracticeStep();
  });
});

/* ---------------- lessons ---------------- */
const lessonBack = $('lessonBack'), lessonTitle = $('lessonTitle'), lessonBody = $('lessonBody');

function addCheck(container, topic, name, question, options, answer, explain) {
  const wrap = el('div', 'check');
  wrap.appendChild(el('div', 'label', 'CHECK YOURSELF'));
  wrap.appendChild(el('div', 'q', question));
  const opts = el('div', 'opts');
  const note = el('div', 'done-note');
  options.forEach((o) => {
    const b = el('button', '', String(o));
    b.addEventListener('click', () => {
      if (String(o) === String(answer)) {
        b.classList.add('good');
        note.style.display = 'block';
        note.textContent = `✓ Correct — ${explain}`;
        completeTopic(topic, name);
      } else {
        b.classList.add('bad');
        setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    opts.appendChild(b);
  });
  wrap.appendChild(opts);
  wrap.appendChild(note);
  container.appendChild(wrap);
}

function grid(rowsN, colsN, colorFor) {
  const g = el('div', 'cellgrid');
  g.style.gridTemplateColumns = `repeat(${colsN}, 17px)`;
  for (let i = 0; i < rowsN * colsN; i++) {
    const cell = el('i');
    const cls = colorFor ? colorFor(i) : '';
    if (cls) cell.classList.add(cls);
    g.appendChild(cell);
  }
  return g;
}

const LESSONS = {
  pythagorean: {
    name: 'Pythagorean Theorem',
    render(body) {
      body.appendChild(el('p', '', 'In any <b>right triangle</b>, the square built on the hypotenuse (the longest side, opposite the right angle) has exactly the same area as the two smaller squares combined: <b>a&sup2; + b&sup2; = c&sup2;</b>. That is what the 3D model shows — 9 cubes + 16 cubes = 25 cubes.'));
      const demo = el('div', 'demo');
      demo.innerHTML = `<svg viewBox="-75 -55 250 230" width="240" height="220" aria-label="right triangle with squares on each side">
        <polygon points="20,100 80,100 80,160 20,160" fill="#a5798d" opacity=".45" stroke="#a5798d"/>
        <polygon points="20,20 20,100 -60,100 -60,20" fill="#7b8fd4" opacity=".45" stroke="#7b8fd4"/>
        <polygon points="80,100 20,20 100,-40 160,40" fill="#6b84d8" opacity=".4" stroke="#6b84d8"/>
        <polygon points="20,100 80,100 20,20" fill="#fbf9f4" stroke="#2e2a33" stroke-width="1.6"/>
        <rect x="20" y="88" width="12" height="12" fill="none" stroke="#2e2a33" stroke-width="1.4"/>
        <text x="50" y="134" font-size="13" font-weight="700" text-anchor="middle" fill="#2e2a33">a&#178;</text>
        <text x="-20" y="64" font-size="13" font-weight="700" text-anchor="middle" fill="#2e2a33">b&#178;</text>
        <text x="90" y="34" font-size="13" font-weight="700" text-anchor="middle" fill="#2e2a33">c&#178;</text>
      </svg>`;
      demo.appendChild(el('div', 'caption', 'The two small squares tile the big one'));
      body.appendChild(demo);
      body.appendChild(el('p', '', 'Whole-number side lengths that fit the formula are called <b>Pythagorean triples</b>. Tap one to load it into the Theorem Details panel:'));
      const chips = el('div', 'chips');
      [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]].forEach(([a, b, c]) => {
        const btn = el('button', 'tchip', `${a} - ${b} - ${c}`);
        btn.addEventListener('click', () => { setSides(a, b, true); });
        chips.appendChild(btn);
      });
      body.appendChild(chips);
      addCheck(body, 'pythagorean', this.name,
        'Which of these is NOT a right triangle?',
        ['6 - 8 - 10', '5 - 12 - 13', '4 - 5 - 6'], '4 - 5 - 6',
        '4² + 5² = 41, but 6² = 36. The formula fails, so no right angle.');
    },
  },

  rightangles: {
    name: 'Right Angles',
    render(body) {
      body.appendChild(el('p', '', 'A <b>right angle</b> measures exactly <b>90°</b> — a perfect quarter turn, like the corner of a page. The Pythagorean theorem only works when the triangle contains one. Drag the slider until the angle snaps to 90°:'));
      const demo = el('div', 'demo');
      const svgWrap = el('div');
      const big = el('div', 'big', '60°');
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = '20'; slider.max = '160'; slider.value = '60';
      const draw = (deg) => {
        const rad = (180 - deg) * Math.PI / 180;
        const x = 90 + 80 * Math.cos(rad), y = 100 - 80 * Math.sin(rad);
        const right = deg === 90;
        svgWrap.innerHTML = `<svg viewBox="0 0 190 115" width="260" height="158">
          <line x1="90" y1="100" x2="180" y2="100" stroke="#2e2a33" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="90" y1="100" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${right ? '#7fb069' : '#8a6f94'}" stroke-width="2.5" stroke-linecap="round"/>
          ${right ? '<rect x="90" y="82" width="18" height="18" fill="none" stroke="#7fb069" stroke-width="2"/>' : `<path d="M 118 100 A 28 28 0 0 0 ${(90 + 28 * Math.cos(rad)).toFixed(1)} ${(100 - 28 * Math.sin(rad)).toFixed(1)}" fill="none" stroke="#8a6f94" stroke-width="2"/>`}
        </svg>`;
        big.textContent = deg + '°' + (right ? ' — right angle!' : '');
        big.style.color = right ? '#7fb069' : '';
      };
      slider.addEventListener('input', () => draw(Number(slider.value)));
      draw(60);
      demo.appendChild(svgWrap);
      demo.appendChild(big);
      demo.appendChild(slider);
      demo.appendChild(el('div', 'caption', 'The little square marks a true 90° corner'));
      body.appendChild(demo);
      addCheck(body, 'rightangles', this.name,
        'How many degrees are in a right angle?',
        ['45°', '90°', '180°'], '90°',
        'a right angle is a quarter of a full 360° turn.');
    },
  },

  squares: {
    name: 'Square Numbers',
    render(body) {
      body.appendChild(el('p', '', '<b>Squaring</b> a number means multiplying it by itself: n&sup2; = n × n. The name is literal — n&sup2; is how many unit cells fill a square with side n. That is why the theorem talks about squares on each side.'));
      const demo = el('div', 'demo');
      const big = el('div', 'big');
      const holder = el('div');
      const stepbar = el('div', 'stepbar');
      let n = 5;
      const draw = () => {
        holder.innerHTML = '';
        holder.appendChild(grid(n, n, () => 'peri'));
        big.textContent = `${n}² = ${n} × ${n} = ${n * n}`;
      };
      const minus = el('button', 'stepbtn', '−'), plus = el('button', 'stepbtn', '+');
      minus.addEventListener('click', () => { n = Math.max(1, n - 1); draw(); });
      plus.addEventListener('click', () => { n = Math.min(10, n + 1); draw(); });
      stepbar.append(minus, plus);
      draw();
      demo.append(holder, big, stepbar);
      demo.appendChild(el('div', 'caption', 'Count the cells — a square number is a square of cells'));
      body.appendChild(demo);
      addCheck(body, 'squares', this.name,
        'What is 7² ?', ['14', '49', '77'], '49',
        '7 × 7 = 49 — fourteen would be 7 + 7, a common mix-up.');
    },
  },

  area: {
    name: 'Area Calculation',
    render(body) {
      body.appendChild(el('p', '', '<b>Area</b> is the number of unit squares needed to cover a shape. For a rectangle it is <b>width × height</b>; a square is the special case where both are equal, giving n&sup2;. Resize the rectangle and watch the count:'));
      const demo = el('div', 'demo');
      const big = el('div', 'big');
      const holder = el('div');
      let w = 5, h = 3;
      const draw = () => {
        holder.innerHTML = '';
        holder.appendChild(grid(h, w, () => 'rose'));
        big.textContent = `Area = ${w} × ${h} = ${w * h} square units`;
      };
      const bar = el('div', 'stepbar');
      [['w −', () => (w = Math.max(1, w - 1))], ['w +', () => (w = Math.min(10, w + 1))],
       ['h −', () => (h = Math.max(1, h - 1))], ['h +', () => (h = Math.min(8, h + 1))]].forEach(([t, fn]) => {
        const b = el('button', 'stepbtn', t);
        b.style.width = 'auto'; b.style.padding = '0 9px';
        b.addEventListener('click', () => { fn(); draw(); });
        bar.appendChild(b);
      });
      draw();
      demo.append(holder, big, bar);
      body.appendChild(demo);
      addCheck(body, 'area', this.name,
        'What is the area of a 5 × 3 rectangle?', ['8', '15', '16'], '15',
        '5 × 3 = 15. Adding the sides (5 + 3 = 8) gives half the perimeter, not the area.');
    },
  },

  types: {
    name: 'Triangle Types',
    render(body) {
      body.appendChild(el('p', '', 'Compare <b>a&sup2; + b&sup2;</b> with <b>c&sup2;</b> (where c is the longest side) and the triangle tells you its biggest angle — no protractor needed:'));
      const cards = el('div', 'typecards');
      [
        ['M35 46 L10 46 L28 8 Z', 'Acute', 'a² + b² &gt; c²', 'biggest angle &lt; 90°'],
        ['M10 46 L10 10 L40 46 Z', 'Right', 'a² + b² = c²', 'one angle exactly 90°'],
        ['M4 46 L46 46 L38 30 Z', 'Obtuse', 'a² + b² &lt; c²', 'biggest angle &gt; 90°'],
      ].forEach(([d, name, rule, sub]) => {
        const c = el('div', 'typecard');
        c.innerHTML = `<svg viewBox="0 0 50 50" width="46" height="46"><path d="${d}" fill="#ded7e8" stroke="#8a6f94" stroke-width="2" stroke-linejoin="round"/></svg>
          <div class="tname">${name}</div><div class="trule">${rule}<br>${sub}</div>`;
        cards.appendChild(c);
      });
      body.appendChild(cards);
      body.appendChild(el('p', '', 'Example: sides 2, 3, 4 → 2&sup2; + 3&sup2; = 13 and 4&sup2; = 16. Since 13 &lt; 16, the triangle is obtuse.'));
      addCheck(body, 'types', this.name,
        'Sides 6, 8, 10: since 36 + 64 = 100 = 10², the triangle is…',
        ['Acute', 'Right', 'Obtuse'], 'Right',
        'a² + b² equals c² exactly, so it contains a perfect 90° corner.');
    },
  },

  proof: {
    name: 'Proof Visuals',
    render(body) {
      body.appendChild(el('p', '', 'Why does it work? Count the unit squares. Step through the proof: the 9 cells of a&sup2; and the 16 cells of b&sup2; are exactly enough to fill c&sup2; — all 25 of it, with nothing left over.'));
      const demo = el('div', 'demo');
      const holder = el('div');
      holder.style.display = 'flex'; holder.style.gap = '22px'; holder.style.alignItems = 'flex-end';
      const big = el('div', 'big');
      let step = 0;
      const draw = () => {
        holder.innerHTML = '';
        const gA = grid(3, 3, () => (step >= 1 ? 'rose' : ''));
        const gB = grid(4, 4, () => (step >= 2 ? 'peri' : ''));
        const gC = grid(5, 5, (i) => (step >= 3 ? (i < 9 ? 'rose' : 'peri') : ''));
        [['a² = 9', gA], ['b² = 16', gB], ['c² = 25', gC]].forEach(([cap, g]) => {
          const w = el('div');
          w.style.textAlign = 'center';
          w.appendChild(g);
          const capEl = el('div', 'caption', cap);
          capEl.style.textTransform = 'none';
          w.appendChild(capEl);
          holder.appendChild(w);
        });
        big.textContent = ['Three empty squares', 'Count a²: 9 cells', 'Count b²: 16 more cells', '9 + 16 fill c² exactly: 25!'][step];
      };
      const bar = el('div', 'stepbar');
      const back = el('button', 'stepbtn', '←'), next = el('button', 'stepbtn', '→');
      back.addEventListener('click', () => { step = Math.max(0, step - 1); draw(); });
      next.addEventListener('click', () => { step = Math.min(3, step + 1); draw(); });
      bar.append(back, next);
      draw();
      demo.append(holder, big, bar);
      demo.appendChild(el('div', 'caption', 'Use the arrows to step through the proof'));
      body.appendChild(demo);
      addCheck(body, 'proof', this.name,
        'The squares on the two short sides hold 9 + 16 cells. The square on the hypotenuse holds…',
        ['24', '25', '26'], '25',
        'exactly 9 + 16 — the areas match perfectly, which IS the theorem.');
    },
  },
};

function openLesson(topic) {
  const lesson = LESSONS[topic];
  if (!lesson) return;
  lessonTitle.textContent = lesson.name;
  lessonBody.innerHTML = '';
  lesson.render(lessonBody);
  lessonBack.classList.add('open');
}
$('lessonClose').addEventListener('click', () => lessonBack.classList.remove('open'));
lessonBack.addEventListener('click', (e) => { if (e.target === lessonBack) lessonBack.classList.remove('open'); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') lessonBack.classList.remove('open'); });

document.querySelectorAll('.concept').forEach((btn) => {
  btn.addEventListener('click', () => openLesson(btn.dataset.topic));
});
document.querySelector('.burger').addEventListener('click', () => showToast('Complete all six topics to master the unit!'));

/* ---------------- modes ---------------- */
let mode = 'explore';
let practiceTimer = null;
let practiceIdx = 0;
const rows = { a: $('rowA'), b: $('rowB'), c: $('rowC') };

function practiceSteps() {
  const a = tri.a, b = tri.b, cc = tri.a * tri.a + tri.b * tri.b, c = hyp();
  return [
    { row: 'a', t1: `Side a = ${a} units`, t2: `a² = ${a * a} squares` },
    { row: 'b', t1: `Side b = ${b} units`, t2: `b² = ${b * b} squares` },
    { row: 'c', t1: `Hypotenuse c = ${fmt(c)} units`, t2: `c² = ${a * a} + ${b * b} = ${cc} squares` },
  ];
}
function showPracticeStep() {
  const s = practiceSteps()[practiceIdx % 3];
  Object.values(rows).forEach((r) => r.classList.remove('pulse'));
  rows[s.row].classList.add('pulse');
  chipT1.textContent = s.t1;
  chipT2.textContent = s.t2;
  highlightKey = s.row;
  if (parts[s.row]) startCount(parts[s.row]);
}
function clearPractice() {
  clearInterval(practiceTimer);
  practiceTimer = null;
  highlightKey = null;
  stopCount();
  Object.values(rows).forEach((r) => r.classList.remove('pulse'));
}

/* ---------------- quiz ---------------- */
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [20, 21, 29]];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
let streak = 0;
let lastTriple = null;
let currentQuiz = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genQuiz() {
  let t = pick(TRIPLES);
  while (t === lastTriple) t = pick(TRIPLES);
  lastTriple = t;
  const [a, b, c] = t;
  const explain = `${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c} = ${c}²`;
  const type = pick(['hyp', 'hyp', 'leg', 'verify', 'word']);
  if (type === 'hyp') {
    return { q: `If a = ${a} and b = ${b}, what is c?`, opts: shuffle([c, c - 1, c + 2]), ans: c, explain,
      hint: `a² + b² = ${a * a + b * b}. Which option, squared, gives ${c * c}?` };
  }
  if (type === 'leg') {
    return { q: `If c = ${c} and a = ${a}, what is b?`, opts: shuffle([b, b + 1, b > 2 ? b - 2 : b + 3]), ans: b, explain,
      hint: `Rearrange: b² = c² − a² = ${c * c} − ${a * a} = ${c * c - a * a}.` };
  }
  if (type === 'verify') {
    const real = Math.random() < 0.5;
    const sides = real ? [a, b, c] : [a, b, c + 1];
    const sum = sides[0] ** 2 + sides[1] ** 2, csq = sides[2] ** 2;
    return { q: `Sides ${sides[0]}, ${sides[1]}, ${sides[2]} — is it a right triangle?`, opts: ['YES', 'NO'],
      ans: real ? 'YES' : 'NO',
      explain: `${sides[0]}² + ${sides[1]}² = ${sum} and ${sides[2]}² = ${csq} — ${sum === csq ? 'they match' : 'they differ'}`,
      hint: `Check whether ${sides[0]}² + ${sides[1]}² equals ${sides[2]}².` };
  }
  return { q: `A ladder's base sits ${a} m from a wall and reaches ${b} m up it. How long is the ladder?`,
    opts: shuffle([c, c - 1, c + 2]).map((v) => v + ' m'), ans: c + ' m', explain,
    hint: `The wall and ground meet at 90° — the ladder is the hypotenuse.` };
}

function askQuiz() {
  currentQuiz = genQuiz();
  chip.classList.add('quiz');
  chipT1.textContent = currentQuiz.q;
  chipT2.textContent = 'a² + b² = c²';
  chipStreak.textContent = streak > 0 ? `🔥 streak ${streak}` : 'Answer to start a streak';
  chipAnswers.innerHTML = '';
  currentQuiz.opts.forEach((v) => {
    const b = el('button', '', String(v));
    b.addEventListener('click', () => {
      if (String(v) === String(currentQuiz.ans)) {
        b.classList.add('good');
        streak++;
        progress.correct++;
        progress.streakBest = Math.max(progress.streakBest, streak);
        chipT1.textContent = 'Correct!';
        chipT2.textContent = currentQuiz.explain;
        chipStreak.textContent = `🔥 streak ${streak}  ·  best ${progress.streakBest}`;
        addXP(12);
        setTimeout(askQuiz, 1800);
      } else {
        streak = 0;
        chipStreak.textContent = 'Streak reset — try again!';
        b.classList.add('bad');
        chip.classList.add('shake');
        setTimeout(() => chip.classList.remove('shake'), 450);
        setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    chipAnswers.appendChild(b);
  });
}
hintBtn.addEventListener('click', () => {
  if (currentQuiz) chipT2.textContent = '💡 ' + currentQuiz.hint;
});

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
  clearPractice();
  stopCount();
  chipCountFollows = false;
  chip.classList.remove('quiz');
  controls.autoRotate = m === 'explore';
  labelMode = m === 'test' ? 'letters' : 'values';
  refreshLabels();

  if (m === 'explore') setExploreChip();
  if (m === 'practice') {
    practiceIdx = 0;
    showPracticeStep();
    practiceTimer = setInterval(() => {
      practiceIdx++;
      if (practiceIdx % 3 === 0) addXP(4);
      showPracticeStep();
    }, 3300);
  }
  if (m === 'test') askQuiz();
}
document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

renderTriangle();
