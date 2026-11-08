import {
  forwardRef, useEffect, useImperativeHandle, useRef,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type TransformTool = "select" | "move" | "rotate" | "scale";
export type PrimitiveKind = "box" | "sphere" | "cylinder" | "torus";

export interface SceneObjectInfo {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  vertices: number;
  faces: number;
}

export interface ViewportHandle {
  addPrimitive(kind: PrimitiveKind): void;
  removeSelected(): void;
  exportGLB(): Promise<void>;
  importGLB(file: File): Promise<void>;
  setTransform(axis: "position" | "rotation" | "scale", index: number, value: number): void;\n  selectObject(id: string): void;
}

export interface ViewportProps {
  showGrid?: boolean;
  tool?: TransformTool;
  onSelectionChange?: (object: SceneObjectInfo | null) => void;
  onSceneChange?: (objects: SceneObjectInfo[]) => void;
}

const tuple = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
const toInfo = (object: THREE.Mesh): SceneObjectInfo => {
  const geometry = object.geometry;
  const position = geometry.getAttribute("position");
  const vertices = position?.count ?? 0;
  const faces = geometry.index ? geometry.index.count / 3 : vertices / 3;
  return {
    id: object.uuid, name: object.name, type: geometry.type,
    position: tuple(object.position),
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    scale: tuple(object.scale),
    vertices: Math.floor(vertices), faces: Math.floor(faces),
  };
};

const Viewport = forwardRef<ViewportHandle, ViewportProps>(function Viewport(
  { showGrid = true, tool = "select", onSelectionChange, onSceneChange }, ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    controls: OrbitControls; gizmo: TransformControls; objects: Map<string, THREE.Mesh>;
    selected: THREE.Mesh | null; grid: THREE.GridHelper;
  } | null>(null);
  const callbacks = useRef({ onSelectionChange, onSceneChange });\n  const toolRef = useRef<TransformTool>(tool);\n  toolRef.current = tool;
  callbacks.current = { onSelectionChange, onSceneChange };

  useImperativeHandle(ref, () => ({
    addPrimitive(kind) {
      const engine = engineRef.current;
      if (!engine) return;
      const geometries: Record<PrimitiveKind, THREE.BufferGeometry> = {
        box: new THREE.BoxGeometry(1.5, 1.5, 1.5),
        sphere: new THREE.SphereGeometry(0.85, 32, 20),
        cylinder: new THREE.CylinderGeometry(0.7, 0.7, 1.5, 32),
        torus: new THREE.TorusGeometry(0.8, 0.25, 16, 48),
      };
      const mesh = new THREE.Mesh(geometries[kind], new THREE.MeshStandardMaterial({
        color: "#278cff", metalness: 0.35, roughness: 0.38,
      }));
      const base = kind[0].toUpperCase() + kind.slice(1);
      const count = [...engine.objects.values()].filter((item) => item.name.startsWith(base)).length;
      mesh.name = count ? `${base} ${count + 1}` : base;
      mesh.position.set(0, 0.8, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      engine.scene.add(mesh);
      engine.objects.set(mesh.uuid, mesh);
      engine.selected = mesh;
      engine.gizmo.attach(mesh);
      callbacks.current.onSelectionChange?.(toInfo(mesh));
      callbacks.current.onSceneChange?.([...engine.objects.values()].map(toInfo));
    },
    removeSelected() {
      const engine = engineRef.current;
      const selected = engine?.selected;
      if (!engine || !selected) return;
      engine.gizmo.detach();
      engine.scene.remove(selected);
      selected.geometry.dispose();
      const materials = Array.isArray(selected.material) ? selected.material : [selected.material];
      materials.forEach((material) => material.dispose());
      engine.objects.delete(selected.uuid);
      engine.selected = null;
      callbacks.current.onSelectionChange?.(null);
      callbacks.current.onSceneChange?.([...engine.objects.values()].map(toInfo));
    },
    async exportGLB() {
      const engine = engineRef.current;
      if (!engine) return;
      const exportScene = new THREE.Scene();
      for (const object of engine.objects.values()) exportScene.add(object.clone());
      const exporter = new GLTFExporter();
      const result = await exporter.parseAsync(exportScene, { binary: true, onlyVisible: true });
      const blob = new Blob([result as ArrayBuffer], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ultragengine3d-scene.glb";
      anchor.click();
      URL.revokeObjectURL(url);
    },
    async importGLB(file) {
      const engine = engineRef.current;
      if (!engine) return;
      const loader = new GLTFLoader();
      const url = URL.createObjectURL(file);
      try {
        const gltf = await loader.loadAsync(url);
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.name = object.name || `Imported ${engine.objects.size + 1}`;
          engine.objects.set(object.uuid, object);
        });
        engine.scene.add(gltf.scene);
        const first = gltf.scene.getObjectByProperty("isMesh", true);
        if (first instanceof THREE.Mesh) {
          engine.selected = first;
          engine.gizmo.attach(first);
          callbacks.current.onSelectionChange?.(toInfo(first));
        }
        callbacks.current.onSceneChange?.([...engine.objects.values()].map(toInfo));
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    selectObject(id) {\n      const engine = engineRef.current;\n      const selected = engine?.objects.get(id) ?? null;\n      if (!engine) return;\n      engine.selected = selected;\n      if (selected && toolRef.current !== "select") engine.gizmo.attach(selected);\n      else engine.gizmo.detach();\n      callbacks.current.onSelectionChange?.(selected ? toInfo(selected) : null);\n    },\n    setTransform(axis, index, value) {
      const engine = engineRef.current;
      const object = engine?.selected;
      if (!object || !engine) return;
      const target = axis === "position" ? object.position : axis === "rotation" ? object.rotation : object.scale;
      if (axis === "scale" && value <= 0) return;
      if (axis === "rotation") target.setComponent(index, THREE.MathUtils.degToRad(value));
      else target.setComponent(index, value);
      callbacks.current.onSelectionChange?.(toInfo(object));
    },
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#10131b");
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(5, 4, 7);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0.7, 0);
    const gizmo = new TransformControls(camera, renderer.domElement);
    const gizmoHelper = gizmo.getHelper();
    scene.add(gizmoHelper);
    gizmo.addEventListener("dragging-changed", (event) => { controls.enabled = !event.value; });
    gizmo.addEventListener("objectChange", () => {
      const selected = engineRef.current?.selected;
      if (selected) callbacks.current.onSelectionChange?.(toInfo(selected));
    });

    const grid = new THREE.GridHelper(24, 24, "#354052", "#242c3a");
    grid.position.y = -0.015;
    grid.visible = showGrid;
    scene.add(grid);
    scene.add(new THREE.HemisphereLight("#dceaff", "#252b39", 2));
    const keyLight = new THREE.DirectionalLight("#ffffff", 3);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight("#368cff", 1.2);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    const sample = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.85, 0.27, 160, 24),
      new THREE.MeshStandardMaterial({ color: "#278cff", metalness: 0.48, roughness: 0.28 }),
    );
    sample.name = "Sample Model";
    sample.position.y = 1.15;
    scene.add(sample);
    const objects = new Map<string, THREE.Mesh>([[sample.uuid, sample]]);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: "#111722", roughness: 0.92, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    scene.add(floor);

    engineRef.current = { scene, camera, renderer, controls, gizmo, objects, selected: sample, grid };
    callbacks.current.onSelectionChange?.(toInfo(sample));
    callbacks.current.onSceneChange?.([...objects.values()].map(toInfo));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      if (gizmo.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...objects.values()], false);
      const selected = hits[0]?.object instanceof THREE.Mesh ? hits[0].object : null;
      engineRef.current!.selected = selected;
      if (selected && toolRef.current !== "select") gizmo.attach(selected); else gizmo.detach();
      callbacks.current.onSelectionChange?.(selected ? toInfo(selected) : null);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const resizeObserver = new ResizeObserver(() => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(host);
    let frame = 0;
    const animate = () => { frame = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      gizmo.detach();
      gizmo.dispose();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.grid.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    const gizmo = engineRef.current?.gizmo;
    if (!gizmo) return;
    if (tool === "select") gizmo.detach();
    else {
      gizmo.setMode(tool === "move" ? "translate" : tool);
      if (engineRef.current?.selected) gizmo.attach(engineRef.current.selected);
    }
  }, [tool]);

  return <div className="viewport-canvas" ref={hostRef} aria-label="3D scene viewport" />;
});

export default Viewport;
