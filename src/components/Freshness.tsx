"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";
import { useGlobe } from "@/store";

/** "Live · USGS · updated 4m ago", kept true by re-rendering once a minute. */
export function Freshness() {
  const generatedAt = useGlobe((s) => s.generatedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!generatedAt) return null;
  return (
    // One line at any normal size; with very large text it breaks between the parts, not inside them.
    <p className="max-w-1/2 shrink-0 text-right text-sm text-muted max-md:max-w-none max-md:text-center">
      Live{" "}
      <span className="whitespace-nowrap">
        ·{" "}
        <a
          href="https://earthquake.usgs.gov/earthquakes/map/"
          target="_blank"
          rel="noreferrer"
          className="hit underline decoration-chip-line underline-offset-[5px] hover:text-ink hover:decoration-ink"
        >
          USGS
        </a>
      </span>{" "}
      <span className="whitespace-nowrap">· {timeAgo(generatedAt, now)}</span>
    </p>
  );
}
