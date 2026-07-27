"use client";

import { CreateOrgForm } from "../create-org-form";
import { useLocale } from "../locale-context";

export function NewOrgModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("org.newOrganization")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <CloseIcon />
          </button>
        </div>
        <CreateOrgForm onCreated={onClose} />
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
