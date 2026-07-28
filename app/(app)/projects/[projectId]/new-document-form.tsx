"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createDocumentAction } from "./actions";
import { useLocale } from "../../locale-context";

export function NewDocumentForm({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createDocumentAction(projectId, path, content);
      toast.success(t("toast.documentCreated"));
      if (onCreated) {
        router.refresh();
        onCreated();
      } else {
        router.push(`/projects/${projectId}/docs/${path}`);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {t("project.path")}
        <br />
        <input required placeholder="notes/example.md" value={path} onChange={(e) => setPath(e.target.value)} />
      </label>
      <label>
        {t("project.content")}
        <br />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {t("project.createDocument")}
      </button>
    </form>
  );
}
