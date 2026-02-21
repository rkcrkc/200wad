"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const router = useRouter();
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
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
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No valid session - show error
  if (!hasSession) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <div className="border-border bg-card w-full max-w-md space-y-6 rounded-2xl border p-8 text-center shadow-lg">
          <div className="bg-destructive/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-destructive h-8 w-8"
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
          <h1 className="text-xl-semibold text-foreground">Invalid or expired link</h1>
          <p className="text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button className="mt-4">Request new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <div className="border-border bg-card w-full max-w-md space-y-6 rounded-2xl border p-8 text-center shadow-lg">
          <div className="bg-success/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-success h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl-semibold text-foreground">Password updated</h1>
          <p className="text-muted-foreground">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Link href="/login">
            <Button className="mt-4">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
      <div className="border-border bg-card w-full max-w-md space-y-8 rounded-2xl border p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-xl-semibold text-foreground">Reset password</h1>
          <p className="text-muted-foreground mt-2">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="text-small-semibold text-foreground block">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 mt-1 block w-full rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-small-semibold text-foreground block"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 mt-1 block w-full rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
