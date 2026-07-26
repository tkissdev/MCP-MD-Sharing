"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { t as translate, type Locale, type TranslationKey } from "@/lib/i18n/dictionary";

const STORAGE_KEY = "mcp-md-sharing-locale";

interface PublicLocaleContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
}

const PublicLocaleContext = createContext<PublicLocaleContextValue | null>(null);

function detectInitial(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "fr" || saved === "en") return saved;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

// Visitors of the public pages (landing, docs, privacy) aren't signed in, so
// there's no user_metadata to persist the choice to — localStorage is enough
// here, unlike the authenticated LocaleProvider in app/(app)/locale-context.tsx.
export function PublicLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectInitial());
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  return (
    <PublicLocaleContext.Provider value={{ locale, t: (key) => translate(locale, key), setLocale }}>
      {children}
    </PublicLocaleContext.Provider>
  );
}

export function usePublicLocale() {
  const ctx = useContext(PublicLocaleContext);
  if (!ctx) throw new Error("usePublicLocale must be used within a PublicLocaleProvider");
  return ctx;
}
