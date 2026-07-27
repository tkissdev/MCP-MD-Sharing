"use client";

import { UploadMdForm } from "./[projectId]/upload-md-form";
import { NewDocumentForm } from "./[projectId]/new-document-form";
import { useLocale } from "../locale-context";

export function UploadModal({
  projectId,
  onClose,
  onChanged,
}: {
  projectId: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("projects.addFiles")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <CloseIcon />
          </button>
        </div>

        <h3 style={{ marginTop: 16 }}>{t("project.addMd")}</h3>
        <UploadMdForm projectId={projectId} onUploaded={onChanged} />

        <h3 style={{ marginTop: 24 }}>{t("project.newDocument")}</h3>
        <NewDocumentForm projectId={projectId} onCreated={onChanged} />
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
