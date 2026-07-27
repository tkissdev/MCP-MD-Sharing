"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

// No database RPC exists for renaming or deleting an organization (only
// membership/project RPCs do) — same situation as project rename/delete, so
// the same pattern applies: check permission in application code, then write
// through the service-role client.
async function requireOrgOwner(orgId: string): Promise<string> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner") throw new Error("Requires owner access to this organization");
  return user.id;
}

export async function renameOrganizationAction(orgId: string, name: string) {
  await requireOrgOwner(orgId);
  const supabase = getServiceClient();

  const { error } = await supabase.from("organizations").update({ name }).eq("id", orgId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization");
}

export async function deleteOrganizationAction(orgId: string) {
  await requireOrgOwner(orgId);
  const supabase = getServiceClient();

  const { data: projects } = await supabase.from("projects").select("id").eq("organization_id", orgId);
  const projectIds = (projects ?? []).map((p) => p.id);

  if (projectIds.length > 0) {
    const { data: docs } = await supabase.from("documents").select("id").in("project_id", projectIds);
    const docIds = (docs ?? []).map((d) => d.id);

    if (docIds.length > 0) {
      await supabase.from("chunks").delete().in("document_id", docIds);
      await supabase.from("versions").delete().in("document_id", docIds);
      await supabase.from("documents").delete().in("id", docIds);
    }
    await supabase.from("project_members").delete().in("project_id", projectIds);
    await supabase.from("projects").delete().in("id", projectIds);
  }

  await supabase.from("memberships").delete().eq("organization_id", orgId);

  const { error } = await supabase.from("organizations").delete().eq("id", orgId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization");
  revalidatePath("/projects");
}
