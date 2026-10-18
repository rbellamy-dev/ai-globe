import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { bestView, distanceKm, facesCamera, latLonToVector3, vector3ToLatLon } from "./geo";

const close = (v: Vector3, x: number, y: number, z: number) => {
  expect(v.x).toBeCloseTo(x, 6);
  expect(v.y).toBeCloseTo(y, 6);
  expect(v.z).toBeCloseTo(z, 6);
};

describe("latLonToVector3", () => {
  it("puts the poles on the y axis", () => {
    close(latLonToVector3(90, 0), 0, 1, 0);
    close(latLonToVector3(-90, 45), 0, -1, 0);
  });

  it("matches the texture's longitude layout on the equator", () => {
    close(latLonToVector3(0, 0), 1, 0, 0);
    close(latLonToVector3(0, 90), 0, 0, -1);
    close(latLonToVector3(0, -90), 0, 0, 1);
    close(latLonToVector3(0, 180), -1, 0, 0);
  });

  it("scales to the radius", () => {
    expect(latLonToVector3(12, 34, 2.5).length()).toBeCloseTo(2.5, 6);
  });
});

describe("vector3ToLatLon", () => {
  it("undoes latLonToVector3", () => {
    for (const [lat, lon] of [[0, 0], [35.7, 139.7], [-33.9, 151.2], [64.1, -21.9], [-17.7, 178.1], [10, -179.5]]) {
      const back = vector3ToLatLon(latLonToVector3(lat, lon));
      expect(back.lat).toBeCloseTo(lat, 6);
      expect(back.lon).toBeCloseTo(lon, 6);
    }
  });
});

describe("bestView", () => {
  it("aims at the cluster, not at the single biggest outlier", () => {
    const japan = [
      { lat: 36, lon: 140, mag: 5 },
      { lat: 34, lon: 136, mag: 5 },
      { lat: 38, lon: 142, mag: 4.8 },
      { lat: 31, lon: 131, mag: 5.1 },
    ];
    const brazil = { lat: -10, lon: -50, mag: 6.5 }; // biggest, but alone on the far side
    const view = bestView([brazil, ...japan])!;
    expect(distanceKm(view.lat, view.lon, 35, 138)).toBeLessThan(800);
  });

  it("centers on a lone point, and returns null for nothing", () => {
    const view = bestView([{ lat: -17.7, lon: 178.1, mag: 5 }])!;
    expect(view.lat).toBeCloseTo(-17.7, 4);
    expect(bestView([])).toBeNull();
  });
});

describe("distanceKm", () => {
  it("is about 344 km from London to Paris", () => {
    expect(distanceKm(51.5074, -0.1278, 48.8566, 2.3522)).toBeCloseTo(344, -1);
  });

  it("is zero for the same point and half the circumference for antipodes", () => {
    expect(distanceKm(10, 20, 10, 20)).toBe(0);
    expect(distanceKm(0, 0, 0, 180)).toBeCloseTo(Math.PI * 6371, 0);
  });
});

describe("facesCamera", () => {
  const camera = new Vector3(0, 0, 4);

  it("is true for the near side and false for the far side", () => {
    expect(facesCamera(new Vector3(0, 0, 1), camera)).toBe(true);
    expect(facesCamera(new Vector3(0, 0, -1), camera)).toBe(false);
  });

  it("is false right at the edge of the visible disc", () => {
    expect(facesCamera(new Vector3(1, 0, 0), camera)).toBe(false);
  });
});
