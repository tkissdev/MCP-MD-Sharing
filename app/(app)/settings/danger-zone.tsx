"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase-browser";
import { deleteAccountAction } from "./account-actions";
import { useLocale } from "../locale-context";

export function DangerZone() {
  const router = useRouter();
  const { t } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccountAction();
      await getBrowserClient().auth.signOut();
      toast.success(t("toast.accountDeleted"));
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("settings.deleteAccountFail");
      setError(msg);
      toast.error(msg);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
        <h3 style={{ color: "var(--danger)" }}>{t("settings.dangerZone")}</h3>
        <p className="muted">{t("settings.deleteAccountDesc")}</p>
        <button className="danger" onClick={() => setConfirming(true)}>
          {t("settings.deleteAccount")}
        </button>
      </div>

      {confirming && (
        <div className="modal-overlay" onClick={() => !busy && setConfirming(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "var(--danger)" }}>{t("settings.deleteAccountConfirmTitle")}</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              {t("settings.deleteAccountConfirmDesc")}
            </p>
            {error && <p className="error">{error}</p>}
            <div className="row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirming(false)} disabled={busy}>
                {t("common.cancel")}
              </button>
              <button className="danger" onClick={handleDelete} disabled={busy}>
                {t("settings.deleteAccountConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
