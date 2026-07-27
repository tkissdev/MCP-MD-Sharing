"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "./locale-context";

export function CreateOrgForm({
  redirectTo,
  onCreated,
}: {
  redirectTo?: string;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await getBrowserClient().rpc("create_organization", { p_name: name });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    setName("");
    if (onCreated) {
      router.refresh();
      onCreated();
    } else {
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {t("org.name")}
        <br />
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {t("org.create")}
      </button>
    </form>
  );
}
