import { createClient } from "@/lib/supabase/server";
import { getCourses, type CourseWithProgress } from "./courses";

export interface LearningLanguageCourse {
  id: string;
  name: string;
  status: "not-started" | "learning" | "mastered";
  progressPercent: number;
  /** True when this is the user's selected course (users.current_course_id) */
  isCurrent: boolean;
}

export interface LearningLanguage {
  id: string;
  name: string;
  code: string;
  isCurrent: boolean;
  courseCount: number;
  courses: LearningLanguageCourse[];
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
  /** Daily XP goal used by the header ring + 50/100% threshold toasts. */
  dailyXpGoal: number;
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
        code
      )
    `
    )
    .eq("user_id", user.id);

  if (langError) {
    console.error("Error fetching user languages:", langError);
  }

  // Fetch each language's courses (with status + progress) in parallel, reusing
  // the same query the Courses page uses so progress stays consistent. The
  // selected course (currentCourseId) also tells us which language is current.
  const languageIds = (userLanguages || [])
    .map((ul) => ul.language_id)
    .filter((id): id is string => !!id);

  const courseResults = await Promise.all(
    languageIds.map((id) => getCourses(id))
  );
  const coursesByLanguage: Record<string, CourseWithProgress[]> = {};
  let currentCourseId: string | null = null;
  languageIds.forEach((id, i) => {
    coursesByLanguage[id] = courseResults[i].courses;
    if (!currentCourseId && courseResults[i].currentCourseId) {
      currentCourseId = courseResults[i].currentCourseId;
    }
  });

  // Transform learning languages data
  const learningLanguages: LearningLanguage[] = (userLanguages || []).map(
    (ul) => {
      const lang = ul.languages as unknown as {
        id: string;
        name: string;
        code: string;
      };
      const langId = ul.language_id;
      const langCourses = (langId && coursesByLanguage[langId]) || [];
      const courses: LearningLanguageCourse[] = langCourses.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        progressPercent: c.progressPercent,
        isCurrent: c.id === currentCourseId,
      }));
      return {
        id: lang.id,
        name: lang.name,
        code: lang.code,
        // Current language follows the selected course (consistent with My Languages).
        isCurrent: courses.some((c) => c.isCurrent),
        courseCount: courses.length,
        courses,
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
    dailyXpGoal: profile.daily_xp_goal ?? 30,
    twoFactorEnabled: profile.two_factor_enabled || false,
    createdAt: profile.created_at || new Date().toISOString(),
    learningLanguages,
  };

  return { settings, isGuest: false, error: null };
}
