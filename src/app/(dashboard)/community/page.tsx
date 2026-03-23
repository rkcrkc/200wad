import { PageContainer } from "@/components/PageContainer";
import { LeaderboardClient } from "@/components/community/LeaderboardClient";
import { getLeaderboard, getLeaderboardRewards, getPersonalBests } from "@/lib/queries/leaderboard";
import { createClient } from "@/lib/supabase/server";

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get the user's current language
  let languageId: string | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("current_language_id")
      .eq("id", user.id)
      .single();
    languageId = userData?.current_language_id || null;
  }

  // Fetch initial data if we have a language
  const initialData = languageId
    ? await getLeaderboard(languageId, "avg_words_per_day", "week")
    : { entries: [], userPosition: null };

  const rewards = await getLeaderboardRewards();
  const personalBests = languageId ? await getPersonalBests(languageId) : null;

  // Get user's streak info
  let userStreak = 0;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("current_streak")
      .eq("id", user.id)
      .single();
    userStreak = userData?.current_streak || 0;
  }

  return (
    <PageContainer size="md">
      <LeaderboardClient
        initialData={initialData}
        rewards={rewards}
        personalBests={personalBests}
        languageId={languageId}
        userStreak={userStreak}
      />
    </PageContainer>
  );
}
