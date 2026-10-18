import { token } from "./palette";

/**
 * Quake depth as one of four colors, shallow to deep. The colors are the
 * --color-depth-* tokens, so a quake is the same color on the globe, the
 * timeline, the list and the legend.
 */
export const DEPTH_STEPS = [
  // Notes follow the usual seismology bands (shallow under 70 km, intermediate to 300, deep beyond),
  // with the top 30 km split out as "near surface" so every band has its own word.
  { maxKm: 30, label: "0–30 km", note: "near surface", token: "depth-1" },
  { maxKm: 70, label: "30–70 km", note: "shallow", token: "depth-2" },
  { maxKm: 300, label: "70–300 km", note: "intermediate", token: "depth-3" },
  { maxKm: Infinity, label: "300+ km", note: "deep", token: "depth-4" },
] as const;

const stepFor = (km: number) => DEPTH_STEPS.find((s) => km < s.maxKm) ?? DEPTH_STEPS[DEPTH_STEPS.length - 1];

/** For the page (styles, SVG): the token itself. */
export const depthColor = (km: number) => `var(--color-${stepFor(km).token})`;

/** Its edge on the page, dark enough to see against the page; the globe outlines its own dots. */
export const depthEdge = (km: number) => `var(--color-${stepFor(km).token}-edge)`;

/** For the 3D globe, which needs the actual value. Browser only. */
export const depthValue = (km: number) => token(stepFor(km).token);
