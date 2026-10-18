import { describe, expect, it } from "vitest";
import { PRESETS } from "./presets";
import { DEFAULT_QUERY } from "./querySchema";
import { fromSearch, toSearch, type SharedAnswer } from "./urlState";

const fiji: SharedAnswer = {
  query: {
    ...DEFAULT_QUERY,
    title: "Deep quakes under Fiji",
    minDepthKm: 300,
    region: { name: "Fiji", lat: -17.7134, lon: 178.065, radiusKm: 1000 },
    sort: "recent",
    limit: 5,
  },
  question: "deep quakes under Fiji",
  presetId: null,
  source: "ai",
  edited: false,
};

describe("toSearch / fromSearch", () => {
  it("keeps the default view's URL clean", () => {
    expect(toSearch(null)).toBe("");
    expect(fromSearch("")).toBeNull();
  });

  it("gives an untouched example a short link", () => {
    const preset = PRESETS[1];
    const search = toSearch({ query: preset.query, question: preset.label, presetId: preset.id, source: "preset", edited: false });
    expect(search).toBe(`?ex=${preset.id}`);
    expect(fromSearch(search)).toMatchObject({ presetId: preset.id, query: preset.query, edited: false });
  });

  it("round-trips a typed question's filters, with no AI call needed", () => {
    const back = fromSearch(toSearch(fiji))!;
    expect(back.question).toBe("deep quakes under Fiji");
    expect(back.source).toBe("ai");
    expect(back.query).toMatchObject({
      minDepthKm: 300,
      region: { name: "Fiji", lat: -17.71, lon: 178.07, radiusKm: 1000 },
      sort: "recent",
      limit: 5,
      days: 30,
    });
  });

  it("spells out an edited example", () => {
    const preset = PRESETS[0];
    const search = toSearch({ query: { ...preset.query, limit: null }, question: preset.label, presetId: preset.id, source: "preset", edited: true });
    expect(search).toContain("edited=1");
    expect(fromSearch(search)).toMatchObject({ source: "preset", edited: true, query: { days: 7, limit: null } });
  });

  it("ignores malformed or tampered links", () => {
    expect(fromSearch("?ex=nope")).toBeNull();
    expect(fromSearch("?q=x&days=90")).toBeNull();
    expect(fromSearch("?q=x&near=Somewhere&lat=200&lon=0&r=500")).toBeNull();
    expect(fromSearch("?min=6")).toBeNull();
  });
});
