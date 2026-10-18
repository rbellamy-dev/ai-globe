"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, Quaternion, Vector3, type PerspectiveCamera } from "three";
import { latLonToVector3 } from "@/lib/geo";
import { useGlobe } from "@/store";
import { wholeGlobeDistance } from "./fit";

const DURATION_MS = 1400;
/** How close the camera comes in to a quake (globe radius = 1). */
const FOCUS_DISTANCE = 3.8;

const step = new Quaternion();

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface Flight {
  from: Vector3;
  rotation: Quaternion;
  fromDistance: number;
  toDistance: number;
  start: number;
}

type Controls = { update: () => void; addEventListener: (type: string, fn: () => void) => void; removeEventListener: (type: string, fn: () => void) => void };

/**
 * Flies the camera round the globe to the store's flyTarget along the
 * shortest arc, easing in and out. Grabbing the globe mid-flight stops it.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const aspect = useThree((s) => s.size.width / s.size.height);
  const flyTarget = useGlobe((s) => s.flyTarget);
  const flight = useRef<Flight | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!flyTarget) return;
    const from = camera.position.clone().normalize();
    const to = latLonToVector3(flyTarget.lat, flyTarget.lon).normalize();
    const fromDistance = camera.position.length();
    flight.current = {
      from,
      rotation: new Quaternion().setFromUnitVectors(from, to),
      fromDistance,
      // Picking a quake (no distance given) zooms in close on it. An answer keeps the whole
      // globe in view: it turns to face the answer and the ring marks the area.
      toDistance:
        flyTarget.distance === undefined
          ? Math.min(fromDistance, FOCUS_DISTANCE)
          : Math.max(wholeGlobeDistance(camera as PerspectiveCamera, aspect), flyTarget.distance),
      start: performance.now(),
    };
    // Reduced motion: jump straight there.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) flight.current.start = -Infinity;
    invalidate();
    // Only a new target starts a flight; a resize mid-flight shouldn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTarget, camera]);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => void (flight.current = null);
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);

  useFrame((state) => {
    const f = flight.current;
    if (!f) return;
    state.invalidate();
    const t = Math.min((performance.now() - f.start) / DURATION_MS, 1);
    const k = easeInOutCubic(t);
    step.identity().slerp(f.rotation, k);
    camera.position
      .copy(f.from)
      .applyQuaternion(step)
      .multiplyScalar(MathUtils.lerp(f.fromDistance, f.toDistance, k));
    camera.lookAt(0, 0, 0);
    controls?.update();
    if (t >= 1) flight.current = null;
  });

  return null;
}
