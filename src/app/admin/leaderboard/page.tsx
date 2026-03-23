import { createClient } from "@/lib/supabase/server";
import { LeaderboardAdminClient } from "./LeaderboardAdminClient";

export default async function AdminLeaderboardPage() {
  const supabase = await createClient();

  // Get activity flags (unresolved first, then most recent)
  const { data: flags } = await supabase
    .from("activity_flags")
    .select("*")
    .order("resolved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  // Get league distribution
  const { data: users } = await supabase
    .from("users")
    .select("league, current_streak");

  const leagueDistribution = {
    diamond: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
  };
  let totalActiveUsers = 0;
  let avgStreak = 0;

  if (users) {
    for (const u of users) {
      const league = (u.league || "bronze") as keyof typeof leagueDistribution;
      if (league in leagueDistribution) leagueDistribution[league]++;
      if ((u.current_streak || 0) > 0) {
        totalActiveUsers++;
        avgStreak += u.current_streak || 0;
      }
    }
    if (totalActiveUsers > 0) avgStreak = Math.round(avgStreak / totalActiveUsers);
  }

  // Get leaderboard rewards config
  const { data: rewards } = await supabase
    .from("leaderboard_rewards")
    .select("*")
    .order("league")
    .order("rank_min");

  // Get recent reward cost estimate (credit_transactions with type leaderboard_reward or streak_reward)
  const { data: recentRewards } = await supabase
    .from("credit_transactions")
    .select("amount_cents, type")
    .in("type", ["leaderboard_reward", "streak_reward"])
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const monthlyRewardCost = (recentRewards || []).reduce(
    (sum, r) => sum + r.amount_cents,
    0
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="mt-1 text-gray-600">
          League health, activity flags, and reward costs.
        </p>
      </div>
      <LeaderboardAdminClient
        flags={flags || []}
        leagueDistribution={leagueDistribution}
        totalActiveUsers={totalActiveUsers}
        avgStreak={avgStreak}
        rewards={rewards || []}
        monthlyRewardCost={monthlyRewardCost}
      />
    </div>
  );
}
