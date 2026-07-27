"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase-browser";
import { RemoveOrgMemberButton } from "./remove-member-button";
import { AddMemberModal } from "./add-member-modal";
import { useLocale } from "../locale-context";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import type { OrgRow } from "./organizations-table";

interface Member {
  user_id: string;
  email: string;
  role: string;
}

export function OrgDrawer({ org, onClose }: { org: OrgRow; onClose: () => void }) {
  const { t } = useLocale();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    load();
  }, [org.id]);

  async function load() {
    const { data, error } = await getBrowserClient().rpc("list_org_members", { p_org_id: org.id });
    if (error) setError(error.message);
    else setMembers(data ?? []);
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <div className="drawer-eyebrow">{t("org.membersTitle")}</div>
              <h2>{org.name}</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
              <CloseIcon />
            </button>
          </div>

          <button className="drawer-add-btn" onClick={() => setAddOpen(true)} disabled={org.role === "member"}>
            <PlusIcon /> {t("org.addMember")}
          </button>

          {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
          {members === null && !error && <p className="muted" style={{ marginTop: 16 }}>…</p>}

          <div style={{ marginTop: 12 }}>
            {members?.map((m) => (
              <div className="list-item" key={m.user_id}>
                <div>
                  {m.email}{" "}
                  <span className={`badge badge-${m.role}`}>{t(`role.${m.role}` as TranslationKey)}</span>
                </div>
                <RemoveOrgMemberButton orgId={org.id} userId={m.user_id} onChanged={load} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {addOpen && <AddMemberModal orgId={org.id} onClose={() => setAddOpen(false)} onChanged={load} />}
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
