"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase-browser";
import { PublicLocaleProvider, usePublicLocale } from "../public-locale";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function AuthPage() {
  return (
    <PublicLocaleProvider>
      <Suspense>
        <AuthForm />
      </Suspense>
    </PublicLocaleProvider>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t, setLocale } = usePublicLocale();
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await getBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message || t("auth.errOAuth"));
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getBrowserClient();
    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message || t("auth.errGeneric"));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-page-glow" />
      <div className="auth-lang-switcher language-switcher">
        <button
          className={`flag-button ${locale === "en" ? "flag-button-active" : ""}`}
          onClick={() => setLocale("en")}
          title="English"
          aria-label="English"
        >
          🇬🇧
        </button>
        <button
          className={`flag-button ${locale === "fr" ? "flag-button-active" : ""}`}
          onClick={() => setLocale("fr")}
          title="Français"
          aria-label="Français"
        >
          🇫🇷
        </button>
      </div>

      <div className="auth-content">
        <Link href="/" className="auth-logo">
          <Image src="/MCP-MD-Sharing-logo1.png" alt="MCP-MD-Sharing" width={64} height={64} priority />
        </Link>

        <div className="auth-card">
          <h1>{isSignup ? t("auth.createTitle") : t("auth.loginTitle")}</h1>
          <p className="auth-card-sub">{isSignup ? t("auth.createSub") : t("auth.loginSub")}</p>

          <button
            type="button"
            className="auth-oauth-btn"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? <span className="auth-spinner" /> : <GoogleIcon />}
            {t("auth.continueWithGoogle")}
          </button>

          <div className="auth-divider">
            <span />
            <span>{t("auth.or")}</span>
            <span />
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              {t("auth.email")}
              <br />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              {t("auth.password")}
              <br />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading || googleLoading}>
              {isSignup ? t("auth.createBtn") : t("auth.loginBtn")}
            </button>
          </form>

          <p className="auth-toggle">
            {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsSignup(!isSignup);
              }}
            >
              {isSignup ? t("auth.toLogin") : t("auth.toCreate")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
