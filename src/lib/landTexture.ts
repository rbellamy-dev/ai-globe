import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import { palette } from "./palette";

const topology = land110 as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);

export interface LandColors {
  ocean: string;
  land: string;
  grid: string;
}

/**
 * Paints the map (ocean, grid, land) as an equirectangular image to wrap
 * around the sphere, at a size that stays sharp when zoomed in. Works on a
 * page canvas or an OffscreenCanvas in a worker, so colors come in as values.
 */
export function paintLand(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, colors: LandColors) {
  const height = width / 2;
  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);
  const path = geoPath(projection, ctx as CanvasRenderingContext2D);

  ctx.fillStyle = colors.ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  path(land);
  ctx.fillStyle = colors.land;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = colors.grid;
  ctx.stroke();

  // The grid goes over the land too, faintly, like the wireframe.
  ctx.beginPath();
  path(geoGraticule10());
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.grid;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The globe's colors from the tokens. Browser only. */
export const landColors = (): LandColors => ({ ocean: palette.ocean, land: palette.land, grid: palette.grid });

/** The map on a page canvas: the fallback where workers can't draw. */
export function drawLandTexture(width = 4096) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = width / 2;
  paintLand(canvas.getContext("2d")!, width, landColors());
  return canvas;
}
