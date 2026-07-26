"use client";

import Link from "next/link";
import { usePublicLocale } from "./public-locale";

const VERSION = "0.1.0";

export function SiteFooter() {
  const { t } = usePublicLocale();

  return (
    <footer className="landing-footer">
      <span>MCP MD Sharing v{VERSION}</span>
      <span>·</span>
      <Link href="/privacy">{t("landing.footerPrivacy")}</Link>
    </footer>
  );
}
