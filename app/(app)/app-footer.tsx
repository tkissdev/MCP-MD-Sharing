"use client";

import { SiteFooter } from "../site-footer";
import { useLocale } from "./locale-context";

export function AppFooter() {
  const { t } = useLocale();
  return <SiteFooter t={t} />;
}
