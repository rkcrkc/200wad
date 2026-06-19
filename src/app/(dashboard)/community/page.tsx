import { PageContainer } from "@/components/PageContainer";
import { LeaderboardClient } from "@/components/community/LeaderboardClient";
import {
  getDistinctLessonsTested,
  getLeaderboard,
  getLeagueRoom,
  getLeagueRewards,
  getPersonalBests,
} from "@/lib/queries/leaderboard";
import { getPlatformConfig } from "@/lib/utils/accessControl";

export default async function CommunityPage() {
  // Weekly tab = the user's live league room; All-time tab = the flat global XP
  // board (cross-language, reference only). Both preloaded so tab switches are
  // instant. `distinctLessonsTested` (null = guest) + `minLessons` drive the
  // weekly-leagues unlock gate.
  const [initialRoom, initialAllTime, rewards, distinctLessonsTested, minLessons] =
    await Promise.all([
      getLeagueRoom(),
      getLeaderboard(null, "xp", "all-time"),
      getLeagueRewards(),
      getDistinctLessonsTested(),
      getPlatformConfig<number>("min_lessons_tested_to_join_leagues"),
    ]);
  const personalBests = await getPersonalBests();

  return (
    <PageContainer size="md">
      <LeaderboardClient
        initialRoom={initialRoom}
        initialAllTime={initialAllTime}
        rewards={rewards}
        personalBests={personalBests}
        distinctLessonsTested={distinctLessonsTested}
        minLessonsToJoin={minLessons ?? 3}
      />
    </PageContainer>
  );
}
