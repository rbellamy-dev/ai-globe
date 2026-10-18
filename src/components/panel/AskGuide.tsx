"use client";

import { useEffect, useRef } from "react";

/** The things the data can filter by, each with phrases that drop straight into the question box. */
const KINDS = [
  { kind: "Size", phrases: ["strong quakes", "M5 and up"] },
  { kind: "Depth", phrases: ["shallow quakes", "deep quakes"] },
  { kind: "Place", phrases: ["Hawaii", "near Chile", "around Alaska"] },
  { kind: "Time", phrases: ["today", "this week"] },
  { kind: "Rank", phrases: ["the 5 biggest", "the smallest", "the latest"] },
];
const MIXED = "strong shallow quakes near Japan this week";

export const GUIDE_ID = "ask-guide";

const QuestionMark = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.5 9.25a2.5 2.5 0 1 1 3.4 2.33c-.55.22-.9.75-.9 1.34v.58" />
    <path d="M12 17h.01" />
  </svg>
);

/**
 * Opens the guide. `compact` is the phone version: just the mark, inside the
 * question box, so the pinned bar doesn't grow a row for it.
 */
export function AskGuideToggle({ open, onToggle, compact = false }: { open: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={GUIDE_ID}
      aria-label={compact ? "What can I ask?" : undefined}
      className={
        compact
          ? `grid size-11 shrink-0 place-items-center rounded-full transition-colors ${open ? "text-ink" : "text-muted"} hover:text-ink`
          : `flex min-h-9 shrink-0 items-center gap-1.5 text-sm transition-colors ${open ? "text-ink" : "text-muted"} hover:text-ink`
      }
    >
      <QuestionMark />
      {!compact && "What can I ask?"}
    </button>
  );
}

/**
 * What a question can ask about. Every phrase is a button that puts it in the
 * question box to send or build on. Opens above the box, so typing never moves.
 */
export function AskGuidePanel({ onPick, takeFocus }: { onPick: (phrase: string) => void; takeFocus: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  // Opened by hand, focus moves to the first phrase (the guide sits above its toggle in reading order).
  // Opened by a refusal, focus stays in the question box.
  useEffect(() => {
    if (takeFocus) panel.current?.querySelector("button")?.focus();
  }, [takeFocus]);

  const phrase = (text: string) => (
    <button
      key={text}
      type="button"
      onClick={() => onPick(text)}
      className="hit text-ink underline decoration-chip-line underline-offset-[5px] transition-colors hover:decoration-ink"
    >
      {text}
    </button>
  );

  return (
    <div id={GUIDE_ID} ref={panel} className="mb-1 border-b border-line pb-3 text-sm">
      <dl className="grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-2">
        {KINDS.map(({ kind, phrases }) => (
          <div key={kind} className="contents">
            <dt className="text-muted">{kind}</dt>
            <dd className="flex flex-wrap gap-x-4 gap-y-1">{phrases.map(phrase)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-muted">Mix them: {phrase(MIXED)}</p>
      <p className="mt-1.5 text-xs text-muted">Covers magnitude 2.5 and up, from the last 30 days.</p>
    </div>
  );
}
