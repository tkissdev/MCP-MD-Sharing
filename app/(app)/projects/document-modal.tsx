"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase-browser";
import { DocumentEditor } from "./[projectId]/docs/[...path]/document-editor";
import { VersionHistory } from "./[projectId]/docs/[...path]/version-history";
import { useLocale } from "../locale-context";

interface HistoryEntry {
  version_number: number;
  message: string | null;
  created_at: string;
}

interface DocData {
  content: string;
  currentVersion: number;
  history: HistoryEntry[];
}

export function DocumentModal({
  projectId,
  path,
  onClose,
}: {
  projectId: string;
  path: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [doc, setDoc] = useState<DocData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [path]);

  async function load() {
    const supabase = getBrowserClient();
    const { data: docRow, error: docError } = await supabase
      .from("documents")
      .select("id, current_version")
      .eq("project_id", projectId)
      .eq("path", path)
      .maybeSingle();
    if (docError || !docRow) {
      setError(docError?.message ?? "Not found");
      return;
    }

    const { data: version } = await supabase
      .from("versions")
      .select("content")
      .eq("document_id", docRow.id)
      .eq("version_number", docRow.current_version)
      .single();

    const { data: history } = await supabase
      .from("versions")
      .select("version_number, message, created_at")
      .eq("document_id", docRow.id)
      .order("version_number", { ascending: false });

    setDoc({ content: version?.content ?? "", currentVersion: docRow.current_version, history: history ?? [] });
  }

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{path}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")} data-tooltip={t("common.close")}>
            <CloseIcon />
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {!doc && !error && <p className="muted">…</p>}

        {doc && (
          <>
            <DocumentEditor
              projectId={projectId}
              path={path}
              content={doc.content}
              currentVersion={doc.currentVersion}
              onSaved={load}
            />

            <h2 style={{ marginTop: 32 }}>{t("doc.history")}</h2>
            <VersionHistory
              projectId={projectId}
              path={path}
              currentVersion={doc.currentVersion}
              history={doc.history}
              onRestored={load}
            />
          </>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
