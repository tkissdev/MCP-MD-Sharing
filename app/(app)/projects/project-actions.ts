"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { getProjectRole } from "@/lib/permissions";

// These three actions have no dedicated RPC in the database (only reads and
// document/version writes go through RPCs) — permission is checked here in
// application code, exactly like the MCP server does, then the service role
// client performs the write. Restricted to project admins (which already
// covers org owners/admins, per getProjectRole's resolution order).
async function requireProjectAdmin(projectId: string): Promise<string> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const role = await getProjectRole(user.id, projectId);
  if (role !== "admin") throw new Error("Requires admin access to this project");
  return user.id;
}

export async function renameProjectAction(projectId: string, name: string) {
  await requireProjectAdmin(projectId);
  const supabase = getServiceClient();

  const { error } = await supabase.from("projects").update({ name }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function moveProjectOrgAction(projectId: string, organizationId: string) {
  const userId = await requireProjectAdmin(projectId);
  const supabase = getServiceClient();

  // Also require owner/admin of the *destination* org, so a project admin
  // can't move a project into an organization they don't control.
  const { data: destMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!destMembership || !["owner", "admin"].includes(destMembership.role)) {
    throw new Error("You must be an owner or admin of the destination organization");
  }

  const { error } = await supabase.from("projects").update({ organization_id: organizationId }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function deleteProjectAction(projectId: string) {
  await requireProjectAdmin(projectId);
  const supabase = getServiceClient();

  const { data: docs } = await supabase.from("documents").select("id").eq("project_id", projectId);
  const docIds = (docs ?? []).map((d) => d.id);

  if (docIds.length > 0) {
    await supabase.from("chunks").delete().in("document_id", docIds);
    await supabase.from("versions").delete().in("document_id", docIds);
    await supabase.from("documents").delete().in("id", docIds);
  }
  await supabase.from("project_members").delete().eq("project_id", projectId);

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}
