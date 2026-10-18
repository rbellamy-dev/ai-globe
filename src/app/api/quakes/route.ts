import { FEED_URL, normalizeFeed, type Feed } from "@/lib/usgs";

// Node.js runtime (Fluid Compute). The USGS feed updates every minute, but
// five-minute-old data is fine here and keeps us off their servers.
export const revalidate = 300;

export async function GET() {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: 300 } });
    if (!res.ok) {
      return Response.json({ error: "The USGS feed is unavailable right now." }, { status: 502 });
    }
    const feed = (await res.json()) as Feed;
    return Response.json({
      quakes: normalizeFeed(feed),
      generatedAt: feed.metadata?.generated ?? Date.now(),
    });
  } catch (error) {
    console.error("Failed to load the USGS feed:", error);
    return Response.json({ error: "The USGS feed is unavailable right now." }, { status: 502 });
  }
}
