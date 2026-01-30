"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
          <h1 className="text-xl-semibold text-foreground">Check your email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click the link to
            activate your account.
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
          <h1 className="text-xxl-bold text-foreground">Create an account</h1>
          <p className="text-muted-foreground mt-2">Start learning 200 words a day</p>
        </div>

        <form onSubmit={handleSignup} className="mt-8 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
          )}

          <div className="space-y-4">
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

            <div>
              <label htmlFor="password" className="text-small-semibold text-foreground block">
                Password
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
                Confirm Password
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
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
