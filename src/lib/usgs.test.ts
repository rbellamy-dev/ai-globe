import { describe, expect, it } from "vitest";
import { normalizeFeed, type Feed } from "./usgs";

const feature = (id: string, props: Partial<Feed["features"][number]["properties"]>, coords: [number, number, number]) => ({
  id,
  properties: { mag: 3, place: "Somewhere", time: 0, url: `https://usgs/${id}`, type: "earthquake", ...props },
  geometry: { coordinates: coords },
});

describe("normalizeFeed", () => {
  const feed: Feed = {
    features: [
      feature("old", { mag: 6.1, time: 1000, place: "100 km S of Town, Country" }, [142.4, 38.2, 24.567]),
      feature("new", { mag: 2.7, time: 5000 }, [-122.1, 37.4, 8]),
      feature("blast", { type: "quarry blast", time: 6000 }, [0, 0, 0]),
      feature("nomag", { mag: null, time: 7000 }, [0, 0, 0]),
      feature("noplace", { place: null, time: 3000 }, [10, 20, 5]),
    ],
  };
  const quakes = normalizeFeed(feed);

  it("keeps earthquakes with a magnitude, newest first", () => {
    expect(quakes.map((q) => q.id)).toEqual(["new", "noplace", "old"]);
  });

  it("reads coordinates as lon, lat, depth and rounds depth", () => {
    const q = quakes.find((q) => q.id === "old")!;
    expect(q).toMatchObject({ lat: 38.2, lon: 142.4, depthKm: 24.6, mag: 6.1, place: "100 km S of Town, Country" });
  });

  it("fills in a missing place", () => {
    expect(quakes.find((q) => q.id === "noplace")!.place).toBe("Unknown location");
  });
});
