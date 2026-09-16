"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_ERROR } from "@/components/auth/authBrand";

interface SocialLoginButtonsProps {
  mode: "signup" | "signin";
  /**
   * Signup only: the marketing-consent checkbox state, carried through the OAuth
   * round-trip as `?consent=1` so the callback can record the opt-in for the new
   * user (OAuth can't set user_metadata before the account is created).
   */
  marketingConsent?: boolean;
}

export function SocialLoginButtons({ mode, marketingConsent = false }: SocialLoginButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);

    // Sign-up mirrors the email flow into onboarding; sign-in defers to the root
    // smart-redirect (last course, else dashboard). Consent only rides along on
    // sign-up, and only when opted in — the callback never flips an existing
    // opt-in back off.
    const next = mode === "signup" ? "/onboarding" : "/";
    const params = new URLSearchParams({ next });
    if (mode === "signup" && marketingConsent) {
      params.set("consent", "1");
    }
    const redirectTo = `${window.location.origin}/auth/callback?${params.toString()}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    // On success the browser navigates away to Google, so we only land here on
    // error and can surface it without resetting a now-irrelevant redirect.
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && <div className={AUTH_ERROR}>{error}</div>}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="btn ghost big w-full text-center disabled:pointer-events-none disabled:opacity-60"
      >
        <span className="inline-flex items-center justify-center gap-2.5 align-middle">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </span>
      </button>
    </div>
  );
}
