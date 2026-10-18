import { MathUtils, type PerspectiveCamera } from "three";

/** Globe radius plus room for its shadow halo, in globe units. */
const GLOBE_MARGIN = 1.22;

/**
 * How far back the camera must sit for the whole globe and its glow to fit
 * the canvas width as well as its height (narrow screens need more room).
 */
export function worldFitDistance(camera: PerspectiveCamera, aspect: number, base: number) {
  const halfFov = MathUtils.degToRad(camera.fov / 2);
  return Math.max(base, GLOBE_MARGIN / (Math.tan(halfFov) * aspect));
}

/** The distance at which the whole globe and its glow fit both the canvas height and width. */
export function wholeGlobeDistance(camera: PerspectiveCamera, aspect: number) {
  const halfFov = MathUtils.degToRad(camera.fov / 2);
  return worldFitDistance(camera, aspect, GLOBE_MARGIN / Math.tan(halfFov));
}
