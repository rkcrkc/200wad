import { createClient } from "@/lib/supabase/server";

export interface LearningLanguage {
  id: string;
  name: string;
  flag: string;
  isCurrent: boolean;
  courseCount: number;
}

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
  twoFactorEnabled: boolean;
  createdAt: string;
  learningLanguages: LearningLanguage[];
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

  // Fetch user's learning languages with course counts
  const { data: userLanguages, error: langError } = await supabase
    .from("user_languages")
    .select(
      `
      language_id,
      is_current,
      languages!inner (
        id,
        name,
        flag
      )
    `
    )
    .eq("user_id", user.id);

  if (langError) {
    console.error("Error fetching user languages:", langError);
  }

  // Get course counts for each language
  const languageIds = userLanguages?.map((ul) => ul.language_id) || [];
  let courseCounts: Record<string, number> = {};

  if (languageIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("language_id")
      .in("language_id", languageIds);

    if (courses) {
      courseCounts = courses.reduce(
        (acc, course) => {
          const langId = course.language_id;
          if (langId) {
            acc[langId] = (acc[langId] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  // Transform learning languages data
  const learningLanguages: LearningLanguage[] = (userLanguages || []).map(
    (ul) => {
      const lang = ul.languages as unknown as {
        id: string;
        name: string;
        flag: string;
      };
      const langId = ul.language_id;
      return {
        id: lang.id,
        name: lang.name,
        flag: lang.flag,
        isCurrent: ul.is_current ?? false,
        courseCount: langId ? (courseCounts[langId] || 0) : 0,
      };
    }
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
    twoFactorEnabled: profile.two_factor_enabled || false,
    createdAt: profile.created_at || new Date().toISOString(),
    learningLanguages,
  };

  return { settings, isGuest: false, error: null };
}
