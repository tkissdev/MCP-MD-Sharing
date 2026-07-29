import { getServiceClient } from "./supabase";
import { embedTexts } from "./embeddings";
import { listProjectsForUser } from "./documents";
import { requireProjectAccess } from "./permissions";

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  project_id: string;
  path: string;
  chunk_index: number;
  content: string;
  score: number;
}

// How many hybrid-search candidates to hand the reranker. Reranking only helps
// if it gets more candidates than the caller asked for.
const CANDIDATE_MULTIPLIER = 4;
const MIN_CANDIDATES = 30;
const MAX_CANDIDATES = 60;

// Reranking costs one extra model call per search. Set SEARCH_RERANK=off to
// fall back to plain hybrid ranking.
const rerankEnabled = process.env.SEARCH_RERANK !== "off";

async function rerank(query: string, candidates: SearchResult[], limit: number): Promise<SearchResult[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.functions.invoke<{
    scores: { id: string; score: number | null }[];
    error?: string;
  }>("rerank", {
    body: {
      query,
      // Base64 for the same reason as embeddings: passage text can legitimately
      // contain SQL or HTML that the WAF would otherwise reject.
      candidates: candidates.map((c) => ({
        id: c.chunk_id,
        text_b64: Buffer.from(c.content, "utf8").toString("base64"),
      })),
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.scores?.length) throw new Error("rerank returned no scores");

  const scoreById = new Map(data.scores.map((s) => [s.id, s.score]));

  // Passages the model skipped keep their hybrid position: they sort after
  // everything it did score, in their original order.
  return [...candidates]
    .map((c, i) => ({ result: c, score: scoreById.get(c.chunk_id) ?? null, original: i }))
    .sort((a, b) => {
      if (a.score === null && b.score === null) return a.original - b.original;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score || a.original - b.original;
    })
    .slice(0, limit)
    .map((entry) => entry.result);
}

// Hybrid (vector + full-text) search, scoped to whichever projects the user
// can actually access — either one specific project (access-checked) or
// every project they belong to. Results are then reordered by a rerank pass,
// which falls back to the hybrid order if it fails.
export async function search(
  userId: string,
  query: string,
  projectId?: string,
  limit = 10
): Promise<SearchResult[]> {
  let projectIds: string[];

  if (projectId) {
    await requireProjectAccess(userId, projectId, "reader");
    projectIds = [projectId];
  } else {
    const projects = await listProjectsForUser(userId);
    projectIds = projects.map((p) => p.id);
  }

  if (projectIds.length === 0) return [];

  const [embedding] = await embedTexts([query]);

  const candidateCount = rerankEnabled
    ? Math.min(Math.max(limit * CANDIDATE_MULTIPLIER, MIN_CANDIDATES), MAX_CANDIDATES)
    : limit;

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("search_chunks", {
    p_project_ids: projectIds,
    p_query: query,
    p_query_embedding: embedding,
    p_match_count: candidateCount,
  });

  if (error) throw new Error(error.message);

  const candidates = (data ?? []) as SearchResult[];
  if (!rerankEnabled || candidates.length <= 1) return candidates.slice(0, limit);

  try {
    return await rerank(query, candidates, limit);
  } catch (err) {
    console.error("Rerank failed, falling back to hybrid ranking:", err);
    return candidates.slice(0, limit);
  }
}

export interface ChunkDetail {
  chunk_id: string;
  project_id: string;
  path: string;
  chunk_index: number;
  content: string;
}

// Fetches full chunk text for ids returned by `search`. Search itself only
// returns short previews so an agent can triage results cheaply and pull the
// full text of just the ones it actually needs.
export async function getChunks(userId: string, chunkIds: string[]): Promise<ChunkDetail[]> {
  if (chunkIds.length === 0) return [];

  const projects = await listProjectsForUser(userId);
  const allowed = new Set(projects.map((p) => p.id));
  if (allowed.size === 0) return [];

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("chunks")
    .select("id, project_id, chunk_index, content, documents(path)")
    .in("id", chunkIds);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => allowed.has(row.project_id))
    .map((row) => ({
      chunk_id: row.id,
      project_id: row.project_id,
      path: (row.documents as unknown as { path: string } | null)?.path ?? "",
      chunk_index: row.chunk_index,
      content: row.content,
    }))
    .sort((a, b) => a.path.localeCompare(b.path) || a.chunk_index - b.chunk_index);
}
