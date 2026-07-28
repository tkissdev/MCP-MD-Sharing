"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase-browser";
import { useLocale } from "../locale-context";

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function CreateApiKeyForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (insecure context, browser/site
      // settings) — the key is still fully visible above to copy by hand.
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const rawKey = "mcpmd_" + randomHex(24);
    const keyHash = await sha256Hex(rawKey);
    const supabase = getBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("api_keys").insert({
      user_id: user!.id,
      name,
      key_prefix: rawKey.slice(0, 12),
      key_hash: keyHash,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    setCreatedKey(rawKey);
    setName("");
    router.refresh();
  }

  if (createdKey) {
    return (
      <div>
        <p>{t("apiKeys.copyNotice")}</p>
        <pre className="card">{createdKey}</pre>
        <div className="row">
          <button onClick={handleCopy}>{copied ? t("common.copied") : t("common.copy")}</button>
          <button onClick={() => (onDone ? onDone() : setCreatedKey(null))}>{t("apiKeys.done")}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {t("apiKeys.name")}
        <br />
        <input required placeholder="My laptop" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {t("apiKeys.create")}
      </button>
    </form>
  );
}
