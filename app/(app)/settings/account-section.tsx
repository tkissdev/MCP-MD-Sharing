"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "../locale-context";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
};

export function AccountSection({
  email,
  providers,
}: {
  email: string;
  providers: string[];
}) {
  const { t } = useLocale();
  const hasPassword = providers.includes("email");
  const socialProviders = providers.filter((p) => p !== "email");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordSet, setPasswordSet] = useState(hasPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (pw.length < 6) {
      setError(t("settings.pwTooShort"));
      return;
    }
    if (pw !== pw2) {
      setError(t("settings.pwMismatch"));
      return;
    }

    setSaving(true);
    const { error } = await getBrowserClient().auth.updateUser({ password: pw });
    setSaving(false);

    if (error) {
      setError(error.message || t("settings.pwFail"));
      return;
    }

    setSuccess(true);
    setPw("");
    setPw2("");
    setPasswordSet(true);
  }

  return (
    <div className="card">
      <h3>{t("settings.account")}</h3>
      <div className="row" style={{ marginBottom: 4 }}>
        <span className="muted">{t("settings.emailLabel")}</span>
        <strong>{email}</strong>
      </div>
      {socialProviders.length > 0 && (
        <div className="row">
          <span className="muted">{t("settings.connections")}</span>
          {socialProviders.map((p) => (
            <span className="badge" key={p}>
              {PROVIDER_LABELS[p] ?? p}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <h3 style={{ marginBottom: 4 }}>{passwordSet ? t("settings.changePassword") : t("settings.setPassword")}</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          {passwordSet ? t("settings.changePasswordDesc") : t("settings.setPasswordDesc")}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <input
              type="password"
              placeholder={t("settings.newPassword")}
              minLength={6}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="password"
              placeholder={t("settings.confirmPassword")}
              minLength={6}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
          {error && <p className="error">{error}</p>}
          {success && <p className="success-msg">{t("settings.pwSaved")}</p>}
          <button type="submit" disabled={saving || !pw || !pw2}>
            {passwordSet ? t("common.save") : t("settings.setPasswordBtn")}
          </button>
        </form>
      </div>
    </div>
  );
}
