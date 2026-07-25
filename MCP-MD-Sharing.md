# MCP-MD-Sharing

A platform for sharing and managing Markdown documentation across teams — accessible both through a web app and directly from AI coding agents (Claude Code, Cursor, Codex...) via the Model Context Protocol (MCP).

**Live app:** https://mcp-md-sharing.vercel.app
**Repository:** https://github.com/timothekiss/MCP-MD-Sharing

## What it does

- Organizations contain projects, projects contain `.md` documents.
- Every save creates a new immutable version — full history, diff comparison, and one-click restore.
- Documents are searchable by meaning (not just keywords) via a RAG pipeline.
- Everything accessible from the web app is also accessible from an AI coding agent through a single MCP server, using the exact same permissions.

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
- **Database / Auth:** Supabase (Postgres + Row Level Security + Auth + pgvector)
- **Embeddings:** OpenAI `text-embedding-3-small`, called through a Supabase Edge Function (the OpenAI key never lives in this app's own environment)
- **MCP transport:** Streamable HTTP, via the `mcp-handler` package
- **Diffing:** the `diff` npm package (character-level diff for version comparison)

## Data model

```
organizations ──┬── memberships (user + org-level role: owner/admin/member)
                └── projects ──┬── project_members (user + project-level role: reader/editor/admin)
                               └── documents ──┬── versions (immutable, full content per save)
                                               └── chunks (text pieces + embeddings, for search)
api_keys (personal, hashed, revocable — used for MCP authentication)
```

## Permissions model

- **Org roles:** owner, admin, member. Org owners/admins can manage the org and see/administer every project in it.
- **Project roles:** reader, editor, admin. Set per person, per project.
- All of this is enforced by Postgres RLS policies (web app, using the visitor's own session) and mirrored in application code (MCP server, using a service role plus explicit permission checks) — both paths compute access the same way.

## MCP server

**Endpoint:** `https://mcp-md-sharing.vercel.app/api/mcp`
**Auth:** personal API key (generate one from the web app's "API Keys" page), sent as `Authorization: Bearer <key>`

Tools exposed to agents:

| Tool | Description |
|---|---|
| `list_projects` | List the projects the caller can access |
| `list_documents` | List the documents in a project |
| `read_document` | Read the current version of a document |
| `create_document` | Create a new document |
| `update_document` | Save a new version (requires `expected_version` — optimistic locking, returns a `VERSION_CONFLICT` with the latest content if someone else saved first) |
| `get_history` | List a document's version history |
| `get_version` | Read a specific historical version |
| `restore_version` | Restore an old version as a new current version |
| `search` | Hybrid semantic + keyword search, scoped to accessible projects |

Connect from Claude Code:
```
claude mcp add --transport http mcp-md-sharing https://mcp-md-sharing.vercel.app/api/mcp --header "Authorization: Bearer <your-api-key>"
```

## Web app features

- Email/password sign-up and sign-in
- Organizations: create, invite members with a role (owner/admin/member)
- Projects: create, invite members with a role (reader/editor/admin)
- Documents: create, edit, upload `.md` files (drag-and-drop or file picker, single or multiple)
- Version history: view any past version, side-by-side compare two versions with character-level colored diff (green = identical, red = removed, orange = added/modified), restore
- Search: hybrid semantic + keyword search across every accessible project, filterable by project
- Personal API keys: create, copy once, revoke
- Collapsible sidebar (state persists)
- French / English language switcher — the choice is saved on the user's own account, so it follows them across sign-out/sign-in

## Versioning & conflict handling

Every save is a new row in `versions` — nothing is ever overwritten. Concurrent edits are handled with optimistic locking: the caller states which version they're editing from (`expected_version`); if someone else has already saved a newer version, the save is rejected and the latest content is returned so the change can be merged before retrying.

## Search (RAG)

1. On every save, a document is split into ~500-word chunks along `##` section boundaries (falls back to plain word-count splitting for files without headers).
2. Each chunk is embedded via OpenAI, through a Supabase Edge Function that holds the API key (kept out of this app's own environment).
3. Chunks + embeddings are stored in `pgvector`.
4. Search combines vector similarity and Postgres full-text search (reciprocal rank fusion), filtered to the projects the caller can access.
5. Indexing is best-effort: if the embedding call fails, the previous index is left in place rather than removed, so search keeps working with a slightly stale result while the document itself still saves normally.

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | server | |
| `SUPABASE_SERVICE_ROLE_KEY` | server (MCP server, server actions) | secret — never exposed to the browser |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | public by design, protected by RLS |

The OpenAI API key is **not** an env var of this app — it's stored only as a secret on the Supabase Edge Function (`embed`).

## Deployment

- **Host:** Vercel (project: `mcp-md-sharing`, team: `timothekiss-1303s-projects`)
- **Database:** Supabase project `MCP-MD-Sharing` (ref `jywrkiztkwxmcrwsruzf`), in the `Timo's Org` Supabase organization
- Deploy with `vercel --prod` after pushing to `main`
