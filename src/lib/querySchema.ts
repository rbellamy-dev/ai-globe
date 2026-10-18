import { z } from "zod";

/**
 * Everything a question can ask of the data. The AI fills this in (phase 4);
 * the example chips use ready-made ones. Fields are nullable rather than
 * optional so the model must decide on every one.
 */
export const regionSchema = z.object({
  name: z.string().min(1).max(60).describe("Short place name for display, e.g. \"Japan\"."),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  radiusKm: z.number().min(50).max(5000).describe("How far from the center to include."),
});

/** The query's fields. The AI fills in all of them; the example chips use ready-made ones. */
const queryFields = {
  // Right after the topic, so the place is written down before anything else, whatever the topic.
  region: regionSchema
    .nullable()
    .describe("The place named in the question, whatever the topic: \"weather in Paris\" still gets Paris. null only when no place is named."),
  title: z.string().min(1).max(80).describe("A short heading for the answer, e.g. \"Biggest quakes near Japan\"."),
  minMagnitude: z.number().min(0).max(10).nullable(),
  maxMagnitude: z.number().min(0).max(10).nullable(),
  days: z.number().int().min(1).max(30).describe("How far back to look. The data covers the last 30 days."),
  minDepthKm: z.number().min(0).max(800).nullable().describe("Deep quakes are over 300 km deep."),
  maxDepthKm: z.number().min(0).max(800).nullable().describe("Shallow quakes are under 70 km deep."),
  sort: z.enum(["magnitude", "smallest", "recent"]).describe("Biggest first, smallest first, or newest first."),
  limit: z.number().int().min(1).max(50).nullable().describe("Only for \"top N\" questions."),
  unsupported: z
    .string()
    .max(240)
    .nullable()
    .describe("Only when topic isn't \"answerable\": what you can't do, in one friendly sentence."),
};

type Ranges = { minMagnitude: number | null; maxMagnitude: number | null; minDepthKm: number | null; maxDepthKm: number | null };
/** Cross-field checks the model can't be held to: min ≤ max. */
const inOrder = <T extends Ranges>(schema: z.ZodType<T>) =>
  schema
    .refine((q) => q.minMagnitude == null || q.maxMagnitude == null || q.minMagnitude <= q.maxMagnitude, {
      message: "minMagnitude must not be above maxMagnitude.",
    })
    .refine((q) => q.minDepthKm == null || q.maxDepthKm == null || q.minDepthKm <= q.maxDepthKm, {
      message: "minDepthKm must not be above maxDepthKm.",
    });

export const querySchema = inOrder(z.object(queryFields));

/**
 * What the AI fills in: the query, led by `topic`. Structured output is
 * written in field order, so the model labels the question before writing
 * any filter, and the server holds the note to that label (see settleAnswer).
 */
export const askSchema = inOrder(
  z.object({
    topic: z
      .enum(["answerable", "earthquakes-not-in-data", "not-earthquakes"])
      .describe("Decide this first. A place name on its own is \"answerable\"."),
    ...queryFields,
  }),
);
export type AskOutput = z.infer<typeof askSchema>;

const FALLBACK_NOTE = {
  "earthquakes-not-in-data": "That's not in this data, which has each quake's size, depth, place and time from the last 30 days.",
  "not-earthquakes": "That's not something this earthquake map can answer.",
} as const;

/** Whether a query filters the quakes at all, beyond the defaults. */
const filters = (q: Omit<Query, "unsupported">) =>
  q.minMagnitude != null ||
  q.maxMagnitude != null ||
  q.minDepthKm != null ||
  q.maxDepthKm != null ||
  q.limit != null ||
  q.days !== DEFAULT_QUERY.days ||
  q.sort !== DEFAULT_QUERY.sort;

/**
 * The AI's output as the app's query: an answerable question never carries a
 * note; any other always does. One safety net: a refusal that names no place
 * but already filters by size, depth, time or rank ("strong quakes", "today")
 * was an earthquake question all along, so it's answered.
 */
export function settleAnswer({ topic, ...query }: AskOutput): Query {
  if (topic === "answerable" || (query.region == null && filters(query))) return { ...query, unsupported: null };
  return { ...query, unsupported: query.unsupported ?? FALLBACK_NOTE[topic] };
}

export type Query = z.infer<typeof querySchema>;
export type Region = z.infer<typeof regionSchema>;

/** What the app shows before anyone asks anything: the whole month, biggest first. */
export const DEFAULT_QUERY: Query = {
  title: "Biggest this month",
  minMagnitude: null,
  maxMagnitude: null,
  days: 30,
  minDepthKm: null,
  maxDepthKm: null,
  region: null,
  sort: "magnitude",
  limit: null,
  unsupported: null,
};
