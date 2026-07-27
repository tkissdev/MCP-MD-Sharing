"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProjectAction } from "./project-actions";
import { useLocale } from "../locale-context";

export function DeleteProjectModal({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteProjectAction(projectId);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{t("projects.deleteConfirmTitle")}</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          <strong>{projectName}</strong> — {t("projects.deleteConfirmBody")}
        </p>
        {error && <p className="error">{error}</p>}
        <div className="row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button className="danger" onClick={handleDelete} disabled={busy}>
            {t("common.confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
