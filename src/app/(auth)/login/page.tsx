"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
      <div className="border-border bg-card w-full max-w-md space-y-8 rounded-2xl border p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-xl-semibold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to continue learning</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-small-semibold text-foreground block">
                  Password
                </label>
                <Link href="/forgot-password" className="text-primary text-sm hover:underline">
                  Forgot password?
                </Link>
              </div>
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
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
