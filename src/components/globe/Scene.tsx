"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { PerspectiveCamera } from "three";
import { latLonToVector3 } from "@/lib/geo";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useGlobe, WORLD_DISTANCE } from "@/store";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Earth } from "./Earth";
import { wholeGlobeDistance } from "./fit";
import { Focus } from "./Focus";
import { Quakes } from "./Quakes";
import { RegionRing } from "./RegionRing";

// Opens over the Pacific edge of the Americas, where most of the action is.
const START = latLonToVector3(18, -120, WORLD_DISTANCE);

/**
 * Backs the camera off on narrow screens so the globe and its glow fit the
 * width too. Runs only when the canvas resizes, so it never fights a zoom.
 */
function FitToWidth() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    camera.position.setLength(Math.max(WORLD_DISTANCE, wholeGlobeDistance(camera, aspect)));
    invalidate();
  }, [camera, aspect, invalidate]);

  return null;
}

/**
 * The canvas only draws when something changes. While the globe spins on its
 * own, this asks for every next frame; when it stops, so does the drawing.
 */
function KeepDrawing({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);
  useFrame((state) => {
    if (active) state.invalidate();
  });
  return null;
}

export default function Scene({ onContextLost }: { onContextLost: () => void }) {
  // Idle spin pauses while someone is dragging the globe or looking at a quake.
  const [dragging, setDragging] = useState(false);
  const hasSelection = useGlobe((s) => s.selectedId !== null);
  // While the AI reads a question, the globe spins a little faster: it's working.
  const asking = useGlobe((s) => s.asking);
  const select = useGlobe((s) => s.select);
  // Reduced motion: no idle spin; the globe only moves when someone moves it.
  const reduced = useReducedMotion();
  const spinning = !reduced && !dragging && (asking || !hasSelection);

  return (
    <Canvas
      camera={{ position: START.toArray(), fov: 32, near: 0.1, far: 50 }}
      dpr={[1, 2]}
      // Draw on demand: animations ask for frames while they run (see KeepDrawing).
      frameloop="demand"
      // No filmic tone mapping: it greys out a light palette. Colors render as designed.
      flat
      gl={{ antialias: true, alpha: true }}
      // A click on empty space or bare globe (not a drag) clears the selection.
      onPointerMissed={() => select(null)}
      onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", onContextLost, { once: true })}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[-4, 3, 5]} intensity={0.7} />
      <FitToWidth />
      <Earth />
      <Atmosphere />
      <Quakes />
      <Focus />
      <RegionRing />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={1.8}
        maxDistance={8}
        autoRotate={spinning}
        autoRotateSpeed={asking ? 1.8 : 0.35}
        onStart={() => setDragging(true)}
        onEnd={() => setDragging(false)}
      />
      <KeepDrawing active={spinning} />
      {/* After the controls, so a flight's camera move wins each frame. */}
      <CameraRig />
    </Canvas>
  );
}
