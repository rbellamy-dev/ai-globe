/** One earthquake, trimmed to what the globe and panel use. */
export interface Quake {
  id: string;
  mag: number;
  lat: number;
  lon: number;
  depthKm: number;
  /** Epoch milliseconds. */
  time: number;
  place: string;
}

interface Feature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    type?: string;
  };
  geometry: { coordinates: [lon: number, lat: number, depthKm: number] };
}

export interface Feed {
  metadata?: { generated?: number };
  features: Feature[];
}

/** M2.5+ is what people feel, and small enough (~1.5 MB) to cache. */
export const FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson";

/**
 * Keeps earthquakes only (the feed also has quarry blasts and landslides) and
 * drops any without a magnitude. Newest first.
 */
export function normalizeFeed(feed: Feed): Quake[] {
  return feed.features
    .filter((f) => (f.properties.type ?? "earthquake") === "earthquake" && typeof f.properties.mag === "number")
    .map((f) => {
      const [lon, lat, depth] = f.geometry.coordinates;
      return {
        id: f.id,
        mag: f.properties.mag as number,
        lat,
        lon,
        depthKm: Math.round(depth * 10) / 10,
        time: f.properties.time,
        place: f.properties.place?.trim() || "Unknown location",
      };
    })
    .sort((a, b) => b.time - a.time);
}
