import { getServerClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/dictionary";
import { ApiKeysTable, type ApiKeyRow } from "./api-keys-table";

export default async function ApiKeysPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = getLocale(user);

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, revoked_at")
    .order("created_at", { ascending: false });

  const rows: ApiKeyRow[] = (keys ?? []).map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key_prefix,
    status: k.revoked_at ? "revoked" : "active",
    createdAt: k.created_at,
    modifiedAt: k.revoked_at ?? k.created_at,
  }));

  return (
    <>
      <h1>{t(locale, "apiKeys.title")}</h1>
      <p className="muted">{t(locale, "apiKeys.hint")}</p>
      <ApiKeysTable rows={rows} />
    </>
  );
}
