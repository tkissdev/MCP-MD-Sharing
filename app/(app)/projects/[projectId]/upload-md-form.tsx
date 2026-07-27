"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDocumentAction } from "./actions";
import { useLocale } from "../../locale-context";

type FileStatus = "pending" | "done" | "error";

interface UploadEntry {
  name: string;
  status: FileStatus;
  message?: string;
}

export function UploadMdForm({ projectId, onUploaded }: { projectId: string; onUploaded?: () => void }) {
  const router = useRouter();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".md"));
    const skipped = fileList.length - files.length;

    setBusy(true);
    setUploads(files.map((f) => ({ name: f.name, status: "pending" as const })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const content = await file.text();
        await createDocumentAction(projectId, file.name, content);
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "done" } : u)));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "error", message } : u)));
      }
    }

    setBusy(false);
    router.refresh();
    onUploaded?.();

    if (skipped > 0) {
      setUploads((prev) => [...prev, { name: `${skipped} non-.md file(s)`, status: "error", message: "Skipped — only .md files are supported" }]);
    }
  }

  return (
    <div>
      <div
        className="card"
        style={{
          borderStyle: "dashed",
          borderColor: dragOver ? "var(--accent)" : "var(--border-strong)",
          background: dragOver ? "var(--accent-soft)" : "var(--surface)",
          textAlign: "center",
          cursor: "pointer",
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p style={{ margin: "8px 0" }}>{t("project.dropHint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".md"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file after fixing an error
          }}
        />
      </div>

      {uploads.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {uploads.map((u, i) => (
            <div className="list-item" key={`${u.name}-${i}`}>
              <span>{u.name}</span>
              {u.status === "pending" && <span className="badge">{t("project.uploading")}</span>}
              {u.status === "done" && <span className="badge badge-editor">{t("project.done")}</span>}
              {u.status === "error" && <span className="error">{u.message}</span>}
            </div>
          ))}
        </div>
      )}
      {busy && <p className="muted">{t("project.uploading")}</p>}
    </div>
  );
}
