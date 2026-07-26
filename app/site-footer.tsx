"use client";

import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import packageJson from "../package.json";

const VERSION = packageJson.version;

// Shared between the public pages (their own locale context) and the
// authenticated app (a different one) — takes an already-bound `t` so it
// doesn't need to know which context it's rendered in.
export function SiteFooter({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <footer className="landing-footer">
      <span>MCP MD Sharing v{VERSION}</span>
      <span>·</span>
      <Link href="/privacy">{t("landing.footerPrivacy")}</Link>
    </footer>
  );
}
