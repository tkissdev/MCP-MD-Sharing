"use client";

import { useMemo, useState } from "react";
import { useLocale } from "../locale-context";
import { ProjectDrawer } from "./project-drawer";
import { UploadModal } from "./upload-modal";
import { EditProjectModal } from "./edit-project-modal";
import { DeleteProjectModal } from "./delete-project-modal";
import { NewProjectModal } from "./new-project-modal";
import type { ProjectRole } from "@/lib/permissions";

export interface ProjectDoc {
  id: string;
  path: string;
  currentVersion: number;
  createdAt: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  fileCount: number;
  createdAt: string;
  modifiedAt: string;
  role: ProjectRole;
  documents: ProjectDoc[];
}

type SortKey = "name" | "organizationName" | "fileCount" | "createdAt" | "modifiedAt";

export function ProjectsTable({
  rows,
  adminOrgs,
}: {
  rows: ProjectRow[];
  adminOrgs: { id: string; name: string }[];
}) {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selected, setSelected] = useState<ProjectRow | null>(null);
  const [uploadFor, setUploadFor] = useState<ProjectRow | null>(null);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState<ProjectRow | null>(null);
  const [creating, setCreating] = useState(false);

  const orgs = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.organizationId, r.organizationName);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (orgFilter && r.organizationId !== orgFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.organizationName.toLowerCase().includes(q);
    });
  }, [rows, search, orgFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "fileCount":
          cmp = a.fileCount - b.fileCount;
          break;
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case "modifiedAt":
          cmp = a.modifiedAt.localeCompare(b.modifiedAt);
          break;
        case "organizationName":
          cmp = a.organizationName.localeCompare(b.organizationName);
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

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
    { key: "name", label: t("projects.colProject") },
    { key: "organizationName", label: t("projects.colOrganization") },
    { key: "fileCount", label: t("projects.colFiles") },
    { key: "createdAt", label: t("projects.colCreated") },
    { key: "modifiedAt", label: t("projects.colModified") },
  ];

  return (
    <>
      <div className="projects-toolbar">
        <div className="search-input-wrap">
          <SearchIcon />
          <input
            className="search-input"
            placeholder={t("projects.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
          <option value="">{t("projects.allOrgs")}</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {adminOrgs.length > 0 && (
          <button className="projects-new-btn" onClick={() => setCreating(true)}>
            <PlusIcon /> {t("projects.new")}
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>{rows.length === 0 ? t("projects.none") : t("projects.noResults")}</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>
                    <button className="sortable-th" onClick={() => handleSort(col.key)}>
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
                <tr key={r.id} onClick={() => setSelected(r)}>
                  <td className="data-table-name-cell">{r.name}</td>
                  <td>{r.organizationName}</td>
                  <td>{r.fileCount}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{formatDate(r.modifiedAt)}</td>
                  <td className="data-table-actions-col">
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title={t("projects.addFiles")}
                        disabled={r.role === "reader"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFor(r);
                        }}
                      >
                        <PlusIcon />
                      </button>
                      {r.role === "admin" && (
                        <>
                          <button
                            className="icon-btn"
                            title={t("projects.editProject")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(r);
                            }}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            title={t("projects.deleteProject")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleting(r);
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <ProjectDrawer project={selected} onClose={() => setSelected(null)} />}

      {uploadFor && <UploadModal projectId={uploadFor.id} onClose={() => setUploadFor(null)} />}

      {editing && (
        <EditProjectModal
          projectId={editing.id}
          projectName={editing.name}
          organizationId={editing.organizationId}
          adminOrgs={adminOrgs}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteProjectModal projectId={deleting.id} projectName={deleting.name} onClose={() => setDeleting(null)} />
      )}

      {creating && <NewProjectModal orgs={adminOrgs} onClose={() => setCreating(false)} />}
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
