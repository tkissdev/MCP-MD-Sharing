import { getServerClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { Sidebar } from "./sidebar";
import { LocaleProvider } from "./locale-context";
import { AppFooter } from "./app-footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <LocaleProvider initialLocale={getLocale(user)}>
      <div className="shell">
        <Sidebar userEmail={user?.email} />
        <div className="main">
          <div className="page">{children}</div>
          <AppFooter />
        </div>
      </div>
    </LocaleProvider>
  );
}
