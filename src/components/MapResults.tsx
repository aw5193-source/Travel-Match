/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LocateFixed, MapPin, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { LocationMatch } from '../types';

interface Props {
  matches: LocationMatch[];
  onSelect: (location: LocationMatch) => void;
}

interface HoveredPin {
  match: LocationMatch;
  x: number;
  y: number;
}

const GLOBE_RADIUS = 1.55;
const MIN_DISTANCE = 2.45;
const MAX_DISTANCE = 6.2;
const START_CAMERA = new THREE.Vector3(0, 0.25, 4.5);

function latLngToVector(lat: number, lng: number, radius = GLOBE_RADIUS) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function texturePoint(lng: number, lat: number, width: number, height: number) {
  return {
    x: ((lng + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

function drawLandPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: [number, number][],
) {
  ctx.beginPath();
  points.forEach(([lng, lat], index) => {
    const point = texturePoint(lng, lat, width, height);
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
  ctx.fill();
}

function createEarthTexture() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const ocean = ctx.createLinearGradient(0, 0, width, height);
  ocean.addColorStop(0, '#07111f');
  ocean.addColorStop(0.45, '#0c2638');
  ocean.addColorStop(1, '#12202d');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = texturePoint(lng, 0, width, height).x;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = texturePoint(0, lat, width, height).y;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#d8d8cf';
  const landMasses: [number, number][][] = [
    [[-168, 72], [-135, 70], [-118, 57], [-96, 51], [-82, 30], [-96, 17], [-111, 24], [-123, 36], [-150, 57]],
    [[-82, 12], [-66, 8], [-50, -5], [-39, -20], [-54, -55], [-70, -48], [-78, -22]],
    [[-73, 73], [-43, 82], [-20, 74], [-29, 61], [-53, 58], [-68, 66]],
    [[-12, 72], [33, 70], [62, 58], [96, 69], [148, 58], [174, 43], [140, 8], [105, 10], [82, 25], [55, 8], [33, 31], [8, 37], [-12, 35], [-20, 55]],
    [[-18, 35], [10, 37], [34, 29], [51, 11], [43, -34], [19, -35], [-3, -12], [-17, 11]],
    [[110, -10], [155, -20], [150, -43], [116, -36]],
    [[46, -12], [51, -26], [45, -25], [43, -14]],
    [[-180, -68], [-120, -72], [-60, -70], [0, -73], [60, -70], [120, -72], [180, -68], [180, -90], [-180, -90]],
  ];
  landMasses.forEach((land) => drawLandPath(ctx, width, height, land));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
  drawLandPath(ctx, width, height, [[-180, 90], [180, 90], [180, 72], [100, 74], [40, 76], [-30, 74], [-90, 76], [-180, 72]]);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function markerColor(score: number) {
  if (score >= 90) return 0x34d399;
  if (score >= 80) return 0x93c5fd;
  return 0xf8fafc;
}

export const MapResults: React.FC<Props> = ({ matches, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const zoomRef = useRef<(amount: number) => void>(() => undefined);
  const resetRef = useRef<() => void>(() => undefined);
  const focusRef = useRef<(match: LocationMatch) => void>(() => undefined);
  const [hoveredPin, setHoveredPin] = useState<HoveredPin | null>(null);
  const [zoomLabel, setZoomLabel] = useState('1.0x');
  const visibleMatches = useMemo(() => matches.slice(0, 5), [matches]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.copy(START_CAMERA);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-label', 'Interactive recommendation globe');
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = MIN_DISTANCE;
    controls.maxDistance = MAX_DISTANCE;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.8;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 3, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x78d6ff, 1.1);
    rimLight.position.set(-4, -1, -3);
    scene.add(rimLight);

    const globeTexture = createEarthTexture();
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 128, 96),
      new THREE.MeshStandardMaterial({
        map: globeTexture,
        roughness: 0.72,
        metalness: 0.02,
      }),
    );
    scene.add(globe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.035, 128, 96),
      new THREE.MeshBasicMaterial({
        color: 0x6ee7ff,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
      }),
    );
    scene.add(atmosphere);

    const latitudeLines = new THREE.Group();
    for (let lat = -60; lat <= 60; lat += 30) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
          Math.cos(THREE.MathUtils.degToRad(lat)) * (GLOBE_RADIUS + 0.006),
          0.002,
          8,
          160,
        ),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09 }),
      );
      ring.position.y = Math.sin(THREE.MathUtils.degToRad(lat)) * GLOBE_RADIUS;
      ring.rotation.x = Math.PI / 2;
      latitudeLines.add(ring);
    }
    scene.add(latitudeLines);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 420; i += 1) {
      const radius = 14 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.025, transparent: true, opacity: 0.35 }),
    );
    scene.add(stars);

    const markerRoot = new THREE.Group();
    const markerGroups: THREE.Group[] = [];
    const markerHitObjects: THREE.Object3D[] = [];
    const markerRings: THREE.Mesh[] = [];

    visibleMatches.forEach((match) => {
      const normal = latLngToVector(match.coordinates.lat, match.coordinates.lng, 1).normalize();
      const pin = new THREE.Group();
      pin.position.copy(normal.clone().multiplyScalar(GLOBE_RADIUS + 0.035));
      pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      pin.userData.match = match;

      const color = markerColor(match.matchScore);
      const pinMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.24,
        roughness: 0.35,
      });

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.16, 16), pinMaterial);
      stem.position.y = 0.07;
      stem.userData.match = match;
      pin.add(stem);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), pinMaterial);
      head.position.y = 0.17;
      head.userData.match = match;
      pin.add(head);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.004, 8, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.012;
      pin.add(ring);
      markerRings.push(ring);

      markerRoot.add(pin);
      markerGroups.push(pin);
      markerHitObjects.push(stem, head);
    });
    scene.add(markerRoot);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerDown = new THREE.Vector2();
    let latestHover: LocationMatch | null = null;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findPin = (event: PointerEvent) => {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster
        .intersectObjects(markerHitObjects, false)
        .filter((hit) => hit.object.visible && hit.object.parent?.visible);
      const match = hits[0]?.object.userData.match as LocationMatch | undefined;
      latestHover = match || null;

      if (match) {
        const rect = container.getBoundingClientRect();
        setHoveredPin({
          match,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredPin(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerDown.set(event.clientX, event.clientY);
    };

    const onPointerMove = (event: PointerEvent) => {
      findPin(event);
    };

    const onPointerUp = (event: PointerEvent) => {
      const distance = pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
      if (distance < 6 && latestHover) {
        onSelect(latestHover);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', () => setHoveredPin(null));
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const updateZoomLabel = () => {
      setZoomLabel(`${(START_CAMERA.length() / camera.position.length()).toFixed(1)}x`);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    updateZoomLabel();

    zoomRef.current = (amount: number) => {
      const currentDistance = camera.position.length();
      const nextDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, currentDistance + amount));
      camera.position.copy(camera.position.clone().normalize().multiplyScalar(nextDistance));
      controls.update();
      updateZoomLabel();
    };

    resetRef.current = () => {
      camera.position.copy(START_CAMERA);
      controls.target.set(0, 0, 0);
      controls.update();
      setHoveredPin(null);
      updateZoomLabel();
    };

    focusRef.current = (match: LocationMatch) => {
      const normal = latLngToVector(match.coordinates.lat, match.coordinates.lng, 1).normalize();
      const distance = Math.max(MIN_DISTANCE + 0.45, camera.position.length());
      camera.position.copy(normal.multiplyScalar(distance));
      camera.lookAt(0, 0, 0);
      controls.update();
      updateZoomLabel();
    };

    let frameId = 0;
    const scratch = new THREE.Vector3();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      atmosphere.rotation.y -= 0.00035;
      stars.rotation.y += 0.00008;

      markerGroups.forEach((marker) => {
        const worldPosition = marker.getWorldPosition(scratch);
        const surfaceNormal = worldPosition.clone().normalize();
        const cameraDirection = camera.position.clone().sub(worldPosition).normalize();
        marker.visible = surfaceNormal.dot(cameraDirection) > 0.03;
      });

      markerRings.forEach((ring, index) => {
        const pulse = 1 + Math.sin(performance.now() / 520 + index) * 0.16;
        ring.scale.setScalar(pulse);
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.dispose());
        } else if (material) {
          material.dispose();
        }
      });
      globeTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [visibleMatches, onSelect]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] md:h-[680px] bg-zinc-950 overflow-hidden cursor-grab active:cursor-grabbing"
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

      <div className="absolute top-6 right-6 z-30 flex flex-col gap-2">
        <button
          onClick={() => zoomRef.current(-0.45)}
          className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => zoomRef.current(0.45)}
          className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => resetRef.current()}
          className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
          title="Reset globe"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-6 left-6 z-20 space-y-1 text-white pointer-events-none">
        <h2 className="text-3xl md:text-5xl font-light tracking-tight">Global Projections</h2>
        <p className="text-zinc-400 text-xs font-mono uppercase tracking-[0.3em]">
          {visibleMatches.length} pins / {zoomLabel}
        </p>
      </div>

      <div className="absolute bottom-6 right-6 z-20 hidden lg:block w-80 rounded-lg border border-white/10 bg-black/40 backdrop-blur-xl p-3 text-white">
        <div className="flex items-center gap-2 px-2 pb-3 text-xs font-mono uppercase tracking-[0.25em] text-zinc-400">
          <LocateFixed className="w-4 h-4" />
          Recommended Pins
        </div>
        <div className="space-y-1">
          {visibleMatches.map((match) => (
            <button
              key={match.id}
              onClick={() => {
                focusRef.current(match);
                onSelect(match);
              }}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/10 transition-colors"
            >
              <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">{match.name}</span>
                <span className="block text-[11px] text-zinc-400 truncate">{match.country}</span>
              </span>
              <span className="text-xs font-mono text-zinc-300">{match.matchScore}%</span>
            </button>
          ))}
        </div>
      </div>

      {hoveredPin && (
        <div
          className="absolute z-40 pointer-events-none rounded-lg border border-white/10 bg-black/70 backdrop-blur-xl px-4 py-3 text-white shadow-2xl"
          style={{
            left: Math.min(hoveredPin.x + 18, (containerRef.current?.clientWidth || 0) - 240),
            top: Math.max(16, hoveredPin.y - 18),
          }}
        >
          <div className="text-sm font-medium">{hoveredPin.match.name}</div>
          <div className="text-xs text-zinc-400">{hoveredPin.match.country}</div>
          <div className="mt-2 text-xs font-mono text-emerald-300">
            {hoveredPin.match.matchScore}% match
          </div>
        </div>
      )}
    </div>
  );
};
