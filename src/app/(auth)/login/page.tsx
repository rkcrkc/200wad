"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import {
  AUTH_CARD,
  AUTH_ERROR,
  AUTH_FIELD,
  AUTH_LABEL,
  AUTH_SUBMIT,
  AuthDivider,
} from "@/components/auth/authBrand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Push to root so the server-side smart redirect lands the user on
    // their last active course (users.current_course_id), falling back
    // to /dashboard if none is set.
    router.push("/");
    router.refresh();
  };

  return (
    <div className={AUTH_CARD}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="heading-l text-[var(--ink)]">Welcome back</h1>
          <p className="body text-[var(--ink-soft)]">Sign in to continue learning</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
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
            <div className="flex items-center justify-between">
              <label htmlFor="password" className={AUTH_LABEL}>
                Password
              </label>
              <Link
                href="/forgot-password"
                className="label-heavy text-[var(--accent)] !no-underline hover:opacity-70"
              >
                Forgot password?
              </Link>
            </div>
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

          <button type="submit" disabled={loading} className={AUTH_SUBMIT}>
            {loading ? (
              "Signing in…"
            ) : (
              <>
                Sign in <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <AuthDivider />

        <SocialLoginButtons mode="signin" />

        <p className="body text-center text-[var(--ink-soft)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="label-heavy text-[var(--accent)]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
