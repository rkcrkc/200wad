"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <div className="border-border bg-card w-full max-w-md space-y-6 rounded-2xl border p-8 text-center shadow-lg">
          <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-primary h-8 w-8"
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
          <h1 className="text-xl-semibold text-foreground">Check your email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a password reset link to <strong>{email}</strong>. Click the link to
            reset your password.
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-4">
              Back to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
      <div className="border-border bg-card w-full max-w-md space-y-8 rounded-2xl border p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-xxl-bold text-foreground">Forgot password?</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="text-small-semibold text-foreground block">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 mt-1 block w-full rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Remember your password?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
