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
  twoFactorEnabled: boolean;
  createdAt: string;
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
    twoFactorEnabled: profile.two_factor_enabled || false,
    createdAt: profile.created_at || new Date().toISOString(),
  };

  return { settings, isGuest: false, error: null };
}
