"use client";

import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "./locale-context";

export function SignOutButton({ iconOnly }: { iconOnly?: boolean }) {
  const router = useRouter();
  const { t } = useLocale();

  async function handleSignOut() {
    await getBrowserClient().auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} title={iconOnly ? t("nav.signOut") : undefined}>
      {iconOnly ? "⎋" : t("nav.signOut")}
    </button>
  );
}
