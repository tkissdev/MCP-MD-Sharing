"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameOrganizationAction } from "./org-actions";
import { useLocale } from "../locale-context";

export function EditOrgModal({
  orgId,
  orgName,
  onClose,
}: {
  orgId: string;
  orgName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState(orgName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await renameOrganizationAction(orgId, name);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("org.editOrg")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <label>
            {t("org.name")}
            <br />
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving || name === orgName}>
            {t("org.rename")}
          </button>
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
