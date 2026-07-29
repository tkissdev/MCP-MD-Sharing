"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase-server";
import { reindexDocumentSafe } from "@/lib/indexing";
import { VersionConflictError } from "@/lib/documents";

export async function createDocumentAction(projectId: string, path: string, content: string, message?: string) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

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
    author_id: user.id,
  });
  if (versionError) throw new Error(versionError.message);

  await reindexDocumentSafe(projectId, doc.id, 1, content);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateDocumentAction(
  projectId: string,
  path: string,
  content: string,
  expectedVersion: number,
  message?: string
) {
  const supabase = await getServerClient();

  const { data: doc, error: docLookupError } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("path", path)
    .single();
  if (docLookupError) throw new Error(docLookupError.message);

  const { data, error } = await supabase.rpc("save_document_version_as_user", {
    p_document_id: doc.id,
    p_expected_version: expectedVersion,
    p_content: content,
    p_message: message ?? null,
  });
  if (error) {
    if (error.message.startsWith("VERSION_CONFLICT:")) {
      const conflictVersion = Number(error.message.split(":")[1]);
      const { data: latest } = await supabase
        .from("versions")
        .select("content")
        .eq("document_id", doc.id)
        .eq("version_number", conflictVersion)
        .single();
      throw new VersionConflictError(conflictVersion, latest?.content ?? "");
    }
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  await reindexDocumentSafe(projectId, doc.id, row.version_number, content);
  revalidatePath(`/projects/${projectId}/docs/${path}`);
  return row.version_number as number;
}

export async function restoreVersionAction(
  projectId: string,
  path: string,
  versionNumber: number,
  expectedVersion: number
) {
  const supabase = await getServerClient();

  const { data: doc, error: docLookupError } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("path", path)
    .single();
  if (docLookupError) throw new Error(docLookupError.message);

  const { data: oldVersion, error: oldVersionError } = await supabase
    .from("versions")
    .select("content")
    .eq("document_id", doc.id)
    .eq("version_number", versionNumber)
    .single();
  if (oldVersionError) throw new Error(oldVersionError.message);

  return updateDocumentAction(
    projectId,
    path,
    oldVersion.content,
    expectedVersion,
    `Restored from version ${versionNumber}`
  );
}
