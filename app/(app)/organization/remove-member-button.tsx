"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "../locale-context";

export function RemoveOrgMemberButton({
  orgId,
  userId,
  onChanged,
}: {
  orgId: string;
  userId: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    const { error } = await getBrowserClient().rpc("remove_org_member", { p_org_id: orgId, p_user_id: userId });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("toast.memberRemoved"));
    router.refresh();
    onChanged?.();
  }

  return (
    <button className="danger" onClick={handleRemove} disabled={loading}>
      {t("org.remove")}
    </button>
  );
}
