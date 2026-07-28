"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "../locale-context";

export function DeleteKeyModal({
  keyId,
  keyName,
  onClose,
}: {
  keyId: string;
  keyName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    await getBrowserClient().from("api_keys").delete().eq("id", keyId);
    router.refresh();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{t("apiKeys.deleteConfirmTitle")}</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          <strong>{keyName}</strong> — {t("apiKeys.deleteConfirmBody")}
        </p>
        <div className="row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button className="danger" onClick={handleDelete} disabled={busy}>
            {t("apiKeys.deleteKey")}
          </button>
        </div>
      </div>
    </div>
  );
}
