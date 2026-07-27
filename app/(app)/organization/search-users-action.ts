"use server";

import { getServerClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

// Only people who already have an account can be added as a member — this
// lists existing Supabase Auth users (minus those already in the org) so the
// dropdown only ever offers valid, not-yet-added choices.
export async function listOrgCandidateUsers(orgId: string): Promise<string[]> {
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
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Requires owner or admin access to this organization");
  }

  const admin = getServiceClient();
  const { data: userList, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);

  const { data: existingMembers } = await admin.from("memberships").select("user_id").eq("organization_id", orgId);
  const existingIds = new Set((existingMembers ?? []).map((m) => m.user_id));

  return userList.users
    .filter((u) => u.email && !existingIds.has(u.id))
    .map((u) => u.email!)
    .sort((a, b) => a.localeCompare(b));
}
