import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface ViewportProps {
  onReady?: (scene: THREE.Scene) => void;
}

export default function Viewport({ onReady }: ViewportProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#10131b");

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(5, 4, 7);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0.7, 0);

    const grid = new THREE.GridHelper(24, 24, "#354052", "#242c3a");
    grid.position.y = -0.015;
    scene.add(grid);

    scene.add(new THREE.HemisphereLight("#dceaff", "#252b39", 2.0));

    const keyLight = new THREE.DirectionalLight("#ffffff", 3.0);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#368cff", 1.2);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    const geometry = new THREE.TorusKnotGeometry(0.85, 0.27, 160, 24);
    const material = new THREE.MeshStandardMaterial({
      color: "#278cff",
      metalness: 0.48,
      roughness: 0.28,
    });
    const sampleMesh = new THREE.Mesh(geometry, material);
    sampleMesh.name = "Sample Model";
    sampleMesh.position.y = 1.15;
    scene.add(sampleMesh);

    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#111722",
      roughness: 0.92,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    scene.add(floor);

    onReady?.(scene);

    const resizeObserver = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(host);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [onReady]);

  return <div className="viewport-canvas" ref={hostRef} aria-label="3D scene viewport" />;
}
