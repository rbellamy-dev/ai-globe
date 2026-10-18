"use client";

import { useState } from "react";
import { headline, noResultsText } from "@/lib/filter";
import { inFocus, useGlobe } from "@/store";
import { Examples } from "../Examples";
import { AskGuide } from "./AskGuide";
import { FilterChips } from "./FilterChips";
import { QueryCode } from "./QueryCode";
import { ResultList } from "./ResultList";
import { Timeline } from "./Timeline";

/** The list is a taste of the answer; the globe and the timeline show all of it. */
const TOP = 5;

/** Copies the address bar, which always holds the answer on screen. */
function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked: the address bar still has the link.
        }
      }}
      className="hit text-sm text-muted underline decoration-chip-line underline-offset-[5px] transition-colors hover:text-ink hover:decoration-ink"
    >
      <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
    </button>
  );
}

/** The answer to the current question, or the month's quakes before anyone asks. */
export function AnswerPanel() {
  const status = useGlobe((s) => s.status);
  const load = useGlobe((s) => s.load);
  const query = useGlobe((s) => s.query);
  const question = useGlobe((s) => s.question);
  const edited = useGlobe((s) => s.edited);
  const source = useGlobe((s) => s.source);
  const asking = useGlobe((s) => s.asking);
  const notice = useGlobe((s) => s.notice);
  const suggestion = useGlobe((s) => s.suggestion);
  const results = useGlobe((s) => s.results);
  const total = useGlobe((s) => s.total);
  const reset = useGlobe((s) => s.reset);
  const ask = useGlobe((s) => s.ask);
  const askQuestion = useGlobe((s) => s.askQuestion);
  const failed = useGlobe((s) => s.failed);
  const focusDay = useGlobe((s) => s.focusDay);
  const globeOff = useGlobe((s) => s.globeOff);
  const setFocusDay = useGlobe((s) => s.setFocusDay);
  // A day picked on the timeline narrows the list (and the globe) to that day.
  const listed = inFocus(results, focusDay);

  const ready = status === "ready";
  // While the AI works, or when it couldn't answer, the old answer steps out of the panel.
  const answered = ready && !asking && !notice;
  // Only a typed (or edited) question needs repeating back; an untouched example's
  // name is already underlined below the globe.
  const typed = question !== null && (source === "ai" || edited || asking || notice !== null);
  const head = headline(query, { shown: results, total });
  const more = listed.length - TOP;
  // "M 2.5+" never splits across lines.
  const keepTogether = (text: string) => text.replace(/M (\d)/g, "M\u00a0$1");
  // What a screen reader hears when the answer changes: just the sentence, not the whole panel.
  const sentence =
    `${head.count.toLocaleString("en-US")} ${head.lead}` +
    (head.sized ? ` ${head.size}` : "") +
    (head.depth ? ` ${head.depth}` : "") +
    (head.place ? ` within ${head.place}` : "") +
    (head.period ? `${head.place ? "," : ""} in ${head.period}` : "") +
    (head.latest ? `, latest ${head.latest}` : "") +
    "." +
    (focusDay ? ` Showing ${focusDay.label}: ${listed.length} ${listed.length === 1 ? "quake" : "quakes"}.` : "");
  const spoken = asking ? "Reading your question." : notice ? notice : answered ? sentence : "";

  const actions = question && !asking && (
    <div className="flex shrink-0 items-center gap-4">
      {answered && <CopyLink />}
      <button type="button" onClick={reset} className="hit text-sm text-muted underline decoration-chip-line underline-offset-[5px] transition-colors hover:text-ink hover:decoration-ink">
        Clear
      </button>
    </div>
  );

  return (
    <aside
      aria-label="Answer"
      className="flex min-w-0 flex-col gap-5"
    >
      <p role="status" className="sr-only">
        {spoken}
      </p>
      {/* Typed questions head the panel with "You asked"; everything else gets a heading to jump to. */}
      {!typed && <h2 className="sr-only">Answer</h2>}
      {typed ? (
        // Typed questions: what you asked, with the actions beside it, and right under it
        // how the AI read it. Up here it's seen without scrolling, next to the question it explains.
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            {/* Long questions get two lines, then the rest on hover. */}
            <h2 className="line-clamp-2 min-w-0 text-base break-words" title={question ?? undefined}>
              <span className="text-muted">{edited ? "You asked (edited): " : "You asked: "}</span>
              <span className="font-medium">{question}</span>
            </h2>
            {actions}
          </div>
          {answered && source === "ai" && (
            <details className="group text-sm">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-chip-line bg-surface px-2.5 py-1 text-ink transition-colors hover:border-ink/40 [&::-webkit-details-marker]:hidden">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
                </svg>
                See the query the AI wrote
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted transition-transform group-open:rotate-180">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-3">
                <QueryCode query={query} source={source} />
              </div>
            </details>
          )}
        </div>
      ) : null}

      {asking && (
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <p className="text-sm text-muted">Turning your question into a query…</p>
          <div className="flex flex-col gap-2.5" aria-hidden="true">
            <div className="h-6 w-4/5 animate-pulse rounded-md bg-chip" />
            <div className="h-5 animate-pulse rounded bg-chip" />
            <div className="h-5 w-3/5 animate-pulse rounded bg-chip" />
          </div>
        </div>
      )}

      {notice && !asking && (
        <div className="flex flex-col gap-4 border-t border-line pt-5">
          <p className="text-base leading-relaxed text-ink">{notice}</p>
          {failed && question && (
            <button
              type="button"
              onClick={() => void askQuestion(question)}
              className="self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          )}
          {suggestion && (
            <button
              type="button"
              onClick={() => ask(suggestion, { question: suggestion.title })}
              className="flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-left text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              Show {suggestion.title.charAt(0).toLowerCase() + suggestion.title.slice(1)}
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
          <Examples label={suggestion ? "Or try" : "Try"} />
        </div>
      )}

      {/* The answer: a big count, and beside it exactly what was counted. The place
          and the time take their colors, matching the ring on the globe and the timeline. */}
      {answered && (
        <div className={`flex flex-col gap-4 ${typed ? "border-t border-line pt-4" : ""}`}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="shrink-0 text-6xl leading-none font-semibold tracking-tight text-ink tabular-nums lg:text-[clamp(4.5rem,7vw,7rem)]">
              {head.count.toLocaleString("en-US")}
            </p>
            <p className="min-w-[min(14rem,100%)] flex-1 text-lg leading-snug text-balance text-ink lg:text-2xl">
              {head.lead}
              {head.sized && ` ${keepTogether(head.size)}`}
              {head.depth && ` ${head.depth}`}
              {head.place && (
                <>
                  {" within "}
                  <strong className="font-semibold text-place">{head.place}</strong>
                </>
              )}
              {head.period && (
                <>
                  {head.place ? ", in " : " in "}
                  <strong className="font-semibold text-time">{head.period}</strong>
                </>
              )}
              {head.latest && (
                <>
                  {", latest "}
                  <strong className="font-semibold text-time">{head.latest}</strong>
                </>
              )}
              .
            </p>
          </div>
          {/* Untyped answers have no "You asked" row, so their actions sit beside the filters. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips query={query} />
            {!typed && actions}
          </div>
        </div>
      )}

      {answered && results.length > 0 && <Timeline quakes={results} days={query.days} />}

      {answered && results.length > 0 && (
        <div className="flex flex-col gap-1">
          {focusDay ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Showing <span className="font-medium text-time">{focusDay.label}</span> · {listed.length}{" "}
                {listed.length === 1 ? "quake" : "quakes"}, {{ recent: "newest", smallest: "smallest", magnitude: "biggest" }[query.sort]} first
              </p>
              <button
                type="button"
                onClick={() => setFocusDay(null)}
                className="hit text-sm text-muted underline decoration-chip-line underline-offset-[5px] transition-colors hover:text-ink hover:decoration-ink"
              >
                Show all days
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">{{ recent: "Newest first", smallest: "Smallest first", magnitude: "Biggest first" }[query.sort]}</p>
          )}
          <ResultList quakes={listed.slice(0, TOP)} />
          {more > 0 && (
            <p className="text-xs text-muted">+ {more.toLocaleString("en-US")} more{globeOff ? "" : ", all on the globe"}</p>
          )}
        </div>
      )}

      {answered && results.length === 0 && (
        <p className="text-sm leading-relaxed text-muted">{noResultsText(query)}</p>
      )}

      {(status === "idle" || status === "loading") && (
        <div className="flex flex-col gap-3" aria-hidden="true">
          <div className="h-7 w-4/5 animate-pulse rounded-md bg-chip" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-chip" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 text-sm text-muted">
          <p>The USGS earthquake feed didn&apos;t load.</p>
          <button
            type="button"
            onClick={() => {
              useGlobe.setState({ status: "idle" });
              void load();
            }}
            className="rounded-full border border-chip-line bg-chip px-4 py-2 text-ink"
          >
            Try again
          </button>
        </div>
      )}


      {/* Phones: the examples live here, where the first answer is, not in the pinned bar. */}
      {ready && !question && (
        <div className="md:hidden">
          <Examples />
        </div>
      )}

      {ready && (!question || notice) && <AskGuide />}
    </aside>
  );
}
