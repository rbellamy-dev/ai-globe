# Ask the Planet

A 3D globe of the last 30 days of earthquakes that you explore by asking questions in plain English, like "deep quakes under Fiji."

**Live:** https://ai-globe-pi.vercel.app
**Case study:** https://rbellamy.com/work/ask-the-planet/

## How it works

- Earthquake data comes from the [USGS live feed](https://earthquake.usgs.gov/earthquakes/feed/) (every quake of magnitude 2.5+ in the past month), refreshed every 5 minutes.
- The AI only turns your question into a filter (magnitude, depth, place, time). It never writes counts or facts: every dot and number comes from the USGS data.
- The globe, timeline and list all show the same answer. Color means depth, size means magnitude.

Built with Next.js, React Three Fiber, the Vercel AI SDK (OpenAI) and Tailwind.

## Run it locally

```sh
npm install
echo "OPENAI_API_KEY=your-key" > .env.local
npm run dev
```

Without a key, the example questions still work; only typed questions need the AI.

```sh
npm test       # unit tests
npm run lint
```
