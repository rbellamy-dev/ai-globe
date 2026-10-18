import { describe, expect, it } from "vitest";
import { createLimiter, visitorOf } from "./rateLimit";

describe("createLimiter", () => {
  const limits = [
    { ms: 60_000, max: 3 },
    { ms: 3_600_000, max: 5 },
  ];

  it("allows questions up to the per-minute limit, then says when to retry", () => {
    const take = createLimiter(limits);
    expect(take("a", 0).ok).toBe(true);
    expect(take("a", 1_000).ok).toBe(true);
    expect(take("a", 2_000).ok).toBe(true);
    expect(take("a", 3_000)).toEqual({ ok: false, retryAfter: 57 });
    // A minute after the first, one more fits.
    expect(take("a", 60_001).ok).toBe(true);
  });

  it("holds to the hourly limit too", () => {
    const take = createLimiter(limits);
    for (let i = 0; i < 5; i++) expect(take("a", i * 61_000).ok).toBe(true);
    const blocked = take("a", 5 * 61_000);
    expect(blocked.ok).toBe(false);
    expect(take("a", 3_600_001).ok).toBe(true);
  });

  it("counts each visitor separately", () => {
    const take = createLimiter(limits);
    for (let i = 0; i < 3; i++) take("a", i);
    expect(take("a", 10).ok).toBe(false);
    expect(take("b", 10).ok).toBe(true);
  });
});

describe("visitorOf", () => {
  it("prefers the real IP, then the first forwarded one", () => {
    expect(visitorOf(new Request("http://x", { headers: { "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" } }))).toBe("1.1.1.1");
    expect(visitorOf(new Request("http://x", { headers: { "x-forwarded-for": "2.2.2.2, 3.3.3.3" } }))).toBe("2.2.2.2");
    expect(visitorOf(new Request("http://x"))).toBe("unknown");
  });
});
