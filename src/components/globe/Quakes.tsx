"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, MathUtils, Object3D, type InstancedMesh } from "three";
import { depthValue } from "@/lib/depth";
import { facesCamera, latLonToVector3 } from "@/lib/geo";
import { palette } from "@/lib/palette";
import { inFocus, useGlobe } from "@/store";
import { crowdScale, MARKER_LIFT, markerPosition, markerRadius } from "./markers";

const dummy = new Object3D();
/** A pointer over a quake; "" hands back to the globe area's grab hand. */
const setCursor = (el: HTMLElement, cursor: string) => {
  el.style.cursor = cursor;
};
const tint = new Color();
/** The outline sits a hair under the fill, so the two never fight for the same depth. */
const EDGE_DROP = (MARKER_LIFT - 0.0006) / MARKER_LIFT;
/** Outline width in globe units, the same for every quake. */
const EDGE_WIDTH = 0.0026;

/** How quickly markers settle (higher is snappier). */
const DAMPING = 9;
/** Matching markers appear in a ripple outward from the answer, over this long. */
const RIPPLE_SECONDS = 0.6;

/**
 * Every earthquake as a flat disc on the surface, all in one draw call.
 * Quakes in the current answer grow in; the rest shrink away.
 */
export function Quakes() {
  const quakes = useGlobe((s) => s.quakes);
  const results = useGlobe((s) => s.results);
  const focusDay = useGlobe((s) => s.focusDay);
  const flyTarget = useGlobe((s) => s.flyTarget);
  const hover = useGlobe((s) => s.hover);
  const select = useGlobe((s) => s.select);
  const camera = useThree((s) => s.camera);
  // The canvas itself, so its cursor wins over the globe area's grab hand.
  const canvas = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useRef<InstancedMesh>(null);
  const edges = useRef<InstancedMesh>(null);

  // Smallest last, so little quakes draw on top of big ones they overlap.
  const ordered = useMemo(() => [...quakes].sort((a, b) => b.mag - a.mag), [quakes]);
  const positions = useMemo(() => ordered.map((q) => markerPosition(q.lat, q.lon)), [ordered]);

  // Per marker: current size (0–1), the size it's heading for, and when it may start growing.
  const animation = useRef({
    scale: new Float32Array(0),
    target: new Float32Array(0),
    delay: new Float32Array(0),
    startedAt: 0,
    running: false,
  });

  // New data: fresh animation state, and each marker's color.
  useLayoutEffect(() => {
    const n = ordered.length;
    Object.assign(animation.current, {
      scale: new Float32Array(n),
      target: new Float32Array(n),
      delay: new Float32Array(n),
    });
    const m = mesh.current;
    if (!m) return;
    ordered.forEach((q, i) => m.setColorAt(i, tint.set(depthValue(q.depthKm))));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    invalidate();
  }, [ordered, invalidate]);

  // A new answer: set each marker's target size, rippling out from where the camera is headed.
  useEffect(() => {
    const anim = animation.current;
    const visible = new Set(inFocus(results, focusDay).map((q) => q.id));
    // Each shown dot's full size, shrunk where the answer crowds together, so clusters stay countable.
    const shownIdx = ordered.flatMap((q, i) => (visible.has(q.id) ? [i] : []));
    const crowd = crowdScale(shownIdx.map((i) => positions[i]));
    const size = new Map(shownIdx.map((i, k) => [i, crowd[k]]));
    const origin = flyTarget ? latLonToVector3(flyTarget.lat, flyTarget.lon) : null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ordered.forEach((q, i) => {
      anim.target[i] = size.get(i) ?? 0;
      anim.delay[i] = origin && !reduced ? (positions[i].angleTo(origin) / Math.PI) * RIPPLE_SECONDS : 0;
      if (reduced) anim.scale[i] = anim.target[i];
    });
    anim.startedAt = performance.now() / 1000;
    anim.running = true;
    invalidate();
    // flyTarget changes on its own (selecting a quake); only a new answer re-ripples.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, focusDay, ordered, positions]);

  useFrame((state, frameDelta) => {
    // After an idle stretch the first frame's delta is huge; cap it so a ripple never skips ahead.
    const delta = Math.min(frameDelta, 1 / 30);
    const m = mesh.current;
    const e = edges.current;
    const anim = animation.current;
    if (!m || !e || !anim.running) return;
    const elapsed = performance.now() / 1000 - anim.startedAt;
    let moving = false;

    for (let i = 0; i < ordered.length; i++) {
      const target = anim.target[i];
      let s = anim.scale[i];
      // Growing waits for its turn in the ripple; shrinking starts at once.
      if (target > s && elapsed < anim.delay[i]) {
        moving = true;
      } else if (s !== target) {
        s = MathUtils.damp(s, target, DAMPING, delta);
        if (Math.abs(s - target) < 0.002) s = target;
        else moving = true;
        anim.scale[i] = s;
      }
      const p = positions[i];
      const r = markerRadius(ordered[i].mag) * s;
      dummy.position.copy(p);
      dummy.lookAt(p.x * 2, p.y * 2, p.z * 2); // face outward
      dummy.scale.setScalar(Math.max(1e-5, r));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      dummy.position.multiplyScalar(EDGE_DROP);
      dummy.scale.setScalar(s > 0.01 ? r + EDGE_WIDTH * s : 1e-5);
      dummy.updateMatrix();
      e.setMatrixAt(i, dummy.matrix);
    }

    m.instanceMatrix.needsUpdate = true;
    e.instanceMatrix.needsUpdate = true;
    if (moving) state.invalidate();
    else anim.running = false;
  });

  // Rays pass through the globe, so ignore discs on the far side or not in the answer.
  const hit = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const i = e.instanceId;
    if (i == null || animation.current.target[i] === 0 || !facesCamera(positions[i], camera.position)) return null;
    return ordered[i];
  };

  if (!ordered.length) return null;

  return (
    <>
    {/* Pale outlines, so even the darkest (deepest) quakes read on the ocean. */}
    <instancedMesh key={`edges-${ordered.length}`} ref={edges} args={[undefined, undefined, ordered.length]} frustumCulled={false} renderOrder={1}>
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial color={palette.markerEdge} depthWrite={false} />
    </instancedMesh>
    <instancedMesh
      key={ordered.length}
      ref={mesh}
      renderOrder={2}
      args={[undefined, undefined, ordered.length]}
      // Markers cover the whole globe, which is always in view; skip the culling check.
      frustumCulled={false}
      onPointerMove={(e) => {
        const q = hit(e);
        if (!q) return;
        e.stopPropagation();
        hover(q.id);
        setCursor(canvas, "pointer");
      }}
      onPointerOut={() => {
        hover(null);
        setCursor(canvas, "");
      }}
      onClick={(e) => {
        const q = hit(e);
        if (!q) return;
        e.stopPropagation();
        select(q.id);
      }}
    >
      <circleGeometry args={[1, 24]} />
      {/* White so each instance's own (depth) color shows unchanged. */}
      <meshBasicMaterial color="#ffffff" depthWrite={false} />
    </instancedMesh>
    </>
  );
}
