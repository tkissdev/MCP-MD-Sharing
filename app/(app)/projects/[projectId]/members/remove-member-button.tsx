"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "../../../locale-context";

export function RemoveProjectMemberButton({
  projectId,
  userId,
  onChanged,
}: {
  projectId: string;
  userId: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    await getBrowserClient().rpc("remove_project_member", { p_project_id: projectId, p_user_id: userId });
    setLoading(false);
    router.refresh();
    onChanged?.();
  }

  return (
    <button className="danger" onClick={handleRemove} disabled={loading}>
      {t("org.remove")}
    </button>
  );
}
