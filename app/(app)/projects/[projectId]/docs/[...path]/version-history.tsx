"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreVersionAction } from "../../actions";
import { getBrowserClient } from "@/lib/supabase-browser";
import { computeInlineDiff, computeSideBySideDiff, type DiffRow } from "@/lib/diff-lines";
import { useLocale } from "../../../../locale-context";

interface HistoryEntry {
  version_number: number;
  message: string | null;
  created_at: string;
}

export function VersionHistory({
  projectId,
  path,
  currentVersion,
  history,
  onRestored,
}: {
  projectId: string;
  path: string;
  currentVersion: number;
  history: HistoryEntry[];
  onRestored?: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [selected, setSelected] = useState<number[]>([]);
  const [diff, setDiff] = useState<{ from: number; to: number; rows: DiffRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePreview(versionNumber: number) {
    if (previewVersion === versionNumber) {
      setPreviewVersion(null);
      return;
    }
    const supabase = getBrowserClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("project_id", projectId)
      .eq("path", path)
      .single();
    const { data } = await supabase
      .from("versions")
      .select("content")
      .eq("document_id", doc!.id)
      .eq("version_number", versionNumber)
      .single();
    setPreviewContent(data?.content ?? "");
    setPreviewVersion(versionNumber);
  }

  async function handleRestore(versionNumber: number) {
    setBusy(true);
    setError(null);
    try {
      await restoreVersionAction(projectId, path, versionNumber, currentVersion);
      router.refresh();
      onRestored?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(versionNumber: number) {
    setSelected((prev) => {
      if (prev.includes(versionNumber)) return prev.filter((v) => v !== versionNumber);
      if (prev.length >= 2) return prev;
      return [...prev, versionNumber];
    });
  }

  async function fetchContent(versionNumber: number): Promise<string> {
    const supabase = getBrowserClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("project_id", projectId)
      .eq("path", path)
      .single();
    const { data } = await supabase
      .from("versions")
      .select("content")
      .eq("document_id", doc!.id)
      .eq("version_number", versionNumber)
      .single();
    return data?.content ?? "";
  }

  async function handleCompare() {
    if (selected.length !== 2) return;
    setError(null);
    const [from, to] = [...selected].sort((a, b) => a - b);
    const [oldContent, newContent] = await Promise.all([fetchContent(from), fetchContent(to)]);
    setDiff({ from, to, rows: computeSideBySideDiff(oldContent, newContent) });
  }

  if (diff) {
    return (
      <div>
        <div className="row" style={{ marginBottom: 12, justifyContent: "space-between" }}>
          <strong>
            {t("doc.comparing")} v{diff.from} → v{diff.to}
          </strong>
          <button onClick={() => setDiff(null)}>{t("doc.closeComparison")}</button>
        </div>
        <div className="diff-wrapper">
          <div className="diff-header">
            <div>v{diff.from}</div>
            <div>v{diff.to}</div>
          </div>
          <div className="diff-grid">
            {diff.rows.map((row, i) => {
              // A modified row with both sides present gets a character-level
              // diff so only the changed characters are colored, not the whole line.
              if (row.kind === "modified" && row.left !== null && row.right !== null) {
                const { left, right } = computeInlineDiff(row.left, row.right);
                return (
                  <Fragment key={i}>
                    <div className="diff-cell">
                      {left.map((seg, j) => (
                        <span key={j} className={seg.changed ? "diff-seg-changed-left" : "diff-seg-same"}>
                          {seg.text}
                        </span>
                      ))}
                    </div>
                    <div className="diff-cell">
                      {right.map((seg, j) => (
                        <span key={j} className={seg.changed ? "diff-seg-changed-right" : "diff-seg-same"}>
                          {seg.text}
                        </span>
                      ))}
                    </div>
                  </Fragment>
                );
              }

              return (
                <Fragment key={i}>
                  <div
                    className={`diff-cell ${row.left === null ? "diff-empty" : row.kind === "same" ? "diff-same" : row.kind === "removed" ? "diff-removed" : "diff-modified"}`}
                  >
                    {row.left ?? ""}
                  </div>
                  <div
                    className={`diff-cell ${row.right === null ? "diff-empty" : row.kind === "same" ? "diff-same" : "diff-modified"}`}
                  >
                    {row.right ?? ""}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <div className="row" style={{ marginBottom: 12 }}>
        <button onClick={handleCompare} disabled={selected.length !== 2}>
          {t("doc.compare")} {selected.length === 2 ? `(v${Math.min(...selected)} vs v${Math.max(...selected)})` : ""}
        </button>
        {selected.length > 0 && (
          <span className="muted">
            {selected.length}/2 {t("doc.selected")}
          </span>
        )}
      </div>
      {history.map((h) => (
        <div key={h.version_number}>
          <div className="list-item">
            <div className="row">
              <input
                type="checkbox"
                checked={selected.includes(h.version_number)}
                onChange={() => toggleSelected(h.version_number)}
                disabled={!selected.includes(h.version_number) && selected.length >= 2}
              />
              <div>
                <strong>v{h.version_number}</strong>
                {h.version_number === currentVersion && (
                  <span className="badge" style={{ marginLeft: 8 }}>
                    {t("doc.current")}
                  </span>
                )}
                <div className="muted">
                  {h.message ?? "—"} · {new Date(h.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="row">
              <button onClick={() => handlePreview(h.version_number)}>
                {previewVersion === h.version_number ? t("doc.hide") : t("doc.view")}
              </button>
              {h.version_number !== currentVersion && (
                <button onClick={() => handleRestore(h.version_number)} disabled={busy}>
                  {t("doc.restore")}
                </button>
              )}
            </div>
          </div>
          {previewVersion === h.version_number && <pre className="card">{previewContent}</pre>}
        </div>
      ))}
    </div>
  );
}
