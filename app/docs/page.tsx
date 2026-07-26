"use client";

import { PublicLocaleProvider, usePublicLocale } from "../public-locale";
import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";

export default function DocsPage() {
  return (
    <PublicLocaleProvider>
      <Content />
    </PublicLocaleProvider>
  );
}

function Content() {
  const { t } = usePublicLocale();

  return (
    <div className="landing">
      <SiteHeader />
      <main className="landing-main">
        <section className="landing-placeholder">
          <h1>{t("landing.docs")}</h1>
          <p>{t("landing.comingSoon")}</p>
        </section>
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
