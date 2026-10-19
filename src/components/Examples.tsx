"use client";

import { PRESETS } from "@/lib/presets";
import { useGlobe } from "@/store";

/**
 * "Try: …" example questions, as text links rather than pills: they run a
 * question, so they shouldn't look like the filter tags that edit one.
 * The one on show is underlined in the data color.
 */
export function Examples({ label = "Try" }: { label?: string }) {
  const ask = useGlobe((s) => s.ask);
  const presetId = useGlobe((s) => s.presetId);
  const disabled = useGlobe((s) => s.status !== "ready" || s.asking);

  return (
    // Phones: stacked, one link per line, so none wraps onto a half-empty second line.
    <div className="flex flex-wrap items-center gap-x-5 max-md:flex-col max-md:items-start">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={disabled}
          aria-pressed={presetId === preset.id}
          onClick={() => ask(preset.query, { question: preset.label, presetId: preset.id })}
          className="flex min-h-9 shrink-0 items-center text-sm whitespace-nowrap text-ink underline decoration-chip-line underline-offset-[5px] transition-colors hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:font-medium aria-pressed:decoration-place aria-pressed:decoration-2"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
