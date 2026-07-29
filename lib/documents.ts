import { getServiceClient } from "./supabase";
import { reindexDocumentSafe } from "./indexing";

export async function listProjectsForUser(userId: string) {
  const supabase = getServiceClient();

  const { data: memberProjects } = await supabase
    .from("project_members")
    .select("project:projects(id, name, organization_id)")
    .eq("user_id", userId);

  const { data: adminOrgs } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"]);

  const orgIds = (adminOrgs ?? []).map((m) => m.organization_id);
  let adminProjects: { id: string; name: string; organization_id: string }[] = [];
  if (orgIds.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, organization_id")
      .in("organization_id", orgIds);
    adminProjects = data ?? [];
  }

  const seen = new Map<string, { id: string; name: string; organization_id: string }>();
  for (const row of memberProjects ?? []) {
    const p = row.project as unknown as { id: string; name: string; organization_id: string } | null;
    if (p) seen.set(p.id, p);
  }
  for (const p of adminProjects) seen.set(p.id, p);

  return Array.from(seen.values());
}

export async function listDocuments(projectId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, path, current_version, created_at")
    .eq("project_id", projectId)
    .order("path");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return data;

  // Reindexing is best-effort, so a document can be saved while its search
  // chunks stay behind. Surface that instead of silently serving old text:
  // the chunks keep the version_number they were built from.
  const { data: chunkVersions } = await supabase
    .from("chunks")
    .select("document_id, version_number")
    .eq("project_id", projectId);

  const indexedVersion = new Map<string, number>();
  for (const row of chunkVersions ?? []) {
    const seen = indexedVersion.get(row.document_id);
    if (seen === undefined || row.version_number > seen) {
      indexedVersion.set(row.document_id, row.version_number);
    }
  }

  return data.map((doc) => ({
    ...doc,
    search_index_stale: (indexedVersion.get(doc.id) ?? 0) < doc.current_version,
  }));
}

export async function readDocument(projectId: string, path: string) {
  const supabase = getServiceClient();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, path, current_version")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();

  if (docError) throw new Error(docError.message);
  if (!doc) throw new Error(`Document not found: ${path}`);

  const { data: version, error: versionError } = await supabase
    .from("versions")
    .select("content, version_number, author_id, created_at, message")
    .eq("document_id", doc.id)
    .eq("version_number", doc.current_version)
    .single();

  if (versionError) throw new Error(versionError.message);

  return { path: doc.path, ...version };
}

export async function createDocument(
  projectId: string,
  path: string,
  content: string,
  authorId: string,
  message?: string
) {
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();

  if (existing) throw new Error(`Document already exists: ${path}`);

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({ project_id: projectId, path, current_version: 1 })
    .select("id")
    .single();

  if (docError) throw new Error(docError.message);

  const { error: versionError } = await supabase.from("versions").insert({
    document_id: doc.id,
    version_number: 1,
    content,
    message: message ?? "Initial version",
    author_id: authorId,
  });

  if (versionError) throw new Error(versionError.message);

  await reindexDocumentSafe(projectId, doc.id, 1, content);

  return { path, version_number: 1 };
}

export class VersionConflictError extends Error {
  currentVersion: number;
  currentContent: string;

  constructor(currentVersion: number, currentContent: string) {
    super(
      `Version conflict: the document is at version ${currentVersion}, not the expected version. ` +
        `Re-read the document, merge your changes into the latest content, and retry with expected_version=${currentVersion}.`
    );
    this.name = "VersionConflictError";
    this.currentVersion = currentVersion;
    this.currentContent = currentContent;
  }
}

async function findDocumentId(projectId: string, path: string): Promise<string> {
  const supabase = getServiceClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!doc) throw new Error(`Document not found: ${path}`);
  return doc.id;
}

export async function updateDocument(
  projectId: string,
  path: string,
  content: string,
  authorId: string,
  expectedVersion: number,
  message?: string
) {
  const supabase = getServiceClient();
  const documentId = await findDocumentId(projectId, path);

  const { data, error } = await supabase.rpc("save_document_version", {
    p_document_id: documentId,
    p_expected_version: expectedVersion,
    p_content: content,
    p_author_id: authorId,
    p_message: message ?? null,
  });

  if (error) {
    if (error.message.startsWith("VERSION_CONFLICT:")) {
      const currentVersion = Number(error.message.split(":")[1]);
      const latest = await readDocument(projectId, path);
      throw new VersionConflictError(currentVersion, latest.content);
    }
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  await reindexDocumentSafe(projectId, documentId, row.version_number, content);
  return { path, version_number: row.version_number };
}

export async function getHistory(projectId: string, path: string, limit = 20) {
  const supabase = getServiceClient();
  const documentId = await findDocumentId(projectId, path);

  const { data, error } = await supabase
    .from("versions")
    .select("version_number, message, author_id, created_at")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
}

export async function getVersion(projectId: string, path: string, versionNumber: number) {
  const supabase = getServiceClient();
  const documentId = await findDocumentId(projectId, path);

  const { data, error } = await supabase
    .from("versions")
    .select("version_number, content, message, author_id, created_at")
    .eq("document_id", documentId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Version ${versionNumber} not found for ${path}`);
  return { path, ...data };
}

export async function restoreVersion(
  projectId: string,
  path: string,
  versionNumber: number,
  authorId: string,
  expectedVersion: number
) {
  const old = await getVersion(projectId, path, versionNumber);
  return updateDocument(
    projectId,
    path,
    old.content,
    authorId,
    expectedVersion,
    `Restored from version ${versionNumber}`
  );
}
