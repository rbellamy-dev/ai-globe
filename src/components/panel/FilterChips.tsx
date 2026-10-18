"use client";

import { DEFAULT_QUERY, type Query } from "@/lib/querySchema";
import { useGlobe, type FilterKey } from "@/store";

type Tone = "place" | "time" | "plain";
interface Chip {
  key: FilterKey;
  label: string;
  tone: Tone;
}

/** The query's filters in plain words, one tag each. */
function chipsFor(query: Query): Chip[] {
  const chips: Chip[] = [];
  const add = (key: FilterKey, label: string, tone: Tone = "plain") => chips.push({ key, label, tone });
  if (query.region) add("region", `Near ${query.region.name}`, "place");
  // The 30-day window is all the data there is, not a filter you set: only a narrower window gets a chip.
  if (query.days !== DEFAULT_QUERY.days) add("days", query.days === 1 ? "Last 24 hours" : `Last ${query.days} days`, "time");
  if (query.minMagnitude != null) add("minMagnitude", `M ${query.minMagnitude.toFixed(1)} and up`);
  if (query.maxMagnitude != null) add("maxMagnitude", `Up to M ${query.maxMagnitude.toFixed(1)}`);
  if (query.minDepthKm != null) add("minDepthKm", `Over ${query.minDepthKm} km deep`);
  if (query.maxDepthKm != null) add("maxDepthKm", `Under ${query.maxDepthKm} km deep`);
  if (query.limit != null) add("limit", `Top ${query.limit}`);
  return chips;
}

/** Place and time take the same colors as in the sentence above; the rest stay neutral. */
const TONE: Record<Tone, string> = {
  place: "border-place/45 bg-place-soft text-place hover:border-place",
  time: "border-time/45 bg-time-soft text-time hover:border-time",
  plain: "border-chip-line bg-surface text-ink hover:border-ink/40",
};

/** The answer's filters as tags. Removing one re-runs the query without it, no AI involved. */
export function FilterChips({ query }: { query: Query }) {
  const removeFilter = useGlobe((s) => s.removeFilter);
  const chips = chipsFor(query);
  if (!chips.length) return null;

  return (
    <ul className="flex flex-wrap gap-1.5 pointer-coarse:gap-2" aria-label="Filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => removeFilter(chip.key)}
            aria-label={`Remove filter: ${chip.label}`}
            className={`flex items-center gap-1.5 rounded-md border py-1 pr-1.5 pl-2.5 pointer-coarse:min-h-11 text-sm font-medium transition-colors ${TONE[chip.tone]}`}
          >
            {chip.label}
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-70">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
