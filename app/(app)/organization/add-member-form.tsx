"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { formatAddMemberError } from "@/lib/member-errors";
import { UserEmailPicker } from "./user-email-picker";
import { useLocale } from "../locale-context";

export function AddOrgMemberForm({ orgId, onChanged }: { orgId: string; onChanged?: () => void }) {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await getBrowserClient().rpc("add_org_member", {
      p_org_id: orgId,
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
        <UserEmailPicker orgId={orgId} value={email} onChange={setEmail} />
      </label>
      <label>
        {t("org.role")}
        <br />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="member">{t("role.member")}</option>
          <option value="admin">{t("role.admin")}</option>
          <option value="owner">{t("role.owner")}</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {t("org.addMember")}
      </button>
    </form>
  );
}
