import { createHash } from "node:crypto";
import { getServiceClient } from "./supabase";
import { chunkMarkdown } from "./chunking";
import { embedTexts } from "./embeddings";

function hashChunk(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// Re-derives all search chunks for a document from its latest content.
// Called after every create/update/restore so search never serves stale text.
//
// Chunks whose text is byte-identical to a chunk already stored for this
// document keep their existing embedding: editing one line of a long document
// then only costs the embeddings for the chunks that actually changed.
export async function reindexDocument(
  projectId: string,
  documentId: string,
  versionNumber: number,
  content: string
) {
  const supabase = getServiceClient();
  const pieces = chunkMarkdown(content);

  const { data: existing, error: existingError } = await supabase
    .from("chunks")
    .select("content_hash, embedding")
    .eq("document_id", documentId);

  if (existingError) throw new Error(existingError.message);

  const cached = new Map<string, number[]>();
  for (const row of existing ?? []) {
    if (!row.content_hash || !row.embedding) continue;
    // pgvector values come back as a JSON-encoded string over PostgREST.
    const vector = typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding;
    cached.set(row.content_hash, vector as number[]);
  }

  const hashes = pieces.map(hashChunk);
  const missing = pieces.filter((_, i) => !cached.has(hashes[i]));

  // Compute the new chunks/embeddings before touching existing rows, so a
  // failed embedding call (e.g. OpenAI down) leaves the previous, still-valid
  // index in place instead of leaving the document unsearchable.
  const fresh = await embedTexts(missing);
  const freshByHash = new Map<string, number[]>();
  missing.forEach((text, i) => freshByHash.set(hashChunk(text), fresh[i]));

  await supabase.from("chunks").delete().eq("document_id", documentId);
  if (pieces.length === 0) return;

  const rows = pieces.map((text, i) => ({
    project_id: projectId,
    document_id: documentId,
    version_number: versionNumber,
    chunk_index: i,
    content: text,
    content_hash: hashes[i],
    embedding: cached.get(hashes[i]) ?? freshByHash.get(hashes[i]),
  }));

  const { error } = await supabase.from("chunks").insert(rows);
  if (error) throw new Error(error.message);
}

// Indexing (chunking + embeddings) is a best-effort side effect of saving a
// document — a save must still succeed even if OpenAI is down or out of quota.
// When it fails the previous chunks stay in place with their older
// version_number, which is what marks the document's index as stale (see
// listDocuments).
export async function reindexDocumentSafe(
  projectId: string,
  documentId: string,
  versionNumber: number,
  content: string
) {
  try {
    await reindexDocument(projectId, documentId, versionNumber, content);
  } catch (err) {
    console.error(`Reindexing failed for document ${documentId} v${versionNumber}:`, err);
  }
}
