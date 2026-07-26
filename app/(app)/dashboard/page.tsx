import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/dictionary";
import { CreateOrgForm } from "../create-org-form";

export default async function DashboardPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = getLocale(user);

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user!.id)
    .limit(1);

  if (memberships && memberships.length > 0) {
    redirect("/projects");
  }

  return (
    <>
      <h1>{t(locale, "home.welcome")}</h1>
      <p className="muted">{t(locale, "home.notInOrg")}</p>
      <CreateOrgForm redirectTo="/projects" />
    </>
  );
}
