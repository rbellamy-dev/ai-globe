"use client";

import { useState } from "react";
import { MAX_QUESTION_LENGTH } from "@/lib/askPrompt";
import { useGlobe } from "@/store";
import { Examples } from "./Examples";

/** Example questions (ready-made queries, instant) and the question box (the AI, about a second). */
export function QuestionBar() {
  const askQuestion = useGlobe((s) => s.askQuestion);
  const asking = useGlobe((s) => s.asking);
  const ready = useGlobe((s) => s.status === "ready");
  const left = useGlobe((s) => s.questionsLeft);
  const [text, setText] = useState("");
  // The allowance only matters once it's nearly gone; before that it's noise.
  const lowOnQuestions = left < 5;

  const question = text.trim();
  const canAsk = ready && !asking && question.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAsk) return;
    await askQuestion(question);
    // Clear the box once it's answered; a failed question stays put to edit and retry.
    if (!useGlobe.getState().notice) setText("");
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
      {/* Phones pin only the question box; their examples sit in the answer instead. */}
      <div className="hidden md:block">
        <Examples />
      </div>
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-full border border-chip-line bg-chip py-1.5 pr-1.5 pl-5 transition-colors focus-within:border-ink/40 md:py-2 md:pr-2 md:pl-6"
      >
        <label htmlFor="question" className="sr-only">
          Ask about earthquakes
        </label>
        <input
          id="question"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={!ready}
          readOnly={asking}
          autoComplete="off"
          placeholder="Ask about earthquakes…"
          className="peer min-w-0 flex-1 bg-transparent py-2.5 text-base md:py-2 text-ink placeholder:text-muted focus:outline-none"
        />
        {lowOnQuestions && (
          <span className="shrink-0 text-xs text-muted tabular-nums" aria-live="polite">
            {left === 0 ? "No questions left" : `${left} ${left === 1 ? "question" : "questions"} left`}
          </span>
        )}
        {/* The "/" shortcut, shown where it applies: a keyboard, an empty unfocused box. */}
        {!text && !lowOnQuestions && (
          <kbd
            aria-hidden="true"
            className="hidden rounded border border-chip-line px-1.5 font-mono text-xs text-muted peer-focus:invisible md:block"
          >
            /
          </kbd>
        )}
        <button
          type="submit"
          disabled={!canAsk}
          aria-label={asking ? "Asking…" : "Ask"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {asking ? (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
