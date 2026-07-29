import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Hybrid search (vector + keyword) is fast but approximate: it ranks on
// surface similarity, not on whether a passage actually answers the question.
// This second pass reads the query and each candidate together and reorders
// them — the single biggest quality lever once hybrid retrieval is in place.
const RERANK_MODEL = Deno.env.get("RERANK_MODEL") ?? "gpt-4o-mini";

// Enough signal to judge relevance without paying for the full passage.
const MAX_PASSAGE_CHARS = 500;

const SYSTEM_PROMPT = `You rank passages by how well they answer a user's search query.

Score every passage from 0 to 10:
  10 = directly and completely answers the query
   7 = contains most of the answer
   4 = related topic, partial or indirect information
   0 = unrelated

Judge only relevance to the query. Ignore writing quality, length, and formatting.
Passages may be in French or English; treat both equally.

Reply with JSON only, in this exact shape, including every passage index exactly once:
{"ranking": [{"i": 0, "s": 8}, {"i": 1, "s": 3}]}`;

interface Candidate {
  id: string;
  text?: string;
  // Base64 alternative to `text`: the WAF in front of Edge Functions rejects
  // bodies containing things like "'; DROP TABLE" or "<script>", which are
  // perfectly normal inside documentation about SQL or HTML.
  text_b64?: string;
}

function decodeBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: { query?: string; candidates?: Candidate[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const query = body.query?.trim();
  const candidates = body.candidates;

  if (!query || !Array.isArray(candidates) || candidates.length === 0) {
    return new Response(JSON.stringify({ scores: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), { status: 500 });
  }

  let passages: string;
  try {
    passages = candidates
      .map((c, i) => {
        const text = c.text_b64 ? decodeBase64(c.text_b64) : (c.text ?? "");
        return `[${i}] ${text.slice(0, MAX_PASSAGE_CHARS).replace(/\s+/g, " ")}`;
      })
      .join("\n\n");
  } catch {
    return new Response(JSON.stringify({ error: "text_b64 is not valid base64" }), { status: 400 });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: RERANK_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Query: ${query}\n\nPassages:\n${passages}` },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    return new Response(JSON.stringify({ error: `OpenAI request failed: ${errBody}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const json = await response.json();
  let ranking: { i: number; s: number }[];
  try {
    ranking = JSON.parse(json.choices[0].message.content).ranking ?? [];
  } catch {
    return new Response(JSON.stringify({ error: "Model returned unparseable JSON" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Map back to ids. A passage the model skipped keeps a null score so the
  // caller can fall back to its original hybrid-search position for it.
  const scoreByIndex = new Map<number, number>();
  for (const entry of ranking) {
    if (typeof entry?.i === "number" && typeof entry?.s === "number") {
      scoreByIndex.set(entry.i, entry.s);
    }
  }

  const scores = candidates.map((c, i) => ({ id: c.id, score: scoreByIndex.get(i) ?? null }));

  return new Response(JSON.stringify({ scores }), {
    headers: { "Content-Type": "application/json" },
  });
});
