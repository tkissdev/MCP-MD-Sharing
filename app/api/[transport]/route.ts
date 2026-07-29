import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyApiKey } from "@/lib/auth";
import { requireProjectAccess } from "@/lib/permissions";
import {
  createDocument,
  getHistory,
  getVersion,
  listDocuments,
  listProjectsForUser,
  readDocument,
  restoreVersion,
  updateDocument,
  VersionConflictError,
} from "@/lib/documents";
import { getChunks, search } from "@/lib/search";

// Search returns previews, not full passages: an agent scanning 10 hits should
// pay for a page of text, not ten. Full text comes from get_chunks on demand.
const PREVIEW_CHARS = 180;

function preview(content: string) {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length <= PREVIEW_CHARS ? flat : `${flat.slice(0, PREVIEW_CHARS)}…`;
}

function conflictResult(err: VersionConflictError) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error: "VERSION_CONFLICT",
            current_version: err.currentVersion,
            current_content: err.currentContent,
            hint: "Merge your changes into current_content, then retry with expected_version=current_version.",
          },
          null,
          2
        ),
      },
    ],
  };
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "list_projects",
      "List the projects you can access, with their ids. Start here when you don't yet " +
        "have a project_id — every other tool needs one. Returns id, name, and organization_id.",
      {},
      async (_args, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        const projects = await listProjectsForUser(userId);
        return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
      }
    );

    server.tool(
      "list_documents",
      "List every document in a project, with its path and current version number. " +
        "Use it to see what exists before creating a document (paths are unique per " +
        "project), or to pick a path to read. To find information by topic rather than " +
        "by filename, use search instead.\n\n" +
        "search_index_stale: true means the document was saved but its search index " +
        "hasn't caught up yet, so search may not surface its newest content — read_document " +
        "still returns the current text.",
      { project_id: z.string().uuid() },
      async ({ project_id }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        await requireProjectAccess(userId, project_id, "reader");
        const docs = await listDocuments(project_id);
        return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] };
      }
    );

    server.tool(
      "read_document",
      "Read a document's current content in full, by its exact path (e.g. " +
        "\"plugin/graphify.md\"). Returns the content plus its version_number — keep that " +
        "number: update_document requires it as expected_version.\n\n" +
        "If you don't know the exact path, use list_documents or search first.",
      { project_id: z.string().uuid(), path: z.string() },
      async ({ project_id, path }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        await requireProjectAccess(userId, project_id, "reader");
        const doc = await readDocument(project_id, path);
        return { content: [{ type: "text", text: JSON.stringify(doc, null, 2) }] };
      }
    );

    server.tool(
      "create_document",
      "Create a new Markdown document. Fails if the path already exists in this project — " +
        "use update_document to change an existing one.\n\n" +
        "path: forward-slash path including the .md extension, e.g. \"notes/meeting.md\". " +
        "Folders are implied by the path; there is nothing to create separately.\n" +
        "message: short description of what this version contains (shown in the history).",
      {
        project_id: z.string().uuid(),
        path: z.string(),
        content: z.string(),
        message: z.string().optional(),
      },
      async ({ project_id, path, content, message }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        await requireProjectAccess(userId, project_id, "editor");
        const result = await createDocument(project_id, path, content, userId, message);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    server.tool(
      "update_document",
      "Save a new version of an existing document. Send the complete new content — this " +
        "replaces the document, it does not append or patch.\n\n" +
        "expected_version: the version_number you got from read_document. If someone else " +
        "saved in the meantime, this returns VERSION_CONFLICT with the current content and " +
        "version instead of overwriting their work: merge your changes into that content and " +
        "retry with the version it gives you.\n" +
        "message: short description of the change (shown in the history).",
      {
        project_id: z.string().uuid(),
        path: z.string(),
        content: z.string(),
        expected_version: z.number().int().positive(),
        message: z.string().optional(),
      },
      async ({ project_id, path, content, expected_version, message }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        await requireProjectAccess(userId, project_id, "editor");
        try {
          const result = await updateDocument(project_id, path, content, userId, expected_version, message);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          if (err instanceof VersionConflictError) return conflictResult(err);
          throw err;
        }
      }
    );

    server.tool(
      "get_history",
      "List a document's past versions — version_number, message, author and date only, " +
        "not the content itself. Use it to find which version to inspect, then get_version " +
        "to read one, or restore_version to bring one back.",
      { project_id: z.string().uuid(), path: z.string(), limit: z.number().int().positive().max(100).optional() },
      async ({ project_id, path, limit }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        await requireProjectAccess(userId, project_id, "reader");
        const history = await getHistory(project_id, path, limit);
        return { content: [{ type: "text", text: JSON.stringify(history, null, 2) }] };
      }
    );

    server.tool(
      "get_version",
      "Read the full content of one past version, as it was at that point. Use get_history " +
        "first to see which version numbers exist. This is read-only and does not change " +
        "the current version.",
      { project_id: z.string().uuid(), path: z.string(), version_number: z.number().int().positive() },
      async ({ project_id, path, version_number }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        await requireProjectAccess(userId, project_id, "reader");
        const version = await getVersion(project_id, path, version_number);
        return { content: [{ type: "text", text: JSON.stringify(version, null, 2) }] };
      }
    );

    server.tool(
      "restore_version",
      "Bring back an old version's content as a new version on top of the history. Nothing " +
        "is deleted or rewritten — the versions in between stay readable.\n\n" +
        "version_number: the old version to restore, from get_history.\n" +
        "expected_version: the current version_number, same conflict protection as " +
        "update_document.",
      {
        project_id: z.string().uuid(),
        path: z.string(),
        version_number: z.number().int().positive(),
        expected_version: z.number().int().positive(),
      },
      async ({ project_id, path, version_number, expected_version }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        await requireProjectAccess(userId, project_id, "editor");
        try {
          const result = await restoreVersion(project_id, path, version_number, userId, expected_version);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          if (err instanceof VersionConflictError) return conflictResult(err);
          throw err;
        }
      }
    );

    server.tool(
      "search",
      "Find passages across MD documents. Use this first whenever you need to locate " +
        "information but don't already know which document holds it — it is much cheaper " +
        "than reading documents one by one.\n\n" +
        "Combines meaning-based and keyword search, then reranks the results, so it works " +
        "with natural-language questions (\"how do I rotate an API key\") as well as exact " +
        "terms. Queries in French and English both work.\n\n" +
        "Returns a compact index only: each hit has a chunk_id, the document path, and a " +
        "short preview. Call get_chunks with the chunk_ids that look relevant to read their " +
        "full text, or read_document to open the whole document.\n\n" +
        "project_id: restrict to one project; omit it to search every project you can access.\n" +
        "limit: how many hits to return (default 10).",
      {
        query: z.string(),
        project_id: z.string().uuid().optional(),
        limit: z.number().int().positive().max(50).optional(),
      },
      async ({ query, project_id, limit }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        const results = await search(userId, query, project_id, limit);

        const index = results.map((r) => ({
          chunk_id: r.chunk_id,
          project_id: r.project_id,
          path: r.path,
          chunk_index: r.chunk_index,
          preview: preview(r.content),
          score: Number(r.score.toFixed(5)),
        }));

        return { content: [{ type: "text", text: JSON.stringify(index, null, 2) }] };
      }
    );

    server.tool(
      "get_chunks",
      "Read the full text of specific passages returned by search. Pass the chunk_ids you " +
        "care about — batch them into a single call rather than one call per id.\n\n" +
        "Use this when search previews look relevant but are too short to answer from. " +
        "Use read_document instead when you need the whole document rather than the " +
        "matching passages.",
      { chunk_ids: z.array(z.string().uuid()).min(1).max(50) },
      async ({ chunk_ids }, extra) => {
        const userId = extra.authInfo!.extra!.userId as string;
        const chunks = await getChunks(userId, chunk_ids);
        return { content: [{ type: "text", text: JSON.stringify(chunks, null, 2) }] };
      }
    );
  },
  {},
  { basePath: "/api" }
);

const authHandler = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    const authHeader = bearerToken ? `Bearer ${bearerToken}` : null;
    const user = await verifyApiKey(authHeader);
    if (!user) return undefined;

    return {
      token: bearerToken!,
      clientId: user.userId,
      scopes: ["mcp"],
      extra: { userId: user.userId, apiKeyId: user.apiKeyId },
    };
  },
  { required: true }
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
