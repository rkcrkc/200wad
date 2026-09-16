"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPasswordError } from "@/lib/validations/auth";
import {
  AUTH_CARD,
  AUTH_ERROR,
  AUTH_FIELD,
  AUTH_LABEL,
  AUTH_SUBMIT,
} from "@/components/auth/authBrand";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    checkSession();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Sign out after password reset to force re-login
    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);
  };

  // Loading state while checking session
  if (hasSession === null) {
    return <div className="body text-[var(--ink-soft)]">Loading…</div>;
  }

  // No valid session - show error
  if (!hasSession) {
    return (
      <div className={`${AUTH_CARD} text-center`}>
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--destructive)]/10">
            <svg
              className="h-8 w-8 text-[var(--destructive)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="heading-l text-[var(--ink)]">Invalid or expired link</h1>
            <p className="body text-[var(--ink-soft)]">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <Link href="/forgot-password" className="btn">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  // Success state
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
            <h1 className="heading-l text-[var(--ink)]">Password updated</h1>
            <p className="body text-[var(--ink-soft)]">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
          <Link href="/login" className="btn">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={AUTH_CARD}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="heading-l text-[var(--ink)]">Reset password</h1>
          <p className="body text-[var(--ink-soft)]">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <div className={AUTH_ERROR}>{error}</div>}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={AUTH_LABEL}>
              New Password
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
              Confirm New Password
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
              "Updating…"
            ) : (
              <>
                Update password <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
