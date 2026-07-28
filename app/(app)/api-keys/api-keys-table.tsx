"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "../locale-context";
import { CreateKeyModal } from "./create-key-modal";
import { RevokeKeyModal } from "./revoke-key-modal";
import { DeleteKeyModal } from "./delete-key-modal";

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  status: "active" | "revoked";
  createdAt: string;
  modifiedAt: string;
}

type SortKey = "name" | "keyPrefix" | "status" | "createdAt" | "modifiedAt";

export function ApiKeysTable({ rows }: { rows: ApiKeyRow[] }) {
  const { t, locale } = useLocale();
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKeyRow | null>(null);
  const [deleting, setDeleting] = useState<ApiKeyRow | null>(null);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "keyPrefix":
          cmp = a.keyPrefix.localeCompare(b.keyPrefix);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case "modifiedAt":
          cmp = a.modifiedAt.localeCompare(b.modifiedAt);
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: t("apiKeys.name") },
    { key: "keyPrefix", label: t("apiKeys.colKey") },
    { key: "status", label: t("apiKeys.colStatus") },
    { key: "createdAt", label: t("apiKeys.colCreated") },
    { key: "modifiedAt", label: t("apiKeys.colModified") },
  ];

  return (
    <>
      <div className="projects-toolbar">
        <button className="projects-new-btn" onClick={() => setCreating(true)}>
          <PlusIcon /> {t("apiKeys.createNew")}
        </button>
        <Link href="/docs#create-api-key" className="muted">
          {t("apiKeys.docsLink")}
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>{t("apiKeys.none")}</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>
                    <button
                      className="sortable-th"
                      onClick={() => handleSort(col.key)}
                      data-tooltip={t("common.sortColumn")}
                    >
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  </th>
                ))}
                <th className="data-table-actions-col" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td className="data-table-name-cell">{r.name}</td>
                  <td>
                    <code>{r.keyPrefix}…</code>
                  </td>
                  <td>
                    <span className={`badge ${r.status === "active" ? "badge-editor" : "badge-member"}`}>
                      {r.status === "active" ? t("apiKeys.statusActive") : t("apiKeys.statusRevoked")}
                    </span>
                  </td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{formatDate(r.modifiedAt)}</td>
                  <td className="data-table-actions-col">
                    {r.status === "active" ? (
                      <button className="danger" onClick={() => setRevoking(r)}>
                        {t("apiKeys.revoke")}
                      </button>
                    ) : (
                      <button className="danger" onClick={() => setDeleting(r)}>
                        {t("apiKeys.deleteKey")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateKeyModal onClose={() => setCreating(false)} />}

      {revoking && (
        <RevokeKeyModal keyId={revoking.id} keyName={revoking.name} onClose={() => setRevoking(null)} />
      )}

      {deleting && (
        <DeleteKeyModal keyId={deleting.id} keyName={deleting.name} onClose={() => setDeleting(null)} />
      )}
    </>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sort-icon sort-icon-idle">
        <path d="m7 15 5 5 5-5M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sort-icon">
      {dir === "asc" ? (
        <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
