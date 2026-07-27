"use client";

import { useMemo, useState } from "react";
import { useLocale } from "../locale-context";
import { OrgDrawer } from "./org-drawer";
import { AddMemberModal } from "./add-member-modal";
import { EditOrgModal } from "./edit-org-modal";
import { DeleteOrgModal } from "./delete-org-modal";
import { NewOrgModal } from "./new-org-modal";

export interface OrgRow {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  projectCount: number;
  createdAt: string;
  modifiedAt: string;
}

type SortKey = "name" | "projectCount" | "createdAt" | "modifiedAt";

export function OrganizationsTable({ rows }: { rows: OrgRow[] }) {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selected, setSelected] = useState<OrgRow | null>(null);
  const [addMemberFor, setAddMemberFor] = useState<OrgRow | null>(null);
  const [editing, setEditing] = useState<OrgRow | null>(null);
  const [deleting, setDeleting] = useState<OrgRow | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "projectCount":
          cmp = a.projectCount - b.projectCount;
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
    { key: "name", label: t("org.colOrganization") },
    { key: "projectCount", label: t("org.colProjects") },
    { key: "createdAt", label: t("org.colCreated") },
    { key: "modifiedAt", label: t("org.colModified") },
  ];

  return (
    <>
      <div className="projects-toolbar">
        <div className="search-input-wrap">
          <SearchIcon />
          <input
            className="search-input"
            placeholder={t("org.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="projects-new-btn" onClick={() => setCreating(true)}>
          <PlusIcon /> {t("org.newOrganization")}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>{rows.length === 0 ? t("projects.none") : t("org.noResults")}</p>
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
                  <td>{r.projectCount}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{formatDate(r.modifiedAt)}</td>
                  <td className="data-table-actions-col">
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title={t("org.addMember")}
                        disabled={r.role === "member"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddMemberFor(r);
                        }}
                      >
                        <PlusIcon />
                      </button>
                      {r.role === "owner" && (
                        <>
                          <button
                            className="icon-btn"
                            title={t("org.editOrg")}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(r);
                            }}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            title={t("org.deleteOrg")}
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

      {selected && <OrgDrawer org={selected} onClose={() => setSelected(null)} />}

      {addMemberFor && <AddMemberModal orgId={addMemberFor.id} onClose={() => setAddMemberFor(null)} />}

      {editing && <EditOrgModal orgId={editing.id} orgName={editing.name} onClose={() => setEditing(null)} />}

      {deleting && <DeleteOrgModal orgId={deleting.id} orgName={deleting.name} onClose={() => setDeleting(null)} />}

      {creating && <NewOrgModal onClose={() => setCreating(false)} />}
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
