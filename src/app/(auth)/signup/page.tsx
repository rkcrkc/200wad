"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { getPasswordError } from "@/lib/validations/auth";
import {
  AUTH_CARD,
  AUTH_ERROR,
  AUTH_FIELD,
  AUTH_LABEL,
  AUTH_SUBMIT,
  AuthDivider,
} from "@/components/auth/authBrand";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Capture referral code from URL (?ref=CODE or from /join/CODE redirect)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("referral_code", ref);
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        data: { marketing_consent: marketingConsent },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Already-registered email: Supabase returns a fake success with no identities
    // and sends no email, so don't show "check your inbox" — the link never arrives.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Try signing in instead.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className={`${AUTH_CARD} text-center`}>
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
            <svg
              className="h-8 w-8 text-[var(--success)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="heading-l text-[var(--ink)]">Check your email</h1>
            <p className="body text-[var(--ink-soft)]">
              We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click the link to
              activate your account.
            </p>
          </div>
          <Link href="/login" className="btn ghost">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={AUTH_CARD}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="heading-l text-[var(--ink)]">Create an account</h1>
          <p className="body text-[var(--ink-soft)]">Start learning 200 words a day</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          {error && <div className={AUTH_ERROR}>{error}</div>}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={AUTH_LABEL}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={AUTH_FIELD}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={AUTH_LABEL}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={AUTH_FIELD}
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className={AUTH_LABEL}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={AUTH_FIELD}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className={AUTH_SUBMIT}>
            {loading ? (
              "Creating account…"
            ) : (
              <>
                Create account <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <AuthDivider />

        <SocialLoginButtons mode="signup" marketingConsent={marketingConsent} />

        {/* Optional marketing opt-in — its own borderless beige card, below both
            signup methods since it applies to either. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-[16px] bg-[var(--marker)] p-4">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-[15px] font-medium leading-[1.5] text-[var(--ink)]">
            Email me learning tips and product news. Optional — you can unsubscribe anytime.
          </span>
        </label>

        <p className="text-center text-[13px] leading-[1.5] text-[var(--ink-soft)]">
          By creating an account, you confirm you&rsquo;re 16 or older and agree to our{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)]"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)]"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <p className="body text-center text-[var(--ink-soft)]">
          Already have an account?{" "}
          <Link href="/login" className="label-heavy text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
