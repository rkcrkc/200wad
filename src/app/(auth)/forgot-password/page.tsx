"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_CARD,
  AUTH_ERROR,
  AUTH_FIELD,
  AUTH_LABEL,
  AUTH_SUBMIT,
} from "@/components/auth/authBrand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
            <svg
              className="h-8 w-8 text-[var(--accent)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="heading-l text-[var(--ink)]">Check your email</h1>
            <p className="body text-[var(--ink-soft)]">
              We&apos;ve sent a password reset link to <strong>{email}</strong>. Click the link to
              reset your password.
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
          <h1 className="heading-l text-[var(--ink)]">Forgot password?</h1>
          <p className="body text-[var(--ink-soft)]">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

          <button type="submit" disabled={loading} className={AUTH_SUBMIT}>
            {loading ? (
              "Sending…"
            ) : (
              <>
                Send reset link <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <p className="body text-center text-[var(--ink-soft)]">
          Remember your password?{" "}
          <Link href="/login" className="label-heavy text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
