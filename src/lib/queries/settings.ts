import { createClient } from "@/lib/supabase/server";

export interface UserSettings {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  hometown: string | null;
  location: string | null;
  nationalities: string[];
  wordsPerDay: number;
  /** Daily XP goal used by the header ring + 50/100% threshold toasts. */
  dailyXpGoal: number;
  /** Promotional-email consent: true = opted in, false = declined, null = undecided. */
  marketingEmailConsent: boolean | null;
  createdAt: string;
  /**
   * OAuth/login identities linked to this account, deduped by provider — e.g.
   * `["google"]` for a Google-only account, `["email"]` for a password account,
   * or both once linked. Drives the Security section's Connected accounts UI and
   * the "managed by Google" email treatment. Sourced from the auth user's
   * `identities`, not the `users` table.
   */
  providers: string[];
  /** True when a password (`email`) identity exists — i.e. the user can sign in without OAuth. */
  hasPassword: boolean;
  /** True when a Google identity is linked. */
  googleConnected: boolean;
  /**
   * The address of an in-flight email change awaiting confirmation, or null if
   * none is pending. Comes from the auth user's `new_email` (GoTrue's
   * `email_change` column). With Secure email change on, the change only
   * completes once both the current and new inboxes confirm, at which point
   * this clears on its own.
   */
  pendingEmail: string | null;
}

export interface GetUserSettingsResult {
  settings: UserSettings | null;
  isGuest: boolean;
  error: string | null;
}

export async function getUserSettings(): Promise<GetUserSettingsResult> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { settings: null, isGuest: true, error: null };
  }

  // Fetch user profile from users table
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return { settings: null, isGuest: false, error: profileError.message };
  }

  // Login identities live on the auth user, not the users table. Dedupe by
  // provider so the UI reasons about "has Google" / "has password" rather than
  // raw identity rows.
  const providers = Array.from(
    new Set((user.identities ?? []).map((identity) => identity.provider))
  );

  const settings: UserSettings = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    website: profile.website,
    hometown: profile.hometown,
    location: profile.location,
    nationalities: profile.nationalities || [],
    wordsPerDay: profile.words_per_day || 10,
    dailyXpGoal: profile.daily_xp_goal ?? 30,
    marketingEmailConsent: profile.marketing_email_consent ?? null,
    createdAt: profile.created_at || new Date().toISOString(),
    providers,
    hasPassword: providers.includes("email"),
    googleConnected: providers.includes("google"),
    pendingEmail: user.new_email ?? null,
  };

  return { settings, isGuest: false, error: null };
}
