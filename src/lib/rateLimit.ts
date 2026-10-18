/**
 * A per-visitor limit on AI questions, kept in the server instance's memory.
 * Instances are reused across requests, so this stops one visitor (or a
 * script) from looping on the route. Each instance counts on its own.
 */
export interface Window {
  ms: number;
  max: number;
}

export const ASK_LIMITS: Window[] = [
  { ms: 60_000, max: 8 },
  { ms: 3_600_000, max: 40 },
];

/** Forget visitors after this many, oldest first, so memory stays small. */
const MAX_VISITORS = 5_000;

export function createLimiter(limits: Window[] = ASK_LIMITS) {
  const longest = Math.max(...limits.map((l) => l.ms));
  const seen = new Map<string, number[]>();

  /** Records a question from `visitor` at `now` if allowed; otherwise says how many seconds until it would be. */
  return function take(visitor: string, now = Date.now()): { ok: true } | { ok: false; retryAfter: number } {
    const times = (seen.get(visitor) ?? []).filter((t) => now - t < longest);
    for (const { ms, max } of limits) {
      const inWindow = times.filter((t) => now - t < ms);
      if (inWindow.length >= max) {
        seen.set(visitor, times);
        return { ok: false, retryAfter: Math.ceil((inWindow[0] + ms - now) / 1000) };
      }
    }
    times.push(now);
    seen.delete(visitor); // re-insert, so the oldest visitors are first to go
    seen.set(visitor, times);
    if (seen.size > MAX_VISITORS) seen.delete(seen.keys().next().value!);
    return { ok: true };
  };
}

/** The visitor's address as Vercel (or another proxy) reports it. */
export function visitorOf(request: Request) {
  return (
    request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  );
}
