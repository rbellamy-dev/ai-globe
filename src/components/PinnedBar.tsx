"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Marks the end of the answer, so the bar can tell whether anything is still hidden under it. */
export const ANSWER_END_ID = "answer-end";

/**
 * The question bar, pinned to the bottom of the screen. While part of the
 * answer is scrolled under it, the answer fades into it and it gets a soft
 * top edge: a sign there's more below. At the end of the page both go away.
 */
export function PinnedBar({ className, children }: { className: string; children: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null);
  const [covering, setCovering] = useState(false);

  useEffect(() => {
    const el = bar.current;
    const end = document.getElementById(ANSWER_END_ID);
    if (!el || !end) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      setCovering(end.getBoundingClientRect().top > el.getBoundingClientRect().top + 1);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // A new answer changes the panel's height without any scrolling.
    const resized = new ResizeObserver(schedule);
    if (end.parentElement) resized.observe(end.parentElement);
    resized.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resized.disconnect();
    };
  }, []);

  return (
    <div
      ref={bar}
      className={`${className} border-t transition-[border-color,box-shadow] duration-300 ${
        covering
          ? "border-line shadow-[0_-10px_24px_-14px_color-mix(in_oklab,var(--color-ink)_30%,transparent)]"
          : "border-transparent"
      }`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-full h-10 bg-linear-to-t from-bg to-transparent transition-opacity duration-300 ${
          covering ? "opacity-100" : "opacity-0"
        }`}
      />
      {children}
    </div>
  );
}
