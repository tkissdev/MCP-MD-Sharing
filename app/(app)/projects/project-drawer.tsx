"use client";

import { useState } from "react";
import { useLocale } from "../locale-context";
import { UploadModal } from "./upload-modal";
import { DocumentModal } from "./document-modal";
import type { ProjectRow } from "./projects-table";

export function ProjectDrawer({ project, onClose }: { project: ProjectRow; onClose: () => void }) {
  const { t } = useLocale();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(null);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <div className="drawer-eyebrow">{project.organizationName}</div>
              <h2>{project.name}</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label={t("common.close")} data-tooltip={t("common.close")}>
              <CloseIcon />
            </button>
          </div>

          <button
            className="drawer-add-btn"
            onClick={() => setUploadOpen(true)}
            disabled={project.role === "reader"}
          >
            <PlusIcon /> {t("projects.addFiles")}
          </button>

          {project.documents.length === 0 && <p className="muted" style={{ marginTop: 16 }}>{t("project.noDocuments")}</p>}

          <div style={{ marginTop: 12 }}>
            {project.documents.map((d) => (
              <div key={d.id} className="list-item" style={{ cursor: "pointer" }} onClick={() => setOpenPath(d.path)}>
                <span>{d.path}</span>
                <span className="badge">v{d.currentVersion}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {uploadOpen && (
        <UploadModal projectId={project.id} onClose={() => setUploadOpen(false)} onChanged={() => setUploadOpen(false)} />
      )}

      {openPath && <DocumentModal projectId={project.id} path={openPath} onClose={() => setOpenPath(null)} />}
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
