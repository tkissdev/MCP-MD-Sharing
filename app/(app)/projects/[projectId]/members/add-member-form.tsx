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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = getBrowserClient();

    // add_project_member upserts the role rather than rejecting an existing
    // member — check first so re-adding someone already there shows a clear
    // message instead of silently changing their role.
    const { data: existing } = await supabase.rpc("list_project_members", { p_project_id: projectId });
    const alreadyMember = (existing ?? []).some(
      (m: { email: string }) => m.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (alreadyMember) {
      setLoading(false);
      setError(t("memberError.alreadyMember"));
      return;
    }

    const { error } = await supabase.rpc("add_project_member", {
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
    setSuccess(true);
    router.refresh();
    onChanged?.();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {t("org.email")}
        <br />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSuccess(false);
          }}
        />
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
      {success && <p className="success-msg">{t("org.memberAdded")}</p>}
      <button type="submit" disabled={loading}>
        {t("members.add")}
      </button>
    </form>
  );
}
