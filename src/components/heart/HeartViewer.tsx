"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FLOW, OXYGEN_META } from "@/lib/heart-data";

// Raw-obj centre used to centre the mesh and its markers together.
const CENTER = new THREE.Vector3(0.002, 0.946, 0);

interface Props {
  currentIndex: number;
  onSelect: (i: number) => void;
  mode: "learn" | "flow" | "quiz";
  autoRotate: boolean;
  quizRevealIndex?: number | null; // when set, only reveal this marker's label
}

function makeBadgeTexture(num: number, color: string, selected: boolean) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  // outer glow ring for selected
  ctx.beginPath();
  ctx.arc(r, r, r - 8, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r, r, r - 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${selected ? 62 : 56}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), r, r + 3);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function makeLabelTexture(text: string, sub: string, color: string) {
  const w = 512;
  const h = 160;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const pad = 20;
  const radius = 26;
  ctx.beginPath();
  ctx.moveTo(pad + radius, pad);
  ctx.arcTo(w - pad, pad, w - pad, h - pad, radius);
  ctx.arcTo(w - pad, h - pad, pad, h - pad, radius);
  ctx.arcTo(pad, h - pad, pad, pad, radius);
  ctx.arcTo(pad, pad, w - pad, pad, radius);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 - 14);
  ctx.fillStyle = color;
  ctx.font = "600 26px sans-serif";
  ctx.fillText(sub.toUpperCase(), w / 2, h / 2 + 34);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export default function HeartViewer({
  currentIndex,
  onSelect,
  mode,
  autoRotate,
  quizRevealIndex,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    badges: THREE.Sprite[];
    label: THREE.Sprite;
    labelMat: THREE.SpriteMaterial;
    ring: THREE.Mesh;
    pathLine?: THREE.Line;
    controls: OrbitControls;
  } | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // one-time scene setup
  useEffect(() => {
    const mount = mountRef.current!;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0.2, 0.35, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd4ff, 0.5);
    fill.position.set(-3, 1, -2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd5e0, 0.4);
    rim.position.set(0, -2, -3);
    scene.add(rim);

    const root = new THREE.Group(); // spins
    scene.add(root);
    const content = new THREE.Group(); // centred
    content.position.copy(CENTER).multiplyScalar(-1);
    root.add(content);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 6;
    controls.autoRotateSpeed = 0.9;
    controls.target.set(0, 0, 0);

    // heart mesh
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xc65a63,
      roughness: 0.62,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      flatShading: false,
    });
    let loaded = false;
    new OBJLoader().load(
      "/models/heart.obj",
      (obj) => {
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.geometry.computeVertexNormals();
            m.material = heartMat;
          }
        });
        content.add(obj);
        loaded = true;
      },
      undefined,
      (err) => console.error("heart model load error", err),
    );

    // markers
    const badges: THREE.Sprite[] = [];
    FLOW.forEach((step, i) => {
      const color = OXYGEN_META[step.oxygen].color;
      const mat = new THREE.SpriteMaterial({
        map: makeBadgeTexture(i + 1, color, false),
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(...step.marker);
      sprite.scale.setScalar(0.14);
      sprite.renderOrder = 10;
      sprite.userData.index = i;
      content.add(sprite);
      badges.push(sprite);
    });

    // reusable selected name label
    const labelMat = new THREE.SpriteMaterial({
      map: makeLabelTexture(FLOW[0].name, FLOW[0].nickname, OXYGEN_META[FLOW[0].oxygen].color),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const label = new THREE.Sprite(labelMat);
    label.scale.set(0.62, 0.19, 1);
    label.renderOrder = 20;
    label.visible = false;
    content.add(label);

    // reusable pulse ring at selected marker
    const ringGeo = new THREE.RingGeometry(0.09, 0.11, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.renderOrder = 9;
    ring.visible = false;
    content.add(ring);

    // flow path curve through markers
    const points = FLOW.map((s) => new THREE.Vector3(...s.marker));
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.4);
    const pathGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(220));
    const pathMat = new THREE.LineBasicMaterial({
      color: 0xe11d48,
      transparent: true,
      opacity: 0.45,
      depthTest: false,
    });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    pathLine.renderOrder = 5;
    pathLine.visible = false;
    content.add(pathLine);

    stateRef.current = { badges, label, labelMat, ring, pathLine, controls };

    // raycast clicks
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downXY = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      downXY = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      // ignore drags (orbit)
      if (Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(badges, false);
      if (hits.length) {
        const idx = hits[0].object.userData.index as number;
        selectRef.current(idx);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const st = stateRef.current;
      if (st) {
        // pulse ring
        const s = 1 + Math.sin(t * 3) * 0.18;
        st.ring.scale.setScalar(s);
        (st.ring.material as THREE.MeshBasicMaterial).opacity = 0.85 - (s - 1) * 1.5;
        st.ring.quaternion.copy(camera.quaternion);
        // gentle bob of the label
        st.label.position.y += Math.sin(t * 2) * 0.00004;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      void loaded;
    };
  }, []);

  // react to selection / mode
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const revealed = quizRevealIndex ?? currentIndex;
    const showLabels = mode !== "quiz" || quizRevealIndex != null;

    st.badges.forEach((b, i) => {
      const step = FLOW[i];
      const isSel = i === revealed && showLabels;
      const map = makeBadgeTexture(i + 1, OXYGEN_META[step.oxygen].color, isSel);
      (b.material as THREE.SpriteMaterial).map?.dispose();
      (b.material as THREE.SpriteMaterial).map = map;
      (b.material as THREE.SpriteMaterial).needsUpdate = true;
      b.scale.setScalar(isSel ? 0.22 : 0.13);
      (b.material as THREE.SpriteMaterial).opacity =
        mode === "quiz" && quizRevealIndex == null ? 0.9 : isSel ? 1 : 0.72;
    });

    const step = FLOW[revealed];
    if (showLabels && step) {
      const color = OXYGEN_META[step.oxygen].color;
      st.labelMat.map?.dispose();
      st.labelMat.map = makeLabelTexture(step.name, step.nickname, color);
      st.labelMat.needsUpdate = true;
      st.label.position.set(step.marker[0], step.marker[1] + 0.28, step.marker[2]);
      st.label.visible = true;
      (st.ring.material as THREE.MeshBasicMaterial).color.set(color);
      st.ring.position.set(...step.marker);
      st.ring.visible = true;
    } else {
      st.label.visible = false;
      st.ring.visible = false;
    }

    if (st.pathLine) st.pathLine.visible = mode === "flow";
  }, [currentIndex, mode, quizRevealIndex]);

  // autorotate toggle
  useEffect(() => {
    const st = stateRef.current;
    if (st) st.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  return <div ref={mountRef} className="h-full w-full" />;
}
