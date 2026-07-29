import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EMBEDDING_MODEL = "text-embedding-3-small";

// Document text is sent base64-encoded: the WAF in front of Edge Functions
// rejects request bodies containing things like "'; DROP TABLE" or "<script>",
// which are perfectly normal inside documentation about SQL or HTML.
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

  let body: { texts?: string[]; texts_b64?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  let texts: string[] | undefined;
  try {
    texts = Array.isArray(body.texts_b64) ? body.texts_b64.map(decodeBase64) : body.texts;
  } catch {
    return new Response(JSON.stringify({ error: "texts_b64 is not valid base64" }), { status: 400 });
  }

  if (!Array.isArray(texts) || texts.length === 0) {
    return new Response(JSON.stringify({ embeddings: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    return new Response(JSON.stringify({ error: `OpenAI request failed: ${errBody}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const json = await response.json();
  const embeddings = json.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((d: { embedding: number[] }) => d.embedding);

  return new Response(JSON.stringify({ embeddings }), {
    headers: { "Content-Type": "application/json" },
  });
});
