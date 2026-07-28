"use client";

import { useLocale } from "./locale-context";

export function LanguageSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`language-switcher ${collapsed ? "language-switcher-collapsed" : ""}`}>
      <button
        className={`flag-button ${locale === "en" ? "flag-button-active" : ""}`}
        onClick={() => setLocale("en")}
        aria-label="English"
        data-tooltip="English"
      >
        🇬🇧
      </button>
      <button
        className={`flag-button ${locale === "fr" ? "flag-button-active" : ""}`}
        onClick={() => setLocale("fr")}
        aria-label="Français"
        data-tooltip="Français"
      >
        🇫🇷
      </button>
    </div>
  );
}
