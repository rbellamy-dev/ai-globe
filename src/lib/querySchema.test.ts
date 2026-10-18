import { describe, expect, it } from "vitest";
import { PRESETS } from "./presets";
import { DEFAULT_QUERY, querySchema } from "./querySchema";

describe("querySchema", () => {
  it("accepts the default query and every preset", () => {
    expect(querySchema.safeParse(DEFAULT_QUERY).success).toBe(true);
    for (const preset of PRESETS) expect(querySchema.safeParse(preset.query).success).toBe(true);
  });

  it("rejects a minimum above the maximum", () => {
    expect(querySchema.safeParse({ ...DEFAULT_QUERY, minMagnitude: 6, maxMagnitude: 4 }).success).toBe(false);
  });

  it("rejects a minimum depth below the maximum", () => {
    expect(querySchema.safeParse({ ...DEFAULT_QUERY, minDepthKm: 300, maxDepthKm: 70 }).success).toBe(false);
  });

  it("rejects looking further back than the data goes", () => {
    expect(querySchema.safeParse({ ...DEFAULT_QUERY, days: 60 }).success).toBe(false);
  });

  it("rejects impossible coordinates and missing fields", () => {
    const region = { name: "Nowhere", lat: 120, lon: 0, radiusKm: 500 };
    expect(querySchema.safeParse({ ...DEFAULT_QUERY, region }).success).toBe(false);
    const noSort: Partial<typeof DEFAULT_QUERY> = { ...DEFAULT_QUERY };
    delete noSort.sort;
    expect(querySchema.safeParse(noSort).success).toBe(false);
  });
});
