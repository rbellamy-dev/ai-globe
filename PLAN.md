# Ask the Planet — build plan

## Context
A new portfolio project to go next to the travel dashboard: a 3D globe of live earthquakes that you explore by typing questions. The AI only turns a question into a structured query; every dot and number on screen comes from real USGS data. This is the main idea of the case study. The design follows the **Sky** wireframe (`~/Desktop/portfolios/earthquake-globe-sky.png`): light blue globe, magenta used only for data, dark navy text.

## Stack (copied from `projects/trivia-game`, which already works)
- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Vitest**, the same setup as `trivia-game/package.json`.
- **AI:** `ai` v7 + `@ai-sdk/openai` + `zod`, using the same pattern as `trivia-game/src/app/api/questions/route.ts` (structured `Output`, model `gpt-4o-mini`, `OPENAI_API_KEY` check, Node runtime with no edge). Copy `.env.local`'s `OPENAI_API_KEY`.
- **3D:** `three`, `@react-three/fiber`, `@react-three/drei`, `maath` (easing).
- **State:** `zustand`.
- **Land shapes:** Natural Earth 110m GeoJSON (public domain) in `public/`, plus `d3-geo` to draw it onto a canvas texture.
- **Location:** `projects/ai_globe/` (exists, empty). **Vercel project name:** `ai-globe`.
- **First action after approval:** save this plan as `projects/ai_globe/PLAN.md`, then scaffold the app in the same folder.

## How it works
1. **Data:** `GET /api/quakes` fetches the USGS feed `all_month.geojson`, normalizes each quake to `{id, mag, lat, lon, depthKm, time, place}`, and is cached for 5 minutes (`revalidate`). The client loads it once and does all filtering in the browser.
2. **Question → query:** `POST /api/ask {question}` → `generateText` with `Output.object(querySchema)`. The schema (`src/lib/querySchema.ts`):
   `{ minMagnitude?, maxMagnitude?, days (1–30), maxDepthKm?, region?: {name, lat, lon, radiusKm}, sort: "magnitude"|"recent", limit?, camera: {lat, lon, distance}, title, unsupported?: string }`
   The prompt says the model never states counts or facts; if a question can't be answered with this data, it fills in `unsupported` with an explanation and suggestions.
3. **Apply the query:** `applyQuery(quakes, query)` in `src/lib/filter.ts` is a pure function that returns the matching quakes. The headline ("12 earthquakes of M 6.0+ in the last 30 days") is built from the results by a template, never written by the model.
4. **Animate:** matching markers grow in place, the others shrink to zero, and the camera eases to `query.camera`. Filter chips come from the query, and removing one updates the query without calling the AI.
5. **Example chips** ("Biggest this week" and the others) use pre-written queries in `src/lib/presets.ts`, so they're instant and free, and the demo works even without an API key.

## Files
```
src/app/page.tsx                  layout: header, globe, answer panel, question bar
src/app/api/quakes/route.ts       USGS fetch + normalize + cache
src/app/api/ask/route.ts          question → query (AI SDK structured output)
src/components/globe/Scene.tsx    <Canvas>, lights, OrbitControls, camera rig
src/components/globe/Earth.tsx    sphere + land texture + grid lines
src/components/globe/Atmosphere.tsx  fresnel glow on a back-side sphere
src/components/globe/Quakes.tsx   one InstancedMesh, per-instance scale/color, click/hover via instanceId
src/components/globe/Selected.tsx pulse rings + drei <Html> label
src/components/panel/*            AnswerPanel, FilterChips, ResultList, QueryCode
src/components/QuestionBar.tsx    input + example chips + loading state
src/lib/geo.ts                    latLonToVector3, distanceKm
src/lib/usgs.ts                   normalize feed
src/lib/filter.ts                 applyQuery + headline text
src/lib/querySchema.ts            zod schema
src/lib/presets.ts                ready-made queries for the chips
src/store.ts                      zustand: quakes, query, selectedId, status
src/styles/tokens.css             Sky palette from the wireframe (#F7F9FB bg, #14212B ink, #D6336C data, #8EC5F0 glow…)
```

## Phases (I stop after each phase for your review)
Earthquakes only, with no second dataset. The data switch from the wireframe is removed, and the header just says "Ask the planet".

At the end of each phase I run the tests, start `npm run dev`, and send you a short list of what to look at. **I don't start the next phase until you say go.** Nothing is committed or deployed without your OK.

### Phase 1: The globe (~15–30 min)
- Scaffold the Next.js app in `projects/ai_globe/`, add the Sky palette in `tokens.css`, and lay out the page (header, globe area, empty panel, question bar placeholder).
- Earth sphere + land texture + grid lines + atmosphere glow. Drag to rotate, scroll to zoom, and a slow turn when idle.
- **You review:** does the globe look premium in Sky colors (glow, land, lighting)? Is the layout right?

### Phase 2: Real earthquakes (~30–45 min)
- `/api/quakes` (USGS, cached), instanced markers sized by magnitude in magenta.
- Hover and click show the label with pulse rings. The panel lists the biggest recent quakes, and clicking one flies the camera to it.
- Tests: `geo.test.ts`, `usgs.test.ts`.
- **You review:** do the markers read well? Is the label clear? How does the camera movement feel?

### Phase 3: Questions without AI (~45–60 min). This is the core experience.
- `applyQuery` + headline text, the three preset chips, matching markers growing and the rest shrinking, the camera easing to the region, removable filter chips, and the box showing the query.
- Tests: `filter.test.ts`, `querySchema.test.ts`.
- **You review:** does clicking a chip feel satisfying? Adjust the timing and easing here.

### Phase 4: AI questions (~30 min)
- `/api/ask` with structured output, the working question bar, a loading state (the globe starts turning toward its target), friendly replies for `unsupported` questions and errors, plus the length and session limits.
- **You review:** try normal and weird questions. Check that the numbers match USGS.

### Phase 5: Polish (~45–60 min)
- Phone layout (panel becomes a bottom sheet), reduced motion, keyboard access, speed check, and a `npm run build` that passes.
- **You review:** test on your phone and decide whether it's ready to deploy.

### Phase 6: Deploy (~10 min, only when you say so)
- Vercel project `ai-globe` and the `OPENAI_API_KEY` env var.

## Cost and abuse protection
- The example chips cost nothing. Free-text questions are capped at 200 characters and a small `maxOutputTokens`.
- A limit of about 20 questions per browser session on the client, plus a per-visitor limit in `/api/ask` (8 a minute, 40 an hour).

## Testing
- **Vitest:** `geo.test.ts` (lat/lon → position, distance), `usgs.test.ts` (normalizing a sample feed), `filter.test.ts` (each query field, plus the headline text), `querySchema.test.ts` (valid and invalid queries).
- **By hand with `npm run dev`:**
  - Chips work with no API key.
  - Ask "biggest earthquakes this month", "quakes near Japan" and "what's the weather" (should get a helpful `unsupported` reply).
  - Check that every number on screen matches the USGS data.
  - Test at phone width and with reduced motion on.
- **Build:** `npm run build` passes.
