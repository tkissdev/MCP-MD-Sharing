"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { LanguageSwitcher } from "./language-switcher";
import { useLocale } from "./locale-context";

const STORAGE_KEY = "sidebar-collapsed";

const icons = {
  projects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  organization: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  apiKeys: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.5 12.5 8-8" strokeLinecap="round" />
      <path d="M15.5 7.5l3 3" strokeLinecap="round" />
      <path d="M18.5 4.5l3 3" strokeLinecap="round" />
    </svg>
  ),
};

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const links = [
    { href: "/projects", label: t("nav.projects"), icon: icons.projects },
    { href: "/search", label: t("nav.search"), icon: icons.search },
    { href: "/organization", label: t("nav.organization"), icon: icons.organization },
    { href: "/api-keys", label: t("nav.apiKeys"), icon: icons.apiKeys },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-top">
        <Link href="/dashboard" className="sidebar-brand">
          {collapsed ? "M" : t("nav.brand")}
        </Link>
        <button
          className="sidebar-toggle"
          onClick={toggle}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /> : <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </button>
      </div>
      <nav className="sidebar-nav">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="sidebar-link" title={collapsed ? l.label : undefined}>
            {l.icon}
            {!collapsed && l.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && <div className="sidebar-user">{userEmail}</div>}
        <LanguageSwitcher collapsed={collapsed} />
        <SignOutButton iconOnly={collapsed} />
      </div>
    </aside>
  );
}
