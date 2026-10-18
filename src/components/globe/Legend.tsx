"use client";

import { useSyncExternalStore } from "react";
import { DEPTH_STEPS } from "@/lib/depth";

const KEY = "ask-the-planet:legend-open";
const CHANGE = "legend-open-change";

/** Room enough (the wide layout, and some height) that the open key sits under the globe rather than over it. */
const WIDE = "(min-width: 1024px) and (min-height: 700px)";

/** Whether the key is open: the visitor's choice if they made one, else open on big screens, folded on phones, tablets and short windows. */
const readOpen = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) return saved === "1";
  } catch {
    // storage blocked: fall through to the screen-size default
  }
  return window.matchMedia(WIDE).matches;
};
const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
};
const saveOpen = (open: boolean) => {
  try {
    localStorage.setItem(KEY, open ? "1" : "0");
  } catch {
    // Storage blocked: the choice can't be kept.
  }
  window.dispatchEvent(new Event(CHANGE));
};

const Chevron = ({ up }: { up: boolean }) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

/**
 * What a quake's color means (its depth), and what its size means. Sits over
 * the globe's corner; folds down to just its four colors, and remembers.
 */
export function Legend() {
  const open = useSyncExternalStore(subscribe, readOpen, () => true);
  const toggle = () => saveOpen(!open);

  const sizes = [
    { m: "M3", px: 6, note: "felt nearby" },
    { m: "M5", px: 10, note: "felt widely" },
    { m: "M7", px: 15, note: "major" },
  ];
  const title = "font-medium tracking-[0.14em] uppercase";

  // Folded: one button, the four colors standing in for the key, the arrow at its right end.
  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-expanded={false}
        aria-label="Show the depth and size key"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface/95 px-2.5 py-2 text-xs text-muted transition-colors hover:text-ink md:rounded-xl md:px-4"
      >
        <span className="flex gap-1">
          {DEPTH_STEPS.map((step) => (
            <span key={step.token} aria-hidden="true" className="size-2.5 rounded-full border forced-color-adjust-none" style={{ background: `var(--color-${step.token})`, borderColor: `var(--color-${step.token}-edge)` }} />
          ))}
        </span>
        <span className={title}>Depth</span>
        <span className="ml-2">
          <Chevron up />
        </span>
      </button>
    );
  }

  const foldButton = (className: string) => (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={true}
      aria-label="Hide the depth and size key"
      className={`-my-1 -mr-1.5 grid size-6 place-items-center rounded-md transition-colors hover:bg-chip hover:text-ink ${className}`}
    >
      <Chevron up={false} />
    </button>
  );

  // Open: two matching groups. Every item is its marker on top, then a label and a plain-words note.
  // Titles sit left over their group; the fold arrow ends the title row on the right.
  return (
    // Between 1024 and 1280 the globe's column is narrow: a little less air keeps the key on one row.
    <div className="flex items-stretch gap-5 rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs text-muted md:rounded-xl md:px-4 md:py-3 lg:max-xl:gap-4 lg:max-xl:px-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <p className={title}>Depth</p>
          {foldButton("md:hidden")}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 lg:max-xl:gap-x-3" aria-label="Quake color shows depth">
          {DEPTH_STEPS.map((step) => (
            <li key={step.label} className="flex flex-col items-start gap-1">
              <span className="flex h-4 items-center" aria-hidden="true">
                <span className="size-2.5 rounded-full border forced-color-adjust-none" style={{ background: `var(--color-${step.token})`, borderColor: `var(--color-${step.token}-edge)` }} />
              </span>
              <span className="whitespace-nowrap text-ink">{step.label}</span>
              <span className="whitespace-nowrap">{step.note}</span>
            </li>
          ))}
        </ul>
      </div>
      <span aria-hidden="true" className="hidden w-px bg-line md:block" />
      <div className="hidden flex-col gap-2 md:flex">
        <div className="flex items-center justify-between gap-4">
          <p className={title}>Size</p>
          {foldButton("")}
        </div>
        <ul className="flex gap-4 lg:max-xl:gap-3" aria-label="Dot size shows magnitude">
          {sizes.map(({ m, px, note }) => (
            <li key={m} className="flex flex-col items-start gap-1">
              <span className="flex h-4 items-center" aria-hidden="true">
                <span className="rounded-full border border-muted" style={{ width: px, height: px }} />
              </span>
              <span className="text-ink">{m}</span>
              <span className="whitespace-nowrap">{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
