"use client";

import { createClient } from "@/lib/supabase/client";

export interface IdentityResult {
  success: boolean;
  error: string | null;
}

/**
 * Start linking a Google identity to the currently signed-in account. Like
 * `signInWithOAuth`, this redirects the browser to Google and returns via
 * `/auth/callback` (which exchanges the code), so on success the caller never
 * runs past this point. Requires "Manual linking" to be enabled on the Supabase
 * project — if it isn't, the returned error surfaces that.
 */
export async function connectGoogle(): Promise<IdentityResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // On success the browser is already navigating to Google.
  return { success: true, error: null };
}

/**
 * Unlink a provider identity from the current account. Guarded so the user can
 * never remove their only way back in: Supabase itself refuses to unlink the
 * last identity, but we check first to give a clear message instead of a raw
 * API error. After a successful unlink the caller should refresh so the server
 * re-reads the identity list.
 */
export async function disconnectProvider(
  provider: string
): Promise<IdentityResult> {
  const supabase = createClient();

  const { data, error: listError } = await supabase.auth.getUserIdentities();
  if (listError) {
    return { success: false, error: listError.message };
  }

  const identities = data?.identities ?? [];

  if (identities.length <= 1) {
    return {
      success: false,
      error:
        "This is your only way to sign in. Set a password first so you can still log in.",
    };
  }

  const identity = identities.find((i) => i.provider === provider);
  if (!identity) {
    return { success: false, error: "That account is not connected." };
  }

  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
