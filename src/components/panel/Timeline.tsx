"use client";

import { useMemo, useRef, useState } from "react";
import { DEPTH_STEPS, depthColor, depthEdge } from "@/lib/depth";
import { formatMag } from "@/lib/format";
import type { Quake } from "@/lib/usgs";
import { useGlobe } from "@/store";

const DAY = 24 * 3_600_000;
const DAY_LABEL = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
/** The chart's own coordinates; it stretches to the panel's width. */
const W = 1000;
const H = 100;
const BAR = 5;
/** How close (in chart units) the pointer must be to a bar to point at it. */
const REACH = 9;

/** Places a label over a point at `pct` (0–100) of the chart: centered on it, or held to the chart's edge near the ends. */
function labelAt(pct: number): React.CSSProperties {
  if (pct < 18) return { left: 0 };
  if (pct > 82) return { right: 0 };
  return { left: `${pct}%`, transform: "translateX(-50%)" };
}

/** Above this many quakes, single bars blur into a band, so the chart counts per day instead. */
const PER_DAY_ABOVE = 150;

/** Taller for bigger quakes, scaled to this answer's biggest so the chart always uses its height. */
const barHeight = (mag: number, top: number) => 8 + Math.min(1, Math.max(0, (mag - 2.5) / (top - 2.5))) * (H - 12);

/**
 * When the answer's quakes happened: one bar per quake along the time
 * window, height for magnitude, color for depth. Pointing at a bar points at
 * the same quake on the globe and in the list. The list is the keyboard way in.
 */
export function Timeline({ quakes, days }: { quakes: Quake[]; days: number }) {
  const perDay = quakes.length > PER_DAY_ABOVE && days > 1;
  return (
    <figure className="flex min-w-0 flex-col gap-2 overflow-hidden">
      <figcaption className="flex items-baseline justify-between text-xs">
        <span className="font-medium tracking-[0.14em] text-time uppercase">When</span>
        <span className="text-muted">
          {perDay ? "quakes per day · click a day to see it" : "color = depth · height = magnitude"}
        </span>
      </figcaption>
      {perDay ? <DailyBars quakes={quakes} days={days} /> : <QuakeBars quakes={quakes} days={days} />}
      <Ticks days={days} />
    </figure>
  );
}

function Ticks({ days }: { days: number }) {
  const ticks = days === 1 ? ["24 hours ago", "12 hours ago", "now"] : [`${days} days ago`, `${Math.round(days / 2)} days ago`, "today"];
  return (
    <div className="flex justify-between text-xs text-muted" aria-hidden="true">
      {ticks.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  );
}

/**
 * Busy answers: one bar per day, its height the day's count, stacked by depth.
 * Clicking a day (or tabbing to it and pressing Enter) shows just that day's
 * quakes, on the globe and in the list; again (or "Show all days") brings the rest back.
 */
function DailyBars({ quakes, days }: { quakes: Quake[]; days: number }) {
  const focusDay = useGlobe((s) => s.focusDay);
  const setFocusDay = useGlobe((s) => s.setFocusDay);
  const generatedAt = useGlobe((s) => s.generatedAt);
  const [active, setActive] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const bins = useMemo(() => {
    const now = generatedAt ?? Math.max(0, ...quakes.map((q) => q.time));
    const out = Array.from({ length: days }, (_, i) => ({
      // Day 0 is the oldest; the last bin ends now.
      end: now - (days - 1 - i) * DAY,
      counts: DEPTH_STEPS.map(() => 0),
      total: 0,
    }));
    for (const q of quakes) {
      const i = days - 1 - Math.floor((now - q.time) / DAY);
      if (i < 0 || i >= days) continue;
      const b = out[i];
      b.counts[DEPTH_STEPS.findIndex((s) => q.depthKm < s.maxKm)]++;
      b.total++;
    }
    return out;
  }, [quakes, days, generatedAt]);

  const peak = Math.max(1, ...bins.map((b) => b.total));
  const picked = focusDay ? bins.findIndex((b) => b.end === focusDay.to) : -1;
  const labels = useMemo(() => bins.map((b) => DAY_LABEL.format(b.end - DAY / 2)), [bins]);
  const dateOf = (i: number) => labels[i];
  const busiest = bins.reduce((a, b, i) => (b.total > bins[a].total ? i : a), 0);
  const shown = active ?? (picked >= 0 ? picked : busiest);
  // The one day Tab lands on; the arrow keys move between days from there.
  const [tabStop, setTabStop] = useState<number | null>(null);
  const home = tabStop ?? (picked >= 0 ? picked : busiest);
  const slot = W / days;
  const day = bins[shown];
  const date = dateOf(shown);
  const left = ((shown + 0.5) / days) * 100;

  const pick = (i: number) => {
    if (!bins[i].total) return;
    // Picking the picked day again lets go of it.
    setFocusDay(i === picked ? null : { from: bins[i].end - DAY, to: bins[i].end, label: dateOf(i) });
  };
  const move = (from: number, to: number) => {
    const i = Math.min(days - 1, Math.max(0, to));
    if (i === from) return;
    setTabStop(i);
    buttons.current[i]?.focus();
  };

  return (
    <div className="relative pt-5">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 text-xs font-semibold whitespace-nowrap text-ink"
        style={labelAt(left)}
      >
        {date} · {day.total} {day.total === 1 ? "quake" : "quakes"}
        {active === null && picked < 0 && " (busiest)"}
        {active !== null && (active === picked ? " · click for all days" : " · click to show")}
      </span>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-16 w-full" aria-hidden="true">
        {bins.map((b, i) => {
          let y = H;
          return (
            // Full strength: the day under the pointer, and the picked day (or every day when none is picked).
            <g key={i} opacity={active === i || (picked >= 0 ? i === picked : active === null) ? 1 : 0.35}>
              {b.counts.map((n, k) => {
                if (!n) return null;
                const h = (n / peak) * (H - 4);
                y -= h;
                return (
                  <rect
                    key={k}
                    x={i * slot + slot * 0.15}
                    y={y}
                    width={slot * 0.7}
                    height={h}
                    fill={`var(--color-${DEPTH_STEPS[k].token})`}
                    stroke={`var(--color-${DEPTH_STEPS[k].token}-edge)`}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
          );
        })}
        <line x1={0} y1={H - 0.75} x2={W} y2={H - 0.75} stroke="var(--color-time)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* One button per day over the chart: point or tab to a day to read it, click or Enter to show it. */}
      <div
        role="group"
        aria-label={`Earthquakes per day over the last ${days} days. Choose a day to show just its quakes.`}
        className="absolute inset-x-0 top-5 bottom-0 flex"
        onPointerLeave={() => setActive(null)}
      >
        {bins.map((b, i) => (
          <button
            key={i}
            ref={(el) => void (buttons.current[i] = el)}
            type="button"
            tabIndex={i === home ? 0 : -1}
            aria-pressed={i === picked}
            aria-disabled={!b.total}
            aria-label={`${dateOf(i)}, ${b.total} ${b.total === 1 ? "quake" : "quakes"}`}
            className={`h-full flex-1 focus-visible:-outline-offset-2 ${b.total ? "" : "cursor-default"}`}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => pick(i)}
            onKeyDown={(e) => {
              const to = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: days - 1 }[e.key];
              if (to === undefined) return;
              e.preventDefault();
              move(i, to);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Smaller answers: one bar per quake, height for magnitude, color for depth. */
function QuakeBars({ quakes, days }: { quakes: Quake[]; days: number }) {
  const hoveredId = useGlobe((s) => s.hoveredId);
  const selectedId = useGlobe((s) => s.selectedId);
  const hover = useGlobe((s) => s.hover);
  const select = useGlobe((s) => s.select);
  // "Now" is when USGS published the data, so bars line up with the feed and never creep.
  const generatedAt = useGlobe((s) => s.generatedAt);
  const svg = useRef<SVGSVGElement>(null);

  const bars = useMemo(() => {
    const now = generatedAt ?? Math.max(0, ...quakes.map((q) => q.time));
    const span = days * DAY;
    const top = Math.max(4, ...quakes.map((q) => q.mag));
    return quakes
      .map((q) => ({ q, x: Math.min(W - BAR / 2, Math.max(BAR / 2, W - ((now - q.time) / span) * W)), h: barHeight(q.mag, top) }))
      .sort((a, b) => a.q.mag - b.q.mag); // biggest drawn last, on top
  }, [quakes, days, generatedAt]);

  const biggest = bars.length ? bars[bars.length - 1] : null;
  const focusId = hoveredId ?? selectedId;

  const nearest = (clientX: number) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || !bars.length) return null;
    const x = ((clientX - box.left) / box.width) * W;
    let best: (typeof bars)[number] | null = null;
    for (const b of bars) {
      const d = Math.abs(b.x - x);
      if (d <= REACH && (!best || d < Math.abs(best.x - x) || (d === Math.abs(best.x - x) && b.q.mag > best.q.mag))) best = b;
    }
    return best;
  };

  return (
    <div className="relative pt-5">
      {biggest && (
        <span
          className="pointer-events-none absolute top-0 text-xs font-semibold whitespace-nowrap text-ink"
          style={labelAt((biggest.x / W) * 100)}
        >
          {formatMag(biggest.q.mag)} · {biggest.q.place.split(", ")[0].replace(/^.* of /, "")}
        </span>
      )}
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-16 w-full cursor-pointer"
        role="img"
        aria-label={`${quakes.length} earthquakes over the last ${days === 1 ? "24 hours" : `${days} days`}, as bars by time`}
        onPointerMove={(e) => hover(nearest(e.clientX)?.q.id ?? null)}
        onPointerLeave={() => hover(null)}
        onClick={(e) => {
          const b = nearest(e.clientX);
          if (b) select(b.q.id);
        }}
      >
        {bars.map(({ q, x, h }) => (
          <rect
            key={q.id}
            x={x - BAR / 2}
            y={H - h}
            width={BAR}
            height={h}
            rx={1.2}
            fill={q.id === focusId ? "var(--color-ink)" : depthColor(q.depthKm)}
            stroke={q.id === focusId ? "var(--color-ink)" : depthEdge(q.depthKm)}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line x1={0} y1={H - 0.75} x2={W} y2={H - 0.75} stroke="var(--color-time)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
