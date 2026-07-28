"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "../locale-context";

export function NewProjectForm({ orgs }: { orgs: { id: string; name: string }[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserClient();
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ organization_id: orgId, name })
      .select("id")
      .single();

    if (error) {
      setLoading(false);
      setError(error.message);
      toast.error(error.message);
      return;
    }

    // The creator becomes a project admin so they can manage it right away.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("project_members").insert({ project_id: project.id, user_id: user!.id, role: "admin" });

    setLoading(false);
    toast.success(t("toast.projectCreated"));
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {t("projects.organization")}
        <br />
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("projects.name")}
        <br />
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {t("projects.create")}
      </button>
    </form>
  );
}
