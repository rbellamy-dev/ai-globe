import { create } from "zustand";
import { applyQuery } from "@/lib/filter";
import { bestView } from "@/lib/geo";
import { questionsLeft, QUESTIONS_PER_VISIT, countQuestion } from "@/lib/questionAllowance";
import { DEFAULT_QUERY, type Query } from "@/lib/querySchema";
import type { SharedAnswer } from "@/lib/urlState";
import type { Quake } from "@/lib/usgs";

type Status = "idle" | "loading" | "ready" | "error";

/** Where the camera should fly. `key` changes on every request, so flying to the same spot twice still moves. */
export interface FlyTarget {
  lat: number;
  lon: number;
  /** Camera distance from the globe's center (radius 1). Omitted: keep the zoom, but come in no further than a close-up. */
  distance?: number;
  key: number;
}

/** Filters a chip can remove. */
export type FilterKey =
  | "minMagnitude"
  | "maxMagnitude"
  | "minDepthKm"
  | "maxDepthKm"
  | "region"
  | "days"
  | "limit";

/** A day on the timeline: its time range, and how to name it. */
export interface FocusDay {
  from: number;
  to: number;
  label: string;
}

/** The answer's quakes that fall on the picked day, or all of them. */
export const inFocus = (results: Quake[], day: FocusDay | null) =>
  day ? results.filter((q) => q.time >= day.from && q.time < day.to) : results;

/** Camera distance for the whole-world view. */
export const WORLD_DISTANCE = 4.1;

interface GlobeState {
  quakes: Quake[];
  status: Status;
  /** When USGS published the data on screen (epoch ms). */
  generatedAt: number | null;
  query: Query;
  /** What was asked: a chip's label or a typed question. Null for the default view. */
  question: string | null;
  presetId: string | null;
  /** True once a filter has been removed from the asked question's answer. */
  edited: boolean;
  /** Where the current query came from: an example chip or the AI. */
  source: "preset" | "ai" | null;
  /** A typed question is with the AI. */
  asking: boolean;
  /** Why a typed question has no answer (unsupported, failed, or over the limit). */
  notice: string | null;
  /** The AI's note when it couldn't answer the question as asked but named a place, so its quakes show anyway. */
  aside: string | null;
  /** The "What can I ask?" guide by the question box: opened by hand, or by a question the map can't answer. */
  guideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
  /** With an unsupported question: a related query the data can answer, offered as a button. */
  suggestion: Query | null;
  /** The last typed question failed (network or server), so it can be retried as is. */
  failed: boolean;
  /** Typed questions left this visit. */
  questionsLeft: number;
  results: Quake[];
  total: number;
  selectedId: string | null;
  hoveredId: string | null;
  flyTarget: FlyTarget | null;
  /** The globe can't draw (no WebGL, or the GPU was taken back): the list is all there is. */
  globeOff: boolean;
  /** One day picked on the timeline: only its quakes show on the globe and in the list. */
  focusDay: FocusDay | null;
  /** Picks a day (or clears with null), and turns the globe to face its quakes. */
  setFocusDay: (day: FocusDay | null) => void;
  load: () => Promise<void>;
  /** Shows a query's answer: filters the globe and flies to it. */
  ask: (query: Query, from: { question: string; presetId?: string }) => void;
  /** Sends a typed question to the AI, then shows its answer (or why there isn't one). */
  askQuestion: (question: string) => Promise<void>;
  removeFilter: (key: FilterKey) => void;
  reset: () => void;
  /** Shows an answer read back from a link (or the default view for null). */
  restore: (answer: SharedAnswer | null) => void;
  /** Selects a quake (or clears with null) and, by default, flies to it. */
  select: (id: string | null, options?: { fly?: boolean }) => void;
  hover: (id: string | null) => void;
}

let flyKey = 0;

/** No filters left: the same answer as the default view. */
const isUnfiltered = (q: Query) =>
  q.minMagnitude == null &&
  q.maxMagnitude == null &&
  q.minDepthKm == null &&
  q.maxDepthKm == null &&
  q.region == null &&
  q.limit == null &&
  q.days === DEFAULT_QUERY.days &&
  q.sort === DEFAULT_QUERY.sort;

/**
 * A region's center, close enough to fill the view. Otherwise the side of
 * the globe that shows the most of the answer, from far enough to see the world.
 */
function cameraFor(query: Query, results: Quake[]): FlyTarget | null {
  if (query.region) {
    const { lat, lon, radiusKm } = query.region;
    return { lat, lon, distance: Math.min(WORLD_DISTANCE, 3.5 + radiusKm / 2500), key: ++flyKey };
  }
  const view = bestView(results);
  return view ? { ...view, distance: WORLD_DISTANCE, key: ++flyKey } : null;
}

export const useGlobe = create<GlobeState>((set, get) => {
  /** Applies a query: new results, nothing selected, and optionally a flight to the answer. */
  const show = (query: Query, fly: boolean, extra: Partial<GlobeState> = {}) => {
    const { shown, total } = applyQuery(get().quakes, query);
    set({
      query,
      results: shown,
      focusDay: null,
      total,
      selectedId: null,
      hoveredId: null,
      flyTarget: fly ? (cameraFor(query, shown) ?? get().flyTarget) : get().flyTarget,
      ...extra,
    });
  };

  return {
    quakes: [],
    status: "idle",
    generatedAt: null,
    query: DEFAULT_QUERY,
    question: null,
    presetId: null,
    edited: false,
    source: null,
    asking: false,
    notice: null,
    aside: null,
    guideOpen: false,
    suggestion: null,
    failed: false,
    questionsLeft: QUESTIONS_PER_VISIT,
    results: [],
    total: 0,
    selectedId: null,
    hoveredId: null,
    flyTarget: null,
    globeOff: false,
    focusDay: null,

    setFocusDay(day) {
      const view = bestView(inFocus(get().results, day));
      set({
        focusDay: day,
        selectedId: null,
        flyTarget: view ? { ...view, distance: WORLD_DISTANCE, key: ++flyKey } : get().flyTarget,
      });
    },

    async load() {
      if (get().status === "loading" || get().status === "ready") return;
      set({ status: "loading" });
      try {
        const res = await fetch("/api/quakes");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { quakes: Quake[]; generatedAt?: number };
        set({ quakes: data.quakes, generatedAt: data.generatedAt ?? null, status: "ready", questionsLeft: questionsLeft() });
        show(get().query, false);
      } catch (error) {
        console.error("Failed to load earthquakes:", error);
        set({ status: "error" });
      }
    },

    setGuideOpen(open) {
      set({ guideOpen: open });
    },

    ask(query, { question, presetId }) {
      show(query, true, {
        guideOpen: false,
        question,
        presetId: presetId ?? null,
        edited: false,
        source: presetId ? "preset" : "ai",
        notice: null,
        aside: null,
        suggestion: null,
        failed: false,
      });
    },

    async askQuestion(question) {
      if (get().asking) return;
      if (questionsLeft() === 0) {
        set({
          question,
          presetId: null,
          notice: `That's the ${QUESTIONS_PER_VISIT}-question limit for this visit. The examples below the globe still work.`,
        });
        return;
      }
      // Show the question straight away; the globe keeps the last answer until the new one lands.
      set({ question, presetId: null, asking: true, notice: null, aside: null, suggestion: null, failed: false, guideOpen: false });
      countQuestion();
      set({ questionsLeft: questionsLeft() });
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        // A platform error page isn't JSON; fall through to the general message.
        const data = (await res.json().catch(() => ({}))) as { query?: Query; error?: string };
        if (!res.ok || !data.query) throw new Error(data.error ?? `HTTP ${res.status}`);
        const { unsupported, ...rest } = data.query;
        if (unsupported && rest.region) {
          // A place was named: show its earthquakes straight away, with the AI's note on what it couldn't do.
          set({ asking: false });
          get().ask({ ...rest, unsupported: null }, { question });
          set({ aside: unsupported });
        } else if (unsupported) {
          const offer = rest;
          set({
            asking: false,
            // Nothing to show: the guide opens, so the next question has something to start from.
            guideOpen: true,
            notice: unsupported,
            // Only worth offering if it actually narrows things down.
            suggestion: isUnfiltered({ ...offer, unsupported: null }) ? null : { ...offer, unsupported: null },
          });
        } else {
          set({ asking: false });
          get().ask(data.query, { question });
        }
      } catch (error) {
        console.error("Question failed:", error);
        const message = error instanceof Error && !error.message.startsWith("HTTP") ? error.message : null;
        set({
          asking: false,
          failed: true,
          notice: message ?? "Couldn't read that question just now. Try again in a moment.",
        });
      }
    },

    removeFilter(key) {
      const { query } = get();
      const cleared = key === "days" ? { days: DEFAULT_QUERY.days } : { [key]: null };
      const next = { ...query, ...cleared };
      // With every filter gone, the answer is just the default view again.
      if (isUnfiltered(next)) return get().reset();
      // Taking a region away zooms back out to the world; other filters leave the camera be.
      show(next, key === "region", { presetId: null, edited: true, aside: null });
    },

    reset() {
      get().restore(null);
    },

    restore(answer) {
      const base = { notice: null, aside: null, suggestion: null, failed: false };
      if (!answer) {
        show(DEFAULT_QUERY, true, { ...base, question: null, presetId: null, edited: false, source: null });
        return;
      }
      const { query, question, presetId, source, edited } = answer;
      show(query, true, { ...base, question, presetId, source, edited });
    },

    select(id, { fly = true } = {}) {
      const quake = id ? get().quakes.find((q) => q.id === id) : undefined;
      set({
        selectedId: quake ? quake.id : null,
        flyTarget: quake && fly ? { lat: quake.lat, lon: quake.lon, key: ++flyKey } : get().flyTarget,
      });
    },

    hover(id) {
      if (get().hoveredId !== id) set({ hoveredId: id });
    },
  };
});
