"use client";

import { depthColor, depthEdge } from "@/lib/depth";
import { formatMag, timeAgo } from "@/lib/format";
import type { Quake } from "@/lib/usgs";
import { useGlobe } from "@/store";

/**
 * The quakes as a list: the keyboard- and screen-reader-friendly way into
 * the globe. Pointing at a row labels its quake; choosing one flies there.
 */
export function ResultList({ quakes }: { quakes: Quake[] }) {
  const selectedId = useGlobe((s) => s.selectedId);
  const select = useGlobe((s) => s.select);
  const hover = useGlobe((s) => s.hover);
  // Pointed at on the globe or the timeline: the row lights up too.
  const hoveredId = useGlobe((s) => s.hoveredId);

  return (
    <ol className="@container -mx-3 flex flex-col">
      {quakes.map((q) => {
        const selected = q.id === selectedId;
        return (
          <li key={q.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => select(selected ? null : q.id)}
              onPointerEnter={() => hover(q.id)}
              onPointerLeave={() => hover(null)}
              onFocus={() => hover(q.id)}
              onBlur={() => hover(null)}
              className={`grid w-full grid-cols-[0.75rem_3.75rem_minmax(0,1fr)_auto] sm:grid-cols-[0.75rem_3.75rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg @max-[20rem]:grid-cols-[0.75rem_3.75rem_minmax(0,1fr)] @max-[20rem]:gap-y-0.5 px-3 py-2.5 text-left transition-colors hover:bg-chip focus-visible:-outline-offset-2 ${
                selected || q.id === hoveredId ? "bg-chip" : ""
              }`}
            >
              <span
                aria-hidden="true"
                // Data, not decoration: keeps its colors in high-contrast mode.
                className="size-3 rounded-full border-2 forced-color-adjust-none"
                style={{ borderColor: depthEdge(q.depthKm), background: depthColor(q.depthKm) }}
              />
              <span className="font-semibold text-ink tabular-nums">{formatMag(q.mag)}</span>
              <span className="truncate text-sm text-ink">{q.place}</span>
              {/* Phones: the dot's color already says the depth, so the place gets the room. */}
              <span className="hidden text-sm text-muted tabular-nums sm:block">{Math.round(q.depthKm)} km</span>
              {/* Very narrow (or very large text): the time moves under the place instead of pushing the row wider. */}
              <span className="w-14 text-right text-sm text-muted tabular-nums @max-[20rem]:col-start-3 @max-[20rem]:w-auto @max-[20rem]:text-left">
                {timeAgo(q.time)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
