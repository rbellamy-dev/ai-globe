const KINDS = [
  { kind: "Size", examples: "“strong quakes” (M6+), “M5 and up”" },
  { kind: "Depth", examples: "“shallow”, “deep quakes”" },
  { kind: "Place", examples: "“near Chile”, “around Alaska”" },
  { kind: "Time", examples: "“today”, “this week”, “the latest one”" },
];

/** What a question can ask about, opened on demand: the four things the data can filter by. */
export function AskGuide() {
  return (
    <details className="group border-t border-line pt-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-ink [&::-webkit-details-marker]:hidden">
        What can I ask?
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <dl className="mt-3 grid grid-cols-[4rem_1fr] gap-x-3 gap-y-1.5">
        {KINDS.map(({ kind, examples }) => (
          <div key={kind} className="contents">
            <dt className="text-muted">{kind}</dt>
            <dd className="text-ink">{examples}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Mix them freely: “strong shallow quakes near Japan this week”. The data covers magnitude 2.5 and up, for the
        last 30 days.
      </p>
    </details>
  );
}
