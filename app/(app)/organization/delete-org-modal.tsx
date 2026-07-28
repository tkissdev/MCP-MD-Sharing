"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteOrganizationAction } from "./org-actions";
import { useLocale } from "../locale-context";

export function DeleteOrgModal({
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteOrganizationAction(orgId);
      toast.success(t("toast.orgDeleted"));
      router.refresh();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{t("org.deleteConfirmTitle")}</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          <strong>{orgName}</strong> — {t("org.deleteConfirmBody")}
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
