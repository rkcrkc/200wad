"use client";

import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

export type OAuthProvider = "google" | "facebook" | "apple";

export async function signInWithOAuth(provider: OAuthProvider) {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    throw error;
  }
}
