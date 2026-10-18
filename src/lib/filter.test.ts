import { describe, expect, it } from "vitest";
import { applyQuery, headline, noResultsText } from "./filter";
import { DEFAULT_QUERY, type Query } from "./querySchema";
import type { Quake } from "./usgs";

const NOW = Date.UTC(2026, 9, 17);
const DAY = 24 * 3_600_000;

const quake = (id: string, mag: number, daysAgo: number, extra: Partial<Quake> = {}): Quake => ({
  id,
  mag,
  lat: 0,
  lon: 0,
  depthKm: 10,
  time: NOW - daysAgo * DAY,
  place: id,
  ...extra,
});

const tokyo = { lat: 35.7, lon: 139.7 };
const quakes = [
  quake("big-old", 7.1, 20),
  quake("mid-recent", 5.2, 1),
  quake("small-today", 2.8, 0.1),
  quake("deep", 6.0, 3, { depthKm: 410 }),
  quake("tokyo", 4.4, 2.5, tokyo),
  quake("tokyo-far-past", 6.6, 40, tokyo),
];

const q = (over: Partial<Query>): Query => ({ ...DEFAULT_QUERY, ...over });
const ids = (query: Query) => applyQuery(quakes, query, NOW).shown.map((x) => x.id);

describe("applyQuery", () => {
  it("keeps the last `days`, biggest first by default", () => {
    expect(ids(DEFAULT_QUERY)).toEqual(["big-old", "deep", "mid-recent", "tokyo", "small-today"]);
    expect(ids(q({ days: 2 }))).toEqual(["mid-recent", "small-today"]);
  });

  it("filters by magnitude range", () => {
    expect(ids(q({ minMagnitude: 6 }))).toEqual(["big-old", "deep"]);
    expect(ids(q({ minMagnitude: 4, maxMagnitude: 5.5 }))).toEqual(["mid-recent", "tokyo"]);
  });

  it("filters by depth", () => {
    expect(ids(q({ maxDepthKm: 70 }))).not.toContain("deep");
    expect(ids(q({ minDepthKm: 300 }))).toEqual(["deep"]);
    expect(ids(q({ minDepthKm: 5, maxDepthKm: 50 }))).not.toContain("deep");
  });

  it("filters by distance from a region's center", () => {
    const region = { name: "Japan", lat: 36.2, lon: 138.3, radiusKm: 900 };
    expect(ids(q({ region }))).toEqual(["tokyo"]);
  });

  it("sorts smallest first when asked for the weakest", () => {
    expect(ids(q({ sort: "smallest" }))).toEqual(["small-today", "tokyo", "mid-recent", "deep", "big-old"]);
  });

  it("sorts by time when asked for recent", () => {
    expect(ids(q({ sort: "recent" }))).toEqual(["small-today", "mid-recent", "tokyo", "deep", "big-old"]);
  });

  it("applies the limit after sorting and reports the total before it", () => {
    const result = applyQuery(quakes, q({ limit: 2 }), NOW);
    expect(result.shown.map((x) => x.id)).toEqual(["big-old", "deep"]);
    expect(result.total).toBe(5);
  });
});

describe("noResultsText", () => {
  const venezuela = { name: "Venezuela", lat: 7.1, lon: -66.2, radiusKm: 600 };

  it("names the place and says the data stops at a month", () => {
    expect(noResultsText(q({ region: venezuela, sort: "recent", limit: 1 }))).toBe(
      "No earthquakes near Venezuela in the last 30 days. This map only covers the last month of USGS data."
    );
  });

  it("suggests the way out: fewer filters, or a longer window", () => {
    expect(noResultsText(q({ minMagnitude: 7, region: venezuela }))).toBe(
      "No earthquakes like that near Venezuela in the last 30 days. This map only covers the last month of USGS data. Try removing a filter."
    );
    expect(noResultsText(q({ days: 1 }))).toBe("No earthquakes in the last 24 hours. Try a longer time window.");
  });
});

describe("headline", () => {
  const h = (query: Query) => headline(query, applyQuery(quakes, query, NOW), NOW);

  it("describes the default view", () => {
    expect(h(DEFAULT_QUERY)).toMatchObject({ count: 5, label: "earthquakes of M 2.5+", when: "in the last 30 days" });
  });

  it("names every filter in use", () => {
    const region = { name: "Japan", lat: 36.2, lon: 138.3, radiusKm: 900 };
    expect(h(q({ minMagnitude: 4, maxDepthKm: 70, region, days: 7 }))).toMatchObject({
      count: 1,
      label: "earthquake of M 4.0+ shallower than 70 km within 900 km of Japan",
      when: "in the last 7 days",
    });
  });

  it("says when a limit cut the list short", () => {
    expect(h(q({ limit: 2 })).label).toBe("biggest of 5 earthquakes of M 2.5+");
    expect(h(q({ limit: 2, sort: "smallest" })).label).toBe("smallest of 5 earthquakes of M 2.5+");
  });

  it("answers 'the last earthquake' with how long ago it was, not the 30-day window", () => {
    expect(h(q({ sort: "recent", limit: 1 }))).toMatchObject({
      count: 1,
      label: "most recent earthquake of M 2.5+",
      when: "latest 2h ago",
    });
    expect(h(q({ sort: "recent", limit: 3 })).label).toBe("most recent earthquakes of M 2.5+");
  });

  it("keeps a window the question asked for", () => {
    expect(h(q({ sort: "recent", limit: 1, days: 7 })).when).toBe("in the last 7 days · latest 2h ago");
    expect(h(q({ sort: "recent" })).when).toBe("in the last 30 days · latest 2h ago");
  });

  it("describes depth ranges", () => {
    expect(h(q({ minDepthKm: 300 })).label).toBe("earthquake of M 2.5+ deeper than 300 km");
    expect(h(q({ minDepthKm: 70, maxDepthKm: 300 })).label).toBe("earthquakes of M 2.5+ 70–300 km deep");
  });

  it("shows ranges and the 24-hour case", () => {
    expect(h(q({ minMagnitude: 4, maxMagnitude: 5.5 })).label).toBe("earthquakes of M 4.0–5.5");
    expect(h(q({ days: 1 })).when).toBe("in the last 24 hours");
  });
});
