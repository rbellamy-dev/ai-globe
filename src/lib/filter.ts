import { timeAgo } from "./format";
import { distanceKm } from "./geo";
import { DEFAULT_QUERY, type Query } from "./querySchema";
import type { Quake } from "./usgs";

const DAY = 24 * 3_600_000;
/** All the data there is: the feed covers the last 30 days. */
const DEFAULT_DAYS = DEFAULT_QUERY.days;
/** The feed only has M2.5 and up, so that's the floor when no minimum is asked for. */
export const FEED_MIN_MAGNITUDE = 2.5;

export interface QueryResult {
  /** The quakes to show, sorted, after `limit`. */
  shown: Quake[];
  /** How many matched before `limit`. */
  total: number;
}

/** Runs a query over the quakes. Pure: same quakes, query and `now` give the same answer. */
export function applyQuery(quakes: Quake[], query: Query, now = Date.now()): QueryResult {
  const since = now - query.days * DAY;
  const { minMagnitude: min, maxMagnitude: max, minDepthKm, maxDepthKm, region } = query;

  const matches = quakes.filter(
    (q) =>
      q.time >= since &&
      (min == null || q.mag >= min) &&
      (max == null || q.mag <= max) &&
      (minDepthKm == null || q.depthKm >= minDepthKm) &&
      (maxDepthKm == null || q.depthKm <= maxDepthKm) &&
      (region == null || distanceKm(q.lat, q.lon, region.lat, region.lon) <= region.radiusKm)
  );

  const order: Record<Query["sort"], (a: Quake, b: Quake) => number> = {
    magnitude: (a, b) => b.mag - a.mag || b.time - a.time,
    smallest: (a, b) => a.mag - b.mag || b.time - a.time,
    recent: (a, b) => b.time - a.time,
  };
  matches.sort(order[query.sort]);

  return { shown: query.limit ? matches.slice(0, query.limit) : matches, total: matches.length };
}

const mag = (m: number) => `M ${m.toFixed(1)}`;

const periodOf = (days: number) => (days === 1 ? "the last 24 hours" : `the last ${days} days`);

/**
 * The answer's headline, built from the result and the query, never by the
 * AI. It reads as one sentence: "**46 earthquakes** of M 2.5+ within 900 km
 * of Japan in the last 30 days", where `count` + `lead` are the bold part,
 * then `detail`, then `when`. `label` is `lead` + `detail`.
 * Newest-first answers say how long ago the latest was, not the window.
 */
export function headline(query: Query, { shown, total }: QueryResult, now = Date.now()) {
  const { minMagnitude: min, maxMagnitude: max } = query;
  let size: string;
  if (min != null && max != null) size = `of ${mag(min)}–${max.toFixed(1)}`;
  else if (min != null) size = `of ${mag(min)}+`;
  else if (max != null) size = `of ${mag(FEED_MIN_MAGNITUDE)}–${max.toFixed(1)}`;
  else size = `of ${mag(FEED_MIN_MAGNITUDE)}+`;
  const { minDepthKm: deep, maxDepthKm: shallow } = query;
  let depth: string | null = null;
  if (deep != null && shallow != null) depth = `${deep}–${shallow} km deep`;
  else if (deep != null) depth = `deeper than ${deep} km`;
  else if (shallow != null) depth = `shallower than ${shallow} km`;
  const place = query.region
    ? `${query.region.radiusKm.toLocaleString("en-US")} km of ${query.region.name}`
    : null;
  const parts = [size, depth, place && `within ${place}`].filter((p): p is string => p !== null);

  const recent = query.sort === "recent";
  const window = `in ${periodOf(query.days)}`;

  // "The last earthquake in Venezuela": the 1 most recent one, and how long ago it was.
  const detail = parts.join(" ");
  /**
   * Also the sentence in pieces, so the page can color the place and the time:
   * `sized` says whether the size filter is worth saying (M2.5+ is all the data there is),
   * `period` is "the last 30 days" (null when the window goes unsaid), `latest` is "2h ago".
   */
  const build = (lead: string, when: string, period: string | null, latest: string | null) => ({
    count: shown.length,
    lead,
    detail,
    label: `${lead} ${detail}`,
    when,
    size,
    sized: min != null || max != null,
    depth,
    place,
    period,
    latest,
  });

  if (recent && query.limit != null && shown.length > 0) {
    const ago = timeAgo(shown[0].time, now);
    // The window only matters if the question set one; 30 days is just all the data there is.
    const saysWindow = query.days !== DEFAULT_DAYS;
    return build(
      shown.length === 1 ? "most recent earthquake" : "most recent earthquakes",
      saysWindow ? `${window} · latest ${ago}` : `latest ${ago}`,
      saysWindow ? periodOf(query.days) : null,
      ago
    );
  }

  const noun = total === 1 ? "earthquake" : "earthquakes";
  const limited = query.limit != null && total > shown.length;
  const latest = recent && shown.length > 0 ? timeAgo(shown[0].time, now) : null;
  return build(
    limited ? `${query.sort === "smallest" ? "smallest" : "biggest"} of ${total.toLocaleString("en-US")} ${noun}` : noun,
    latest ? `${window} · latest ${latest}` : window,
    periodOf(query.days),
    latest
  );
}

/** Why the answer is empty, in words: the place and window searched, and that the data stops at 30 days. */
export function noResultsText(query: Query) {
  const where = query.region ? ` near ${query.region.name}` : "";
  const filtered =
    query.minMagnitude != null ||
    query.maxMagnitude != null ||
    query.minDepthKm != null ||
    query.maxDepthKm != null;
  const sentences = [`No earthquakes${filtered ? " like that" : ""}${where} in ${periodOf(query.days)}.`];
  if (query.days === DEFAULT_DAYS) sentences.push("This map only covers the last month of USGS data.");
  if (filtered) sentences.push("Try removing a filter.");
  else if (query.days < DEFAULT_DAYS) sentences.push("Try a longer time window.");
  return sentences.join(" ");
}
