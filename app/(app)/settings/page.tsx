import { getServerClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/dictionary";
import { AccountSection } from "./account-section";
import { LanguageSwitcher } from "../language-switcher";
import { DangerZone } from "./danger-zone";

export default async function SettingsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = getLocale(user);

  const providers = (user?.identities ?? []).map((i) => i.provider);

  return (
    <>
      <h1>{t(locale, "settings.title")}</h1>

      <AccountSection email={user?.email ?? ""} providers={providers} />

      <div className="card" style={{ marginTop: 16 }}>
        <h3>{t(locale, "settings.language")}</h3>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted">{t(locale, "settings.languageDesc")}</span>
          <LanguageSwitcher />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <DangerZone />
      </div>
    </>
  );
}
