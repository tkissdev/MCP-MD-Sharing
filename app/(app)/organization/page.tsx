import { getServerClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/dictionary";
import { OrganizationsTable, type OrgRow } from "./organizations-table";

export default async function OrganizationPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = getLocale(user);

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name, created_at)")
    .eq("user_id", user!.id);

  const orgIds = (memberships ?? []).map((m) => m.organization_id);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, organization_id, created_at")
    .in("organization_id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"]);

  const projectsByOrg = new Map<string, { count: number; latestCreatedAt: string }>();
  for (const p of projects ?? []) {
    const entry = projectsByOrg.get(p.organization_id) ?? { count: 0, latestCreatedAt: p.created_at };
    entry.count += 1;
    if (p.created_at > entry.latestCreatedAt) entry.latestCreatedAt = p.created_at;
    projectsByOrg.set(p.organization_id, entry);
  }

  const rows: OrgRow[] = (memberships ?? []).map((m) => {
    const org = m.organizations as unknown as { name: string; created_at: string } | null;
    const projectInfo = projectsByOrg.get(m.organization_id);

    return {
      id: m.organization_id,
      name: org?.name ?? "Organization",
      role: m.role as "owner" | "admin" | "member",
      projectCount: projectInfo?.count ?? 0,
      createdAt: org?.created_at ?? new Date().toISOString(),
      // Best-effort "last modified": no updated_at column exists on
      // organizations, so this reflects the most recent project addition
      // (renames and membership changes aren't independently timestamped).
      modifiedAt:
        projectInfo && projectInfo.latestCreatedAt > (org?.created_at ?? "")
          ? projectInfo.latestCreatedAt
          : org?.created_at ?? new Date().toISOString(),
    };
  });

  return (
    <>
      <h1>{t(locale, "org.title")}</h1>
      <OrganizationsTable rows={rows} />
    </>
  );
}
