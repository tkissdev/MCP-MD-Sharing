"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameProjectAction, moveProjectOrgAction } from "./project-actions";
import { useLocale } from "../locale-context";

export function EditProjectModal({
  projectId,
  projectName,
  organizationId,
  adminOrgs,
  onClose,
}: {
  projectId: string;
  projectName: string;
  organizationId: string;
  adminOrgs: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();

  const [name, setName] = useState(projectName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [orgId, setOrgId] = useState(organizationId);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameError(null);
    try {
      await renameProjectAction(projectId, name);
      router.refresh();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : String(err));
    } finally {
      setNameSaving(false);
    }
  }

  async function handleMoveOrg(e: React.FormEvent) {
    e.preventDefault();
    setOrgSaving(true);
    setOrgError(null);
    try {
      await moveProjectOrgAction(projectId, orgId);
      router.refresh();
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : String(err));
    } finally {
      setOrgSaving(false);
    }
  }

  // Always include the project's current organization as an option, even if
  // the caller isn't owner/admin there — otherwise the select couldn't show
  // what the project is currently set to.
  const orgOptions = adminOrgs.some((o) => o.id === organizationId)
    ? adminOrgs
    : [{ id: organizationId, name: "…" }, ...adminOrgs];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("projects.editProject")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleRename} style={{ marginTop: 16 }}>
          <label>
            {t("projects.name")}
            <br />
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {nameError && <p className="error">{nameError}</p>}
          <button type="submit" disabled={nameSaving || name === projectName}>
            {t("projects.rename")}
          </button>
        </form>

        <form onSubmit={handleMoveOrg} style={{ marginTop: 20 }}>
          <label>
            {t("projects.moveOrg")}
            <br />
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} disabled={orgOptions.length <= 1}>
              {orgOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          {orgError && <p className="error">{orgError}</p>}
          {orgOptions.length > 1 && (
            <button type="submit" disabled={orgSaving || orgId === organizationId}>
              {t("common.save")}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
