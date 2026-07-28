"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "../locale-context";

export function RevokeKeyModal({
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

  async function handleRevoke() {
    setBusy(true);
    const { error } = await getBrowserClient()
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", keyId);
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    toast.success(t("toast.keyRevoked"));
    router.refresh();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{t("apiKeys.revokeConfirmTitle")}</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          <strong>{keyName}</strong> — {t("apiKeys.revokeConfirmBody")}
        </p>
        <div className="row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button className="danger" onClick={handleRevoke} disabled={busy}>
            {t("apiKeys.revoke")}
          </button>
        </div>
      </div>
    </div>
  );
}
