"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { formatMag, timeAgo } from "@/lib/format";
import { facesCamera } from "@/lib/geo";
import { palette } from "@/lib/palette";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { Quake } from "@/lib/usgs";
import { useGlobe } from "@/store";
import { markerPosition, markerRadius } from "./markers";

const RINGS = 2;
const PULSE_SECONDS = 1.6;

/** The quakes in focus: pulse rings and a label on the selected one, a label on the hovered one. */
export function Focus() {
  const quakes = useGlobe((s) => s.quakes);
  const selectedId = useGlobe((s) => s.selectedId);
  const hoveredId = useGlobe((s) => s.hoveredId);

  const selected = useMemo(() => quakes.find((q) => q.id === selectedId) ?? null, [quakes, selectedId]);
  const hovered = useMemo(
    () => (hoveredId && hoveredId !== selectedId ? (quakes.find((q) => q.id === hoveredId) ?? null) : null),
    [quakes, hoveredId, selectedId]
  );

  return (
    <>
      {selected && <Pulse key={`pulse-${selected.id}`} lat={selected.lat} lon={selected.lon} mag={selected.mag} />}
      {/* Keyed by quake, not role: clicking the hovered quake keeps its label
          on screen (it just becomes the selected one) instead of swapping it. */}
      {selected && <Label key={`label-${selected.id}`} quake={selected} hiddenBy={hovered} />}
      {hovered && <Label key={`label-${hovered.id}`} quake={hovered} />}
    </>
  );
}

function Pulse({ lat, lon, mag }: { lat: number; lon: number; mag: number }) {
  const group = useRef<Group>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const position = useMemo(() => markerPosition(lat, lon), [lat, lon]);
  const base = markerRadius(mag);
  // Reduced motion: the rings hold still, spaced out, instead of pulsing.
  const reduced = useReducedMotion();

  useFrame(({ clock, invalidate }) => {
    group.current?.lookAt(position.x * 2, position.y * 2, position.z * 2);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const phase = reduced ? 0.25 + i * 0.35 : (clock.elapsedTime / PULSE_SECONDS + i / RINGS) % 1;
      ring.scale.setScalar(base * (1.3 + phase * 2.4));
      (ring.material as MeshBasicMaterial).opacity = (1 - phase) * 0.7;
    });
    // The canvas draws on demand: keep asking while the rings pulse.
    if (!reduced) invalidate();
  });

  return (
    <group ref={group} position={position}>
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)}>
          <ringGeometry args={[0.86, 1, 48]} />
          <meshBasicMaterial color={palette.ink} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A quake's label card. Hidden while the quake is round the back of the
 * globe, and while `hiddenBy` (another quake's label) is on show.
 */
function Label({ quake, hiddenBy = null }: { quake: Quake; hiddenBy?: Quake | null }) {
  const card = useRef<HTMLDivElement>(null);
  // A new label starts hidden and waits a frame for Html to place it,
  // so it never flashes at the canvas corner first. Then it fades in.
  const framesShown = useRef(0);
  const position = useMemo(() => markerPosition(quake.lat, quake.lon), [quake.lat, quake.lon]);
  const other = useMemo(() => (hiddenBy ? markerPosition(hiddenBy.lat, hiddenBy.lon) : null), [hiddenBy]);

  useFrame(({ camera, invalidate }) => {
    if (!card.current) return;
    // Ask for the frames the label needs to place itself, even if nothing else is moving.
    if (framesShown.current++ < 1) return void invalidate();
    const visible = facesCamera(position, camera.position);
    // Steps aside while another quake's label is on show, back when it's gone.
    // It vanishes at once (no fade) so the two cards never overlap half-faded.
    const covered = other !== null && facesCamera(other, camera.position);
    card.current.style.transition = covered ? "none" : "";
    card.current.style.opacity = visible && !covered ? "1" : "0";
  });

  return (
    <Html position={position} zIndexRange={hiddenBy ? [10, 0] : [20, 11]} style={{ pointerEvents: "none" }}>
      <div
        ref={card}
        style={{ opacity: 0 }}
        className="w-max max-w-64 -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-xl bg-ink px-4 py-3 text-bg shadow-lg transition-opacity duration-150"
      >
        {/* 20 / 15 / 12px: each step at least 1.25× the next, so the magnitude leads. */}
        <p className="text-xl leading-tight font-semibold tabular-nums">{formatMag(quake.mag)}</p>
        <p className="mt-1 text-[15px] leading-snug text-bg/85">{quake.place}</p>
        <p className="mt-1.5 text-xs text-bg/70">
          {timeAgo(quake.time)} · {quake.depthKm} km deep
        </p>
      </div>
    </Html>
  );
}
