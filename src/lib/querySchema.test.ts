import { describe, expect, it } from "vitest";
import { PRESETS } from "./presets";
import { DEFAULT_QUERY, querySchema, settleAnswer } from "./querySchema";

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

describe("settleAnswer", () => {
  const base = { ...DEFAULT_QUERY, region: { name: "Paris", lat: 48.86, lon: 2.35, radiusKm: 150 } };

  it("drops any note on an answerable question", () => {
    expect(settleAnswer({ ...base, topic: "answerable", unsupported: "I can't check the weather." }).unsupported).toBeNull();
  });

  it("keeps the AI's note otherwise", () => {
    expect(settleAnswer({ ...base, topic: "not-earthquakes", unsupported: "I can't check the weather." }).unsupported).toBe(
      "I can't check the weather.",
    );
  });

  it("fills in a note when the AI left one out", () => {
    expect(settleAnswer({ ...base, topic: "earthquakes-not-in-data", unsupported: null }).unsupported).toMatch(/not in this data/);
  });

  it("returns a plain query, without the topic", () => {
    expect("topic" in settleAnswer({ ...base, topic: "answerable", unsupported: null })).toBe(false);
  });
});

describe("settleAnswer safety net", () => {
  it("answers a refused question that already filters the quakes", () => {
    const strong = { ...DEFAULT_QUERY, minMagnitude: 6, topic: "earthquakes-not-in-data" as const, unsupported: "Name a place." };
    expect(settleAnswer(strong).unsupported).toBeNull();
  });

  it("still refuses a question with no filter and no place", () => {
    const poem = { ...DEFAULT_QUERY, topic: "not-earthquakes" as const, unsupported: "I can't write poems." };
    expect(settleAnswer(poem).unsupported).toBe("I can't write poems.");
  });
});
