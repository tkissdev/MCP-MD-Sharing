import { getServerClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/dictionary";
import { ProjectsTable, type ProjectRow } from "./projects-table";
import type { ProjectRole } from "@/lib/permissions";

export default async function ProjectsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = getLocale(user);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, organization_id, created_at, organizations(name)")
    .order("name");

  const projectIds = (projects ?? []).map((p) => p.id);

  const { data: documents } = await supabase
    .from("documents")
    .select("id, project_id, path, current_version, created_at")
    .in("project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"])
    .order("path");

  const docIds = (documents ?? []).map((d) => d.id);

  const { data: versions } =
    docIds.length > 0
      ? await supabase.from("versions").select("document_id, created_at").in("document_id", docIds)
      : { data: [] as { document_id: string; created_at: string }[] };

  const { data: myProjectMemberships } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("user_id", user!.id);

  const { data: myOrgMemberships } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user!.id);

  const projectRoleMap = new Map((myProjectMemberships ?? []).map((m) => [m.project_id, m.role as ProjectRole]));
  const orgRoleMap = new Map((myOrgMemberships ?? []).map((m) => [m.organization_id, m.role]));

  const docsByProject = new Map<string, { id: string; path: string; current_version: number; created_at: string }[]>();
  for (const d of documents ?? []) {
    if (!docsByProject.has(d.project_id)) docsByProject.set(d.project_id, []);
    docsByProject.get(d.project_id)!.push(d);
  }

  const maxVersionByDoc = new Map<string, string>();
  for (const v of versions ?? []) {
    const cur = maxVersionByDoc.get(v.document_id);
    if (!cur || v.created_at > cur) maxVersionByDoc.set(v.document_id, v.created_at);
  }

  const rows: ProjectRow[] = (projects ?? []).map((p) => {
    const projectDocs = docsByProject.get(p.id) ?? [];

    let modifiedAt = p.created_at;
    for (const d of projectDocs) {
      if (d.created_at > modifiedAt) modifiedAt = d.created_at;
      const vMax = maxVersionByDoc.get(d.id);
      if (vMax && vMax > modifiedAt) modifiedAt = vMax;
    }

    let role: ProjectRole = projectRoleMap.get(p.id) ?? "reader";
    if (!projectRoleMap.has(p.id)) {
      const orgRole = orgRoleMap.get(p.organization_id);
      if (orgRole === "owner" || orgRole === "admin") role = "admin";
    }

    return {
      id: p.id,
      name: p.name,
      organizationId: p.organization_id,
      organizationName: (p.organizations as unknown as { name: string } | null)?.name ?? "Organization",
      fileCount: projectDocs.length,
      createdAt: p.created_at,
      modifiedAt,
      role,
      documents: projectDocs
        .map((d) => ({ id: d.id, path: d.path, currentVersion: d.current_version, createdAt: d.created_at }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    };
  });

  const adminOrgs = (myOrgMemberships ?? [])
    .filter((m) => m.role === "owner" || m.role === "admin")
    .map((m) => ({
      id: m.organization_id,
      name: (m.organizations as unknown as { name: string } | null)?.name ?? "Organization",
    }));

  return (
    <>
      <h1>{t(locale, "projects.title")}</h1>
      <ProjectsTable rows={rows} adminOrgs={adminOrgs} />
    </>
  );
}
