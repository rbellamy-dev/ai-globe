import { describe, expect, it } from "vitest";
import { formatMag, timeAgo } from "./format";

describe("timeAgo", () => {
  const now = 10 * 24 * 3_600_000;

  it("picks the largest whole unit", () => {
    expect(timeAgo(now - 30_000, now)).toBe("just now");
    expect(timeAgo(now - 12 * 60_000, now)).toBe("12m ago");
    expect(timeAgo(now - 5 * 3_600_000, now)).toBe("5h ago");
    expect(timeAgo(now - 3 * 24 * 3_600_000 - 1000, now)).toBe("3d ago");
  });

  it("never goes negative for times slightly in the future", () => {
    expect(timeAgo(now + 5000, now)).toBe("just now");
  });
});

describe("formatMag", () => {
  it("always shows one decimal", () => {
    expect(formatMag(6)).toBe("M 6.0");
    expect(formatMag(7.25)).toBe("M 7.3");
  });
});
