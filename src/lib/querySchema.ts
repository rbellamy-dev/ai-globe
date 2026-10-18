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

export const querySchema = z
  .object({
    title: z.string().min(1).max(80).describe("A short heading for the answer, e.g. \"Biggest quakes near Japan\"."),
    minMagnitude: z.number().min(0).max(10).nullable(),
    maxMagnitude: z.number().min(0).max(10).nullable(),
    days: z.number().int().min(1).max(30).describe("How far back to look. The data covers the last 30 days."),
    minDepthKm: z.number().min(0).max(800).nullable().describe("Deep quakes are over 300 km deep."),
    maxDepthKm: z.number().min(0).max(800).nullable().describe("Shallow quakes are under 70 km deep."),
    region: regionSchema.nullable(),
    sort: z.enum(["magnitude", "smallest", "recent"]).describe("Biggest first, smallest first, or newest first."),
    limit: z.number().int().min(1).max(50).nullable().describe("Only for \"top N\" questions."),
    unsupported: z
      .string()
      .max(240)
      .nullable()
      .describe("When the question can't be answered with this data: why, in one friendly sentence."),
  })
  .refine((q) => q.minMagnitude == null || q.maxMagnitude == null || q.minMagnitude <= q.maxMagnitude, {
    message: "minMagnitude must not be above maxMagnitude.",
  })
  .refine((q) => q.minDepthKm == null || q.maxDepthKm == null || q.minDepthKm <= q.maxDepthKm, {
    message: "minDepthKm must not be above maxDepthKm.",
  });

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
