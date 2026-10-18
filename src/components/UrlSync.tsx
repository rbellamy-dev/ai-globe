"use client";

import { useEffect } from "react";
import { fromSearch, toSearch, type SharedAnswer } from "@/lib/urlState";
import { useGlobe } from "@/store";

type State = ReturnType<typeof useGlobe.getState>;

/** The answer on screen, in the shape a link stores (null for the default view). */
const answerOf = (s: State): SharedAnswer | null =>
  s.question && s.source && !s.notice
    ? { query: s.query, question: s.question, presetId: s.presetId, source: s.source, edited: s.edited }
    : null;

/**
 * Keeps the address bar in step with the answer, so every answer has a link
 * and Back/Forward step through answers (which also undoes a removed filter).
 * Also the page's two shortcuts: "/" to ask, Esc to let go of a quake.
 */
export function UrlSync() {
  useEffect(() => {
    // Set while applying a URL, so the change it causes doesn't push a new history entry.
    let applying = false;
    const apply = (search: string) => {
      applying = true;
      useGlobe.getState().restore(fromSearch(search));
      applying = false;
    };

    // A shared link opens on its answer once the data is in.
    const opened = location.search;
    const onReady = (s: State, prev: State) => {
      if (s.status === "ready" && prev.status !== "ready" && opened) apply(opened);
    };

    const onAnswer = (s: State, prev: State) => {
      if (applying || s.status !== "ready") return;
      if (s.query === prev.query && s.question === prev.question && s.notice === prev.notice) return;
      // Wait for the AI's answer; and a question it couldn't answer keeps the last answer's link.
      if (s.asking || s.notice) return;
      const search = toSearch(answerOf(s));
      if (search !== location.search) history.pushState(null, "", search || location.pathname);
    };

    const unsubscribe = useGlobe.subscribe((s, prev) => {
      onReady(s, prev);
      onAnswer(s, prev);
    });
    const onPop = () => apply(location.search);
    window.addEventListener("popstate", onPop);

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, [contenteditable]");
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        document.getElementById("question")?.focus();
      } else if (e.key === "Escape") {
        const { selectedId, select } = useGlobe.getState();
        if (selectedId) select(null, { fly: false });
        else if (typing) target.blur();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      unsubscribe();
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
