import { DEFAULT_QUERY, type Query } from "./querySchema";

/** The example chips: ready-made queries, so they're instant and cost nothing. */
export interface Preset {
  id: string;
  label: string;
  query: Query;
}

export const PRESETS: Preset[] = [
  {
    id: "biggest-week",
    label: "Biggest this week",
    query: { ...DEFAULT_QUERY, title: "Biggest this week", days: 7, limit: 10 },
  },
  {
    id: "near-japan",
    label: "Near Japan",
    query: {
      ...DEFAULT_QUERY,
      title: "Earthquakes near Japan",
      region: { name: "Japan", lat: 36.2, lon: 138.3, radiusKm: 900 },
    },
  },
  {
    id: "shallow",
    label: "Shallow quakes only",
    // USGS calls anything under 70 km deep "shallow".
    query: { ...DEFAULT_QUERY, title: "Shallow earthquakes", maxDepthKm: 70 },
  },
];
