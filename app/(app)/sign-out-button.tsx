"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "./locale-context";

export function SignOutButton({ iconOnly }: { iconOnly?: boolean }) {
  const router = useRouter();
  const { t } = useLocale();

  async function handleSignOut() {
    await getBrowserClient().auth.signOut();
    toast.success(t("toast.signedOut"));
    router.push("/auth");
    router.refresh();
  }

  return (
    <button
      className="sidebar-signout-btn"
      onClick={handleSignOut}
      aria-label={iconOnly ? t("nav.signOut") : undefined}
      data-tooltip={iconOnly ? t("nav.signOut") : undefined}
    >
      {iconOnly ? "⎋" : t("nav.signOut")}
    </button>
  );
}
