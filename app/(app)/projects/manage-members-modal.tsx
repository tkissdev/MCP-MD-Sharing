"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase-browser";
import { RemoveProjectMemberButton } from "./[projectId]/members/remove-member-button";
import { AddProjectMemberModal } from "./add-project-member-modal";
import { useLocale } from "../locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

interface Member {
  user_id: string;
  email: string;
  role: string;
}

export function ManageMembersModal({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    load();
  }, [projectId]);

  async function load() {
    const { data, error } = await getBrowserClient().rpc("list_project_members", { p_project_id: projectId });
    if (error) setError(error.message);
    else setMembers(data ?? []);
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{t("project.manageMembers")}</h2>
            <button className="icon-btn" onClick={onClose} aria-label={t("common.close")} data-tooltip={t("common.close")}>
              <CloseIcon />
            </button>
          </div>
          <p className="muted">{projectName}</p>

          <button className="drawer-add-btn" onClick={() => setAddOpen(true)}>
            <PlusIcon /> {t("members.add")}
          </button>

          {error && (
            <p className="error" style={{ marginTop: 16 }}>
              {error}
            </p>
          )}
          {members === null && !error && (
            <p className="muted" style={{ marginTop: 16 }}>
              …
            </p>
          )}

          <div style={{ marginTop: 12 }}>
            {members?.map((m) => (
              <div className="list-item" key={m.user_id}>
                <div>
                  {m.email}{" "}
                  <span className={`badge badge-${m.role}`}>{t(`role.${m.role}` as TranslationKey)}</span>
                </div>
                <RemoveProjectMemberButton projectId={projectId} userId={m.user_id} onChanged={load} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {addOpen && (
        <AddProjectMemberModal projectId={projectId} onClose={() => setAddOpen(false)} onChanged={load} />
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
