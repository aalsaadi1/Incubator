import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

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
  const p = new THREE.PointLight(0xffcf9a, 1.7, 1.15, 2);
  p.position.set(x, y, z);
  glowGroup.add(p);
});
scene.add(glowGroup);

/* ---------------- model ---------------- */
const model = new THREE.Group();
scene.add(model);
{
  const text = document.getElementById('objdata').textContent;
  const obj = new OBJLoader().parse(text);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x7e8bd8,
    transparent: true,
    opacity: 0.9,
    roughness: 0.32,
    metalness: 0.05,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    emissive: 0x353a75,
    emissiveIntensity: 0.18,
  });

  obj.traverse((n) => {
    if (!n.isMesh) return;
    n.geometry.computeVertexNormals();
    n.material = bodyMat;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(n.geometry, 28),
      new THREE.LineBasicMaterial({ color: 0xfff4dd, transparent: true, opacity: 0.35 })
    );
    n.add(edges);
  });

  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.sub(c);
  const size = box.getSize(new THREE.Vector3());
  const s = 2.05 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(s);
  model.add(obj);
  model.position.y = 0.02;

  document.getElementById('loader').classList.add('hide');
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  glowGroup.children.forEach((p, i) => (p.intensity = 1.6 + Math.sin(t * 2.1 + i * 1.7) * 0.5));
  model.position.y = 0.02 + Math.sin(t * 0.8) * 0.022;
  controls.update();
  renderer.render(scene, camera);
});

/* ---------------- UI logic ---------------- */
const $ = (id) => document.getElementById(id);
const chip = $('chip'), chipT1 = $('chipT1'), chipT2 = $('chipT2'), chipAnswers = $('chipAnswers');
const toast = $('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* sidebar topics */
document.querySelectorAll('.concept').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    showToast(`"${btn.dataset.topic}" — coming soon. Stay on the Pythagorean Theorem for now!`);
  });
});
document.querySelector('.burger').addEventListener('click', () => showToast('Menu — coming soon'));

/* XP / progress */
let xp = 22;
function addXP(n) {
  xp = Math.min(100, xp + n);
  $('xpFill').style.width = xp + '%';
  if (xp >= 100) {
    xp = 0;
    $('levelLabel').textContent = 'LEVEL 11';
    showToast('Level up! Welcome to Level 11 🎉');
  }
}

/* ---------------- modes ---------------- */
let practiceTimer = null;
const rows = { a: $('rowA'), b: $('rowB'), c: $('rowC') };

const practiceSteps = [
  { row: 'a', t1: 'Side a = 3 units', t2: 'a² = 9 squares', obj: 'obj1' },
  { row: 'b', t1: 'Side b = 4 units', t2: 'b² = 16 squares', obj: 'obj3' },
  { row: 'c', t1: 'Hypotenuse c = 5 units', t2: 'c² = 9 + 16 = 25 squares', obj: 'obj2' },
];

function clearPractice() {
  clearInterval(practiceTimer);
  practiceTimer = null;
  Object.values(rows).forEach((r) => r.classList.remove('pulse'));
}

const quizzes = [
  { q: 'If a = 3 and b = 4, c = ?', opts: [4, 5, 6], ans: 5 },
  { q: 'If a = 6 and b = 8, c = ?', opts: [9, 10, 12], ans: 10 },
  { q: 'If a = 5 and b = 12, c = ?', opts: [13, 15, 17], ans: 13 },
  { q: 'If a = 9 and b = 12, c = ?', opts: [14, 15, 16], ans: 15 },
];
let quizIdx = 0;

function askQuiz() {
  const qz = quizzes[quizIdx % quizzes.length];
  chip.classList.add('quiz');
  chipT1.textContent = qz.q;
  chipT2.textContent = 'a² + b² = c²';
  chipAnswers.innerHTML = '';
  qz.opts.forEach((v) => {
    const b = document.createElement('button');
    b.textContent = v;
    b.addEventListener('click', () => {
      if (v === qz.ans) {
        b.classList.add('good');
        chipT1.textContent = `Correct! c = ${qz.ans}`;
        $('obj2').classList.add('done');
        addXP(12);
        quizIdx++;
        setTimeout(askQuiz, 1400);
      } else {
        b.classList.add('bad');
        chip.classList.add('shake');
        setTimeout(() => chip.classList.remove('shake'), 450);
        setTimeout(() => b.classList.remove('bad'), 700);
      }
    });
    chipAnswers.appendChild(b);
  });
}

function setMode(m) {
  document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
  clearPractice();
  chip.classList.remove('quiz');
  controls.autoRotate = m === 'explore';

  if (m === 'explore') {
    chipT1.textContent = '3:4:5 Triangle';
    chipT2.textContent = 'a² + b² = c²';
  }
  if (m === 'practice') {
    let i = 0;
    const step = () => {
      const s = practiceSteps[i % practiceSteps.length];
      Object.values(rows).forEach((r) => r.classList.remove('pulse'));
      rows[s.row].classList.add('pulse');
      chipT1.textContent = s.t1;
      chipT2.textContent = s.t2;
      $(s.obj).classList.add('done');
      if (i > 0 && i % practiceSteps.length === 0) addXP(4);
      i++;
    };
    step();
    practiceTimer = setInterval(step, 2600);
  }
  if (m === 'test') askQuiz();
}
document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
