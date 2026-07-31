"use client";

import Link from "next/link";
import { PublicLocaleProvider, usePublicLocale } from "./public-locale";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

const ICONS = {
  versioning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 5v6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mcp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9h.01M15 9h.01M8 15c1 1.2 2.3 2 4 2s3-.8 4-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  permissions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  teams: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
} as const;

const FEATURES = ["versioning", "mcp", "search", "permissions", "teams"] as const;

export default function LandingPage() {
  return (
    <PublicLocaleProvider>
      <Landing />
    </PublicLocaleProvider>
  );
}

function Landing() {
  const { t } = usePublicLocale();

  return (
    <div className="landing">
      <SiteHeader />

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-glow" />
          <p className="landing-eyebrow">{t("landing.eyebrow")}</p>
          <h1>
            {t("landing.hero1")}
            <br />
            <span className="landing-hero-accent">{t("landing.hero2")}</span>
          </h1>
          <p>
            {t("landing.heroSub1")}
            <br />
            {t("landing.heroSub2")}
          </p>
          <div className="landing-hero-actions">
            <Link href="/auth?mode=sign-up" className="landing-btn-primary">
              {t("landing.start")}
            </Link>
            <Link href="/auth" className="landing-btn-secondary">
              {t("landing.signin")}
            </Link>
          </div>
        </section>

        <section className="landing-features">
          {FEATURES.map((key) => (
            <div key={key} className="landing-feature-card">
              {ICONS[key]}
              <h3>{t(`landing.f.${key}.t` as const)}</h3>
              <p>{t(`landing.f.${key}.d` as const)}</p>
            </div>
          ))}
        </section>
      </main>

      <SiteFooter t={t} />
    </div>
  );
}
