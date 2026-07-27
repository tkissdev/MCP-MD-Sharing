"use server";

import { getServerClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

// Only people who already have an account can be added as a member — this
// searches existing Supabase Auth users by email so the picker only ever
// offers valid choices, instead of a free-text field that fails after the
// fact with "no account exists for this email".
export async function searchOrgCandidateUsers(orgId: string, query: string): Promise<string[]> {
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

  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const admin = getServiceClient();
  const { data: userList, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);

  const { data: existingMembers } = await admin.from("memberships").select("user_id").eq("organization_id", orgId);
  const existingIds = new Set((existingMembers ?? []).map((m) => m.user_id));

  return userList.users
    .filter((u) => u.email && u.email.toLowerCase().includes(q) && !existingIds.has(u.id))
    .slice(0, 8)
    .map((u) => u.email!);
}
