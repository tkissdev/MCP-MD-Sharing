import { getServiceClient } from "./supabase";

// OpenAI's embeddings endpoint caps a single request at 2048 inputs (and a
// total token budget), so a large document has to be sent in slices rather
// than as one array.
const BATCH_SIZE = 100;

async function embedBatch(texts: string[]): Promise<number[][]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.functions.invoke<{ embeddings: number[][]; error?: string }>(
    "embed",
    // Sent base64-encoded: the WAF in front of Edge Functions rejects bodies
    // containing strings like "'; DROP TABLE" or "<script>", which are normal
    // content in documentation about SQL or HTML.
    { body: { texts_b64: texts.map((t) => Buffer.from(t, "utf8").toString("base64")) } }
  );

  if (error) throw new Error(`embed function invocation failed: ${error.message}`);
  if (!data) throw new Error("embed function returned no data");
  if (data.error) throw new Error(`embed function error: ${data.error}`);

  return data.embeddings;
}

// The OpenAI API key lives only as a Supabase Edge Function secret, never in
// this app's own environment — this just invokes that function over Supabase's
// authenticated functions gateway.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    embeddings.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE))));
  }

  if (embeddings.length !== texts.length) {
    throw new Error(`embed returned ${embeddings.length} vectors for ${texts.length} texts`);
  }

  return embeddings;
}
