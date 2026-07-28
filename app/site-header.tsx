"use client";

import Image from "next/image";
import Link from "next/link";
import { usePublicLocale } from "./public-locale";

export function SiteHeader() {
  const { locale, t, setLocale } = usePublicLocale();

  return (
    <header className="landing-header">
      <Link href="/" className="landing-logo">
        <Image src="/MCP-MD-Sharing-logo-black.png" alt="MCP-MD-Sharing" width={36} height={36} priority />
        <span className="landing-logo-text">MCP-MD-Sharing</span>
      </Link>
      <nav className="landing-nav">
        <div className="language-switcher">
          <button
            className={`flag-button ${locale === "en" ? "flag-button-active" : ""}`}
            onClick={() => setLocale("en")}
            title="English"
            aria-label="English"
          >
            🇬🇧
          </button>
          <button
            className={`flag-button ${locale === "fr" ? "flag-button-active" : ""}`}
            onClick={() => setLocale("fr")}
            title="Français"
            aria-label="Français"
          >
            🇫🇷
          </button>
        </div>
        <Link href="/docs" className="landing-nav-link">
          {t("landing.docs")}
        </Link>
        <Link href="/auth" className="landing-nav-link">
          {t("landing.signin")}
        </Link>
        <Link href="/auth?mode=sign-up" className="landing-nav-cta">
          {t("landing.createAccount")}
        </Link>
      </nav>
    </header>
  );
}
