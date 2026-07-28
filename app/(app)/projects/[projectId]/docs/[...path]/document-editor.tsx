"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateDocumentAction } from "../../actions";
import { useLocale } from "../../../../locale-context";

export function DocumentEditor({
  projectId,
  path,
  content,
  currentVersion,
  onSaved,
}: {
  projectId: string;
  path: string;
  content: string;
  currentVersion: number;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [value, setValue] = useState(content);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      await updateDocumentAction(projectId, path, value, currentVersion, message || undefined);
      toast.success(t("toast.versionSaved"));
      router.refresh();
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <textarea value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="row" style={{ marginTop: 8 }}>
        <input
          placeholder={t("doc.changeMessage")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={handleSave} disabled={saving}>
          {t("doc.saveNewVersion")}
        </button>
      </div>
      {error && (
        <p className="error">
          {error}
          {error.startsWith("Version conflict") && " " + t("doc.versionConflictHint")}
        </p>
      )}
    </div>
  );
}
