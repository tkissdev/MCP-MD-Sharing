// Rebuilds every document's search chunks from scratch. Run after changing
// chunking rules or the embedding model:
//
//   node scripts/reindex-all.mjs
//
// Imports lib/chunking.ts directly (Node strips the types) so the chunking
// rules can never drift from what the app itself uses.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chunkMarkdown } from "../lib/chunking.ts";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 100;

async function embedTexts(texts) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const { data, error } = await supabase.functions.invoke("embed", {
      // Base64: the WAF in front of Edge Functions rejects bodies containing
      // strings like "'; DROP TABLE" or "<script>" that appear in real docs.
      body: {
        texts_b64: texts.slice(i, i + BATCH_SIZE).map((t) => Buffer.from(t, "utf8").toString("base64")),
      },
    });
    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    embeddings.push(...data.embeddings);
  }
  return embeddings;
}

const { data: documents, error: docsError } = await supabase
  .from("documents")
  .select("id, path, current_version, project_id");
if (docsError) throw docsError;

let totalChunks = 0;
let failed = 0;

for (const doc of documents) {
  try {
    const { data: version, error: versionError } = await supabase
      .from("versions")
      .select("content")
      .eq("document_id", doc.id)
      .eq("version_number", doc.current_version)
      .single();
    if (versionError) throw versionError;

    const pieces = chunkMarkdown(version.content);

    // Embed before deleting, so a failure leaves the old index in place.
    const embeddings = pieces.length > 0 ? await embedTexts(pieces) : [];

    await supabase.from("chunks").delete().eq("document_id", doc.id);

    if (pieces.length === 0) {
      console.log(`skip (empty): ${doc.path}`);
      continue;
    }

    const rows = pieces.map((text, i) => ({
      project_id: doc.project_id,
      document_id: doc.id,
      version_number: doc.current_version,
      chunk_index: i,
      content: text,
      content_hash: createHash("sha256").update(text).digest("hex"),
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase.from("chunks").insert(rows);
    if (insertError) throw new Error(insertError.message);

    totalChunks += pieces.length;
    console.log(`indexed: ${doc.path} (${pieces.length} chunks)`);
  } catch (err) {
    failed++;
    console.error(`failed: ${doc.path}: ${err.message}`);
  }
}

console.log(`\nDone. ${documents.length - failed}/${documents.length} documents, ${totalChunks} chunks.`);
if (failed > 0) process.exitCode = 1;
