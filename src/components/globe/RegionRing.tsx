"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { Vector3 } from "three";
import { latLonToVector3 } from "@/lib/geo";
import { palette } from "@/lib/palette";
import { useGlobe } from "@/store";

const EARTH_RADIUS_KM = 6371;
const SEGMENTS = 128;
/** Just above the quakes, so the ring is never hidden under them. */
const LIFT = 1.006;

/**
 * The area a question searched ("within 900 km of Japan") as a dashed circle
 * on the globe, in the place color: the same violet as the place in the sentence.
 */
export function RegionRing() {
  const region = useGlobe((s) => s.query.region);

  const points = useMemo(() => {
    if (!region) return null;
    const center = latLonToVector3(region.lat, region.lon).normalize();
    // Two directions at right angles to the center, to sweep the circle around it.
    const helper = Math.abs(center.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const u = new Vector3().crossVectors(center, helper).normalize();
    const v = new Vector3().crossVectors(center, u);
    const angle = region.radiusKm / EARTH_RADIUS_KM;
    return Array.from({ length: SEGMENTS + 1 }, (_, i) => {
      const t = (i / SEGMENTS) * Math.PI * 2;
      return center
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(u, Math.cos(t) * Math.sin(angle))
        .addScaledVector(v, Math.sin(t) * Math.sin(angle))
        .multiplyScalar(LIFT);
    });
  }, [region]);

  if (!points) return null;
  return <Line points={points} color={palette.place} lineWidth={2.5} dashed dashSize={0.025} gapSize={0.018} />;
}
