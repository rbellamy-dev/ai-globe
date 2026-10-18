import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { ASK_SYSTEM_PROMPT, MAX_QUESTION_LENGTH } from "@/lib/askPrompt";
import { querySchema, type Query } from "@/lib/querySchema";
import { createLimiter, visitorOf } from "@/lib/rateLimit";

// Run on the Node.js runtime (Fluid Compute). Do NOT switch to edge.
export const maxDuration = 30;

// Instances are reused across requests, so a small cache saves repeat
// questions ("biggest quakes this week") from costing anything twice.
const CACHE_SIZE = 200;
const cache = new Map<string, Query>();
const takeQuestion = createLimiter();
const remember = (key: string, query: Query) => {
  cache.delete(key);
  cache.set(key, query);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
};

/** POST { question } → { query }. The query can carry `unsupported` for questions the data can't answer. */
export async function POST(request: Request) {
  let question: string;
  try {
    const body = await request.json();
    question = typeof body?.question === "string" ? body.question.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!question) {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json({ error: `Keep questions under ${MAX_QUESTION_LENGTH} characters.` }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "The server is missing OPENAI_API_KEY." }, { status: 500 });
  }

  const key = question.toLowerCase().replace(/\s+/g, " ").replace(/[?.!]+$/, "");
  const cached = cache.get(key);
  if (cached) return Response.json({ query: cached });

  // Only questions that reach the model count: a repeat from the cache costs nothing.
  const allowed = takeQuestion(visitorOf(request));
  if (!allowed.ok) {
    return Response.json(
      { error: "That's a lot of questions in a row. Give it a minute, or try one of the examples." },
      { status: 429, headers: { "Retry-After": String(allowed.retryAfter) } },
    );
  }

  try {
    const { output } = await generateText({
      model: openai("gpt-4o-mini"),
      output: Output.object({ schema: querySchema }),
      system: ASK_SYSTEM_PROMPT,
      prompt: question,
      temperature: 0,
      maxOutputTokens: 400,
      abortSignal: request.signal,
    });

    // The schema's cross-field checks (min ≤ max) only run here, not in the model.
    const parsed = querySchema.safeParse(output);
    if (!parsed.success) {
      console.warn("Model returned an invalid query:", parsed.error.issues);
      return Response.json({ error: "That question came back garbled. Try rephrasing it." }, { status: 502 });
    }

    remember(key, parsed.data);
    return Response.json({ query: parsed.data });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("Failed to turn a question into a query:", error);
    return Response.json({ error: "Couldn't read that question just now. Try again in a moment." }, { status: 502 });
  }
}
