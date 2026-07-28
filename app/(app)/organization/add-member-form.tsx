"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase-browser";
import { formatAddMemberError } from "@/lib/member-errors";
import { listOrgCandidateUsers } from "./search-users-action";
import { useLocale } from "../locale-context";

export function AddOrgMemberForm({ orgId, onChanged }: { orgId: string; onChanged?: () => void }) {
  const router = useRouter();
  const { t } = useLocale();
  const [candidates, setCandidates] = useState<string[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, [orgId]);

  async function loadCandidates() {
    setLoadingCandidates(true);
    try {
      const emails = await listOrgCandidateUsers(orgId);
      setCandidates(emails);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = getBrowserClient();

    // add_org_member upserts the role rather than rejecting an existing
    // member — the dropdown already excludes current members, but guard
    // against a race (someone else added them in the meantime) too.
    const { data: existing } = await supabase.rpc("list_org_members", { p_org_id: orgId });
    const alreadyMember = (existing ?? []).some(
      (m: { email: string }) => m.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (alreadyMember) {
      setLoading(false);
      setError(t("memberError.alreadyMember"));
      toast.error(t("memberError.alreadyMember"));
      return;
    }

    const { error } = await supabase.rpc("add_org_member", {
      p_org_id: orgId,
      p_email: email,
      p_role: role,
    });

    setLoading(false);
    if (error) {
      const msg = formatAddMemberError(error.message, t);
      setError(msg);
      toast.error(msg);
      return;
    }

    toast.success(t("toast.memberAdded"));
    setEmail("");
    setSuccess(true);
    router.refresh();
    onChanged?.();
    loadCandidates();
  }

  if (!loadingCandidates && candidates.length === 0) {
    return <p className="muted">{t("org.noCandidates")}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {t("org.email")}
        <br />
        <select
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSuccess(false);
          }}
        >
          <option value="" disabled>
            {t("org.selectUser")}
          </option>
          {candidates.map((candidateEmail) => (
            <option key={candidateEmail} value={candidateEmail}>
              {candidateEmail}
            </option>
          ))}
        </select>
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
      {success && <p className="success-msg">{t("org.memberAdded")}</p>}
      <button type="submit" disabled={loading || !email}>
        {t("org.addMember")}
      </button>
    </form>
  );
}
