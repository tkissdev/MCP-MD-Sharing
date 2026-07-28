"use server";

import { getServerClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { getProjectRole } from "@/lib/permissions";

// A project's members must already belong to its organization — this lists
// that organization's members, minus whoever is already a project member, so
// the dropdown only ever offers valid, not-yet-added choices.
export async function listProjectCandidateUsers(projectId: string): Promise<string[]> {
  const sessionClient = await getServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const role = await getProjectRole(user.id, projectId);
  if (role !== "admin") throw new Error("Requires admin access to this project");

  const admin = getServiceClient();
  const { data: project } = await admin.from("projects").select("organization_id").eq("id", projectId).maybeSingle();
  if (!project) throw new Error("Project not found");

  // list_org_members enforces its own caller-based permission check, so this
  // must run through the visitor's own session, not the service role.
  const { data: orgMembers, error } = await sessionClient.rpc("list_org_members", {
    p_org_id: project.organization_id,
  });
  if (error) throw new Error(error.message);

  const { data: projectMembers } = await admin.from("project_members").select("user_id").eq("project_id", projectId);
  const existingIds = new Set((projectMembers ?? []).map((m) => m.user_id));

  return (orgMembers ?? [])
    .filter((m: { user_id: string; email: string }) => !existingIds.has(m.user_id))
    .map((m: { email: string }) => m.email)
    .sort((a: string, b: string) => a.localeCompare(b));
}
