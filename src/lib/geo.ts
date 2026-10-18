import { Vector3 } from "three";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * A point on a sphere for a latitude/longitude, matching how three's
 * SphereGeometry lays an equirectangular texture: u = 0 is longitude -180.
 */
export function latLonToVector3(lat: number, lon: number, radius = 1) {
  const theta = toRad(90 - lat);
  const phi = toRad(lon + 180);
  return new Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** The inverse of latLonToVector3: the latitude/longitude a point on the sphere sits over. */
export function vector3ToLatLon(v: Vector3) {
  const n = v.clone().normalize();
  const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, n.y))) * 180) / Math.PI;
  let lon = (Math.atan2(n.z, -n.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  return { lat, lon };
}

/** Points the camera sees well: within this angle of the view's center (90° would be the very edge). */
const WELL_IN_VIEW = Math.cos((70 * Math.PI) / 180);

/**
 * Where to look to see the most of an answer at once. Tries each of the
 * most important points as the center, keeps the one whose side of the
 * globe holds the most (bigger quakes count more), then centers on those.
 * `points` should be sorted most important first.
 */
export function bestView(points: { lat: number; lon: number; mag: number }[]) {
  if (!points.length) return null;
  const all = points.map((p) => ({ v: latLonToVector3(p.lat, p.lon), w: 1 + Math.max(0, p.mag - 2.5) }));

  let best = all[0];
  let bestScore = -1;
  for (const c of all.slice(0, 200)) {
    let score = 0;
    for (const p of all) if (c.v.dot(p.v) > WELL_IN_VIEW) score += p.w;
    if (score > bestScore) [best, bestScore] = [c, score];
  }

  const center = new Vector3();
  for (const p of all) if (best.v.dot(p.v) > WELL_IN_VIEW) center.addScaledVector(p.v, p.w);
  return vector3ToLatLon(center.lengthSq() > 1e-9 ? center : best.v);
}

/** Great-circle distance in km (haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Whether a point on the unit globe faces a camera at `cameraPosition`
 * (looking at the center), i.e. isn't hidden behind the globe.
 */
export function facesCamera(point: Vector3, cameraPosition: Vector3) {
  return point.dot(cameraPosition) > 1;
}
