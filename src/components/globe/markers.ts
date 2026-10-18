import { latLonToVector3 } from "@/lib/geo";

/** Markers sit just above the surface so they never flicker into it. */
export const MARKER_LIFT = 1.004;

/** Marker radius in globe units (globe radius = 1): M2.5 is a speck, M7+ is unmissable. */
export function markerRadius(mag: number) {
  return 0.0045 + Math.max(0, mag - 2.5) * 0.0048;
}

export const markerPosition = (lat: number, lon: number) => latLonToVector3(lat, lon, MARKER_LIFT);

/** Two quakes closer than this (radians of arc, about 160 km) crowd each other. */
const CROWD_ANGLE = 0.025;
const COS_CROWD = Math.cos(CROWD_ANGLE);
/** Grid cell size: a little over the straight-line distance two crowding quakes can be apart. */
const CELL = 2 * Math.sin(CROWD_ANGLE / 2) * 1.1;
/** The smallest a crowded dot shrinks to, as a share of its full size. */
const MIN_CROWDED = 0.5;

/**
 * How much to shrink each dot so dense clusters stay readable: 1 for a quake
 * on its own, smaller the more of the answer sits within ~160 km of it.
 * `points` are unit-length positions on the globe.
 */
export function crowdScale(points: { x: number; y: number; z: number }[]) {
  const out = new Float32Array(points.length);
  // Bucket points into cubes about one crowd-distance wide, so each point only
  // checks its own cube and the 26 around it instead of every other point.
  const cells = new Map<string, number[]>();
  const cellOf = (p: { x: number; y: number; z: number }) =>
    [Math.floor(p.x / CELL), Math.floor(p.y / CELL), Math.floor(p.z / CELL)] as const;
  points.forEach((p, i) => {
    const key = cellOf(p).join(",");
    const bucket = cells.get(key);
    if (bucket) bucket.push(i);
    else cells.set(key, [i]);
  });
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const [cx, cy, cz] = cellOf(a);
    let near = 0;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!bucket) continue;
          for (const j of bucket) {
            if (i === j) continue;
            const b = points[j];
            if (a.x * b.x + a.y * b.y + a.z * b.z > COS_CROWD) near++;
          }
        }
    out[i] = Math.max(MIN_CROWDED, 1 / Math.sqrt(1 + near * 0.1));
  }
  return out;
}
