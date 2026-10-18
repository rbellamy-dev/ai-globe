import { describe, expect, it } from "vitest";
import { latLonToVector3 } from "@/lib/geo";
import { crowdScale } from "./markers";

const at = (lat: number, lon: number) => latLonToVector3(lat, lon);

describe("crowdScale", () => {
  it("leaves a quake on its own at full size", () => {
    expect(Array.from(crowdScale([at(0, 0), at(40, 90), at(-30, -120)]))).toEqual([1, 1, 1]);
  });

  it("shrinks quakes in a tight cluster, more the tighter it is", () => {
    const pair = crowdScale([at(-18, 178), at(-18.3, 178.2)]);
    const cluster = crowdScale(Array.from({ length: 40 }, (_, i) => at(-18 - (i % 8) * 0.12, 178 + Math.floor(i / 8) * 0.12)));
    expect(pair[0]).toBeLessThan(1);
    expect(Math.max(...cluster)).toBeLessThan(pair[0]);
  });

  it("never shrinks a dot to nothing", () => {
    const pile = crowdScale(Array.from({ length: 200 }, () => at(10, 10)));
    expect(Math.min(...pile)).toBeCloseTo(0.5, 5); // the floor, give or take float rounding
  });

  it("counts the same neighbors as checking every pair", () => {
    // A dense patch (lots of crowding across cell edges) plus scattered quakes.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const points = Array.from({ length: 600 }, (_, i) =>
      i < 400 ? at(-20 + rand() * 6, 175 + rand() * 6) : at(rand() * 180 - 90, rand() * 360 - 180),
    );
    const cos = Math.cos(0.025);
    const brute = points.map((a, i) => {
      const near = points.filter((b, j) => j !== i && a.x * b.x + a.y * b.y + a.z * b.z > cos).length;
      return Math.max(0.5, 1 / Math.sqrt(1 + near * 0.1));
    });
    const grid = Array.from(crowdScale(points));
    grid.forEach((v, i) => expect(v).toBeCloseTo(brute[i], 5));
  });
});
