import { PRESETS } from "./presets";
import { DEFAULT_QUERY, querySchema, type Query } from "./querySchema";

/** What the URL holds: enough to redraw an answer exactly, with no AI call. */
export interface SharedAnswer {
  query: Query;
  question: string;
  presetId: string | null;
  source: "preset" | "ai";
  edited: boolean;
}

const round = (n: number) => String(Math.round(n * 100) / 100);

/**
 * An answer as a query string. An untouched example is just `?ex=near-japan`;
 * anything else spells out its filters, so a shared link never needs the AI.
 * The default view is the empty string.
 */
export function toSearch(answer: SharedAnswer | null): string {
  if (!answer) return "";
  if (answer.presetId && !answer.edited) return `?ex=${answer.presetId}`;

  const { query: q } = answer;
  const p = new URLSearchParams();
  p.set("q", answer.question);
  if (answer.source === "preset") p.set("src", "example");
  if (answer.edited) p.set("edited", "1");
  if (q.minMagnitude != null) p.set("min", String(q.minMagnitude));
  if (q.maxMagnitude != null) p.set("max", String(q.maxMagnitude));
  if (q.minDepthKm != null) p.set("dmin", String(q.minDepthKm));
  if (q.maxDepthKm != null) p.set("dmax", String(q.maxDepthKm));
  if (q.region) {
    p.set("near", q.region.name);
    p.set("lat", round(q.region.lat));
    p.set("lon", round(q.region.lon));
    p.set("r", String(q.region.radiusKm));
  }
  if (q.days !== DEFAULT_QUERY.days) p.set("days", String(q.days));
  if (q.sort !== DEFAULT_QUERY.sort) p.set("sort", q.sort);
  if (q.limit != null) p.set("top", String(q.limit));
  return `?${p.toString()}`;
}

/** The answer a query string describes, or null for the default view or anything malformed. */
export function fromSearch(search: string): SharedAnswer | null {
  const p = new URLSearchParams(search);

  const ex = p.get("ex");
  if (ex) {
    const preset = PRESETS.find((x) => x.id === ex);
    return preset
      ? { query: preset.query, question: preset.label, presetId: preset.id, source: "preset", edited: false }
      : null;
  }

  const question = p.get("q")?.trim();
  if (!question) return null;
  const num = (key: string) => (p.has(key) ? Number(p.get(key)) : null);
  const near = p.get("near");

  const parsed = querySchema.safeParse({
    ...DEFAULT_QUERY,
    title: question.slice(0, 80),
    minMagnitude: num("min"),
    maxMagnitude: num("max"),
    minDepthKm: num("dmin"),
    maxDepthKm: num("dmax"),
    region: near ? { name: near, lat: num("lat"), lon: num("lon"), radiusKm: num("r") } : null,
    days: num("days") ?? DEFAULT_QUERY.days,
    sort: p.get("sort") ?? DEFAULT_QUERY.sort,
    limit: num("top"),
  });
  if (!parsed.success) return null;

  return {
    query: parsed.data,
    question,
    presetId: null,
    source: p.get("src") === "example" ? "preset" : "ai",
    edited: p.get("edited") === "1",
  };
}
