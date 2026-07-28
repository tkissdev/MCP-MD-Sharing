"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { formatAddMemberError } from "@/lib/member-errors";
import { listProjectCandidateUsers } from "../../project-users-action";
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
  const [candidates, setCandidates] = useState<string[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("reader");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, [projectId]);

  async function loadCandidates() {
    setLoadingCandidates(true);
    try {
      const emails = await listProjectCandidateUsers(projectId);
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

    // add_project_member upserts the role rather than rejecting an existing
    // member — the dropdown already excludes current members, but guard
    // against a race (someone else added them in the meantime) too.
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
          <option value="reader">{t("role.reader")}</option>
          <option value="editor">{t("role.editor")}</option>
          <option value="admin">{t("role.admin")}</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{t("org.memberAdded")}</p>}
      <button type="submit" disabled={loading || !email}>
        {t("members.add")}
      </button>
    </form>
  );
}
