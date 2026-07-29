# MCP-MD-Sharing

A platform for sharing and managing Markdown documentation across teams — accessible both through a web app and directly from AI coding agents (Claude Code, Cursor, Codex...) via the Model Context Protocol (MCP).

**Live app:** https://mcp-md-sharing.tkissdev.com
**Repository:** https://github.com/timothekiss/MCP-MD-Sharing
**Current version:** 0.27.0

## What it does

- Organizations contain projects, projects contain `.md` documents.
- Every save creates a new immutable version — full history, diff comparison, and one-click restore.
- Documents are searchable by meaning (not just keywords) via a hybrid RAG pipeline with reranking.
- Everything accessible from the web app is also accessible from an AI coding agent through a single MCP server, using the exact same permissions.
- The web app's projects list and document drawer update live — changes made anywhere (another tab, another user, the MCP server) appear without a manual refresh.

## Architecture

Two façades share one Supabase database — all access rules live in the database itself (Row Level Security), so neither façade can bypass permissions:

```
Coding agents (Claude, Codex, Cursor)
        │  MCP protocol over HTTP
        ▼
┌─────────────────┐      ┌──────────────────────┐
│  MCP server     │◄────►│  Supabase (Postgres) │◄────►│  Admin web app  │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
```

## Tech stack

- **Language:** TypeScript everywhere
- **Framework:** Next.js (App Router), deployed on Vercel
- **Database / Auth:** Supabase (Postgres + Row Level Security + Auth + pgvector 0.8.2 + Realtime)
- **Embeddings:** OpenAI `text-embedding-3-small`, called through a Supabase Edge Function (the OpenAI key never lives in this app's own environment)
- **Reranking:** a second Edge Function (`rerank`) asks a fast chat model (`gpt-4o-mini` by default) to re-score hybrid-search candidates against the query
- **MCP transport:** Streamable HTTP, via the `mcp-handler` package
- **Diffing:** the `diff` npm package (character-level diff for version comparison)

## Data model

```
organizations ──┬── memberships (user + org-level role: owner/admin/member)
                └── projects ──┬── project_members (user + project-level role: reader/editor/admin)
                               └── documents ──┬── versions (immutable, full content per save)
                                               └── chunks (project_id, text piece, embedding, content_hash — for search)
api_keys (personal, hashed, revocable — used for MCP authentication)
```

`chunks.project_id` is denormalized from `documents` so search can filter by accessible project directly during the index scan, instead of through a join after the fact (the join used to silently starve the vector search of results once there were many projects).

## Permissions model

- **Org roles:** owner, admin, member. Org owners/admins can manage the org and see/administer every project in it.
- **Project roles:** reader, editor, admin. Set per person, per project.
- All of this is enforced by Postgres RLS policies (web app, using the visitor's own session) and mirrored in application code (MCP server, using a service role plus explicit permission checks) — both paths compute access the same way.
- Realtime subscriptions (postgres_changes) are also RLS-gated: a browser tab only receives change notifications for rows it could `SELECT` anyway, and needs its auth token explicitly attached to the socket before subscribing (`supabase.realtime.setAuth`) or every change is silently filtered out as if no one were signed in.

## MCP server

**Endpoint:** `https://mcp-md-sharing.tkissdev.com/api/mcp`
**Auth:** personal API key (generate one from the web app's "API Keys" page), sent as `Authorization: Bearer <key>`

Tools exposed to agents:

| Tool | Description |
|---|---|
| `list_projects` | List the projects the caller can access, with their ids |
| `list_documents` | List the documents in a project, with a `search_index_stale` flag per document |
| `read_document` | Read the current version of a document |
| `create_document` | Create a new document |
| `update_document` | Save a new version (requires `expected_version` — optimistic locking, returns a `VERSION_CONFLICT` with the latest content if someone else saved first) |
| `get_history` | List a document's version history |
| `get_version` | Read a specific historical version |
| `restore_version` | Restore an old version as a new current version |
| `search` | Hybrid semantic + keyword search with reranking, scoped to accessible projects — returns a compact index (path, chunk_id, short preview, score), not full passages |
| `get_chunks` | Fetch the full text of specific chunk_ids returned by `search` — the second step of the progressive-disclosure pattern, batched instead of one call per id |

Tool descriptions were rewritten to state *when* to use each tool and what each parameter means, not just what it returns — that's the only thing an agent reads to decide whether to call a tool.

Connect from Claude Code:
```
claude mcp add --transport http mcp-md-sharing https://mcp-md-sharing.tkissdev.com/api/mcp --header "Authorization: Bearer <your-api-key>"
```

### Untrusted content handling

Any workspace member can write text that another member's AI agent later reads through these tools — a shared project is effectively a place other people can plant text for your agent to see. Every tool result that carries user-written content (`search`, `get_chunks`, `read_document`, `get_version`, `get_history`, `list_documents`, and the `VERSION_CONFLICT` payload) is wrapped in a boundary tagged with a random id and an explicit instruction not to follow anything inside it. The random id stops planted text from guessing and closing the fence early to escape the boundary. The `rerank` Edge Function gets the same treatment: its system prompt states the passages are untrusted content, not instructions, and they're fenced with their own random-id boundary in the request sent to the model.

This was verified against a real hostile document (a prompt-injection payload plus a forged closing tag) and against a reranker probe where a passage demanded a 10/10 score for itself — both were correctly treated as inert data, not instructions.

## Web app features

- Email/password sign-up and sign-in (with a confirm-email flow: an info toast plus an automatic switch to the sign-in view, keeping the typed email/password so the user doesn't retype them)
- Organizations: create, invite members with a role (owner/admin/member)
- Projects: create, invite members with a role (reader/editor/admin) — creating a project stays on the list view and opens its drawer automatically instead of navigating away
- Documents: create, edit, upload `.md` files (drag-and-drop or file picker, single or multiple)
- Version history: view any past version, side-by-side compare two versions with character-level colored diff (green = identical, red = removed, orange = added/modified), restore
- Search: hybrid semantic + keyword search with reranking, across every accessible project, filterable by project
- Personal API keys: create, copy once, revoke
- Collapsible sidebar (state persists)
- French / English language switcher — the choice is saved on the user's own account, so it follows them across sign-out/sign-in
- Live updates: the projects list and open document drawer refresh automatically via Supabase Realtime whenever a project or document changes anywhere — no manual reload needed
- No document deletion yet (project deletion exists; documents currently accumulate — a gap to close if it becomes a problem)

## Versioning & conflict handling

Every save is a new row in `versions` — nothing is ever overwritten. Concurrent edits are handled with optimistic locking: the caller states which version they're editing from (`expected_version`); if someone else has already saved a newer version, the save is rejected and the latest content is returned so the change can be merged before retrying.

## Search (RAG)

1. On every save, a document is chunked along `##` section boundaries, then packed into ~1200-character pieces. A paragraph is kept whole whenever it fits the budget; only an oversized paragraph is broken down further (lines, then sentences) — a sentence is never split across two chunks. The section heading is prepended to every chunk as context and does not eat into the content budget.
2. Each new or changed chunk is embedded via OpenAI (`text-embedding-3-small`), through a Supabase Edge Function that holds the API key. Chunks whose text is byte-identical to one already indexed for that document reuse the existing embedding instead of paying for a new one. Texts are sent base64-encoded — the WAF in front of Edge Functions otherwise rejects request bodies containing things like `'; DROP TABLE` or `<script>`, which show up naturally in documentation about SQL or HTML.
3. Chunks + embeddings + a content hash are stored in `pgvector`, with `project_id` denormalized onto the row for direct filtering.
4. `search_chunks` (Postgres function) combines vector similarity and full-text search (reciprocal rank fusion), filtered to the projects the caller can access. Full-text search indexes both French and English (`to_tsvector('french', content) || to_tsvector('english', content)`), so a French document is still found by an English query and vice versa. `hnsw.ef_search` is raised to 120 with iterative scan enabled at query time, so the project filter doesn't starve the HNSW index of candidates the way the previous default (40) did.
5. The top candidates are reranked by the `rerank` Edge Function (a chat model scores each passage against the query 0–10); results fall back to the hybrid-search order if reranking fails for any reason. Set `SEARCH_RERANK=off` to disable it.
6. Indexing is best-effort: if the embedding call fails, the previous index is left in place rather than removed, so search keeps working with a slightly stale result while the document itself still saves normally. `list_documents` exposes a `search_index_stale` flag (comparing the chunks' `version_number` to the document's `current_version`) so staleness is visible instead of silent.
7. `scripts/reindex-all.mjs` rebuilds every document's chunks from scratch (run after changing chunking rules or the embedding model) — it imports `lib/chunking.ts` directly rather than duplicating the logic, so the script can't drift from what the app itself uses.

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | server | |
| `SUPABASE_SERVICE_ROLE_KEY` | server (MCP server, server actions) | secret — never exposed to the browser |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | public by design, protected by RLS |
| `SEARCH_RERANK` | server | optional; set to `off` to skip the reranking pass |

The OpenAI API key is **not** an env var of this app — it's stored only as a secret on the Supabase Edge Functions (`embed`, `rerank`).

## Deployment

- **Host:** Vercel (project: `mcp-md-sharing`, team: `timothekiss-1303s-projects`)
- **Database:** Supabase project `MCP-MD-Sharing` (ref `jywrkiztkwxmcrwsruzf`), in the `Timo's Org` Supabase organization
- Deploy with `vercel --prod` after pushing to `main`
- After a schema migration or a change to `embed`/`rerank`, redeploy the affected Edge Function(s) as well — they ship independently of the Next.js app
