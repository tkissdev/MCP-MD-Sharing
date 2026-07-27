"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { formatAddMemberError } from "@/lib/member-errors";
import { useLocale } from "../../../locale-context";

export function AddProjectMemberForm({
  projectId,
  onChanged,
}: {
  projectId: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("reader");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await getBrowserClient().rpc("add_project_member", {
      p_project_id: projectId,
      p_email: email,
      p_role: role,
    });

    setLoading(false);
    if (error) {
      setError(formatAddMemberError(error.message, t));
      return;
    }

    setEmail("");
    router.refresh();
    onChanged?.();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {t("org.email")}
        <br />
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        {t("org.role")}
        <br />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="reader">{t("role.reader")}</option>
          <option value="editor">{t("role.editor")}</option>
          <option value="admin">{t("role.admin")}</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {t("members.add")}
      </button>
    </form>
  );
}
