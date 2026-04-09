"use client";

import { useState, useTransition } from "react";
import { useCourseContext } from "@/context/CourseContext";
import {
  Zap,
  GraduationCap,
  Flame,
  Crown,
  Medal,
  TrendingUp,
  X,
  Gift,
  Trophy,
  DollarSign,
} from "lucide-react";
import type {
  LeaderboardData,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardReward,
} from "@/lib/queries/leaderboard";
import { fetchLeaderboardData } from "@/lib/mutations/leaderboard";
import { PersonalBestsCard } from "./PersonalBestsCard";

// ============================================================================
// TYPES
// ============================================================================

type MetricType = "avg_words_per_day" | "words_mastered" | "streak";
type TimePeriod = "week" | "all-time";

interface LeaderboardClientProps {
  initialData: LeaderboardData;
  rewards: LeaderboardReward[];
  personalBests: {
    bestDayWords: number;
    bestWeekWords: number;
    highestStreak: number;
  } | null;
  languageId: string | null;
  userStreak: number;
}

// ============================================================================
// MOCK DATA FALLBACK
// ============================================================================

interface MockUser {
  rank: number;
  name: string;
  avatar: string;
  avatarBg: string;
  country: string;
  avgWordsPerDay: number;
  weeklyAvgWordsPerDay: number;
  wordsMastered: number;
  weeklyWordsMastered: number;
  streak: number;
}

const MOCK_USERS: MockUser[] = [
  { rank: 1, name: "sofia_learns", avatar: "\u{1F920}", avatarBg: "bg-green-100", country: "\u{1F1EA}\u{1F1F8}", avgWordsPerDay: 18.5, weeklyAvgWordsPerDay: 21.0, wordsMastered: 485, weeklyWordsMastered: 147, streak: 45 },
  { rank: 2, name: "lucas_polyglot", avatar: "\u{1F913}", avatarBg: "bg-purple-100", country: "\u{1F1E7}\u{1F1F7}", avgWordsPerDay: 16.8, weeklyAvgWordsPerDay: 19.0, wordsMastered: 420, weeklyWordsMastered: 133, streak: 38 },
  { rank: 3, name: "marco_rossi", avatar: "\u{1F60E}", avatarBg: "bg-pink-100", country: "\u{1F1EE}\u{1F1F9}", avgWordsPerDay: 15.4, weeklyAvgWordsPerDay: 17.7, wordsMastered: 390, weeklyWordsMastered: 124, streak: 42 },
  { rank: 4, name: "emma_in_spain", avatar: "\u{1F60A}", avatarBg: "bg-blue-100", country: "\u{1F1EC}\u{1F1E7}", avgWordsPerDay: 14.1, weeklyAvgWordsPerDay: 16.0, wordsMastered: 360, weeklyWordsMastered: 112, streak: 35 },
  { rank: 5, name: "yuki_tanaka", avatar: "\u{1F38C}", avatarBg: "bg-red-100", country: "\u{1F1EF}\u{1F1F5}", avgWordsPerDay: 13.5, weeklyAvgWordsPerDay: 14.5, wordsMastered: 320, weeklyWordsMastered: 102, streak: 52 },
  { rank: 6, name: "pierre_leroux", avatar: "\u{1F9D0}", avatarBg: "bg-indigo-100", country: "\u{1F1EB}\u{1F1F7}", avgWordsPerDay: 12.3, weeklyAvgWordsPerDay: 13.3, wordsMastered: 280, weeklyWordsMastered: 93, streak: 28 },
  { rank: 7, name: "anna_schmidt", avatar: "\u{1F4AA}", avatarBg: "bg-yellow-100", country: "\u{1F1E9}\u{1F1EA}", avgWordsPerDay: 11.7, weeklyAvgWordsPerDay: 12.1, wordsMastered: 250, weeklyWordsMastered: 85, streak: 31 },
  { rank: 8, name: "diego_mx", avatar: "\u{1F32E}", avatarBg: "bg-orange-100", country: "\u{1F1F2}\u{1F1FD}", avgWordsPerDay: 10.4, weeklyAvgWordsPerDay: 11.4, wordsMastered: 220, weeklyWordsMastered: 80, streak: 22 },
  { rank: 9, name: "sarah_nyc", avatar: "\u{1F4DA}", avatarBg: "bg-teal-100", country: "\u{1F1FA}\u{1F1F8}", avgWordsPerDay: 9.1, weeklyAvgWordsPerDay: 10.2, wordsMastered: 190, weeklyWordsMastered: 71, streak: 19 },
  { rank: 10, name: "chen_wei", avatar: "\u{1F393}", avatarBg: "bg-cyan-100", country: "\u{1F1E8}\u{1F1F3}", avgWordsPerDay: 8.8, weeklyAvgWordsPerDay: 9.8, wordsMastered: 170, weeklyWordsMastered: 69, streak: 16 },
];

const MOCK_CURRENT_USER: MockUser = {
  rank: 19, name: "You", avatar: "\u{1F60A}", avatarBg: "bg-orange-100", country: "\u{1F1FA}\u{1F1F8}",
  avgWordsPerDay: 5.3, weeklyAvgWordsPerDay: 6.9, wordsMastered: 42, weeklyWordsMastered: 28,
  streak: 12,
};

function getMockMetricValue(user: MockUser, metric: MetricType, period: TimePeriod): number {
  switch (metric) {
    case "avg_words_per_day":
      return period === "week" ? user.weeklyAvgWordsPerDay : user.avgWordsPerDay;
    case "words_mastered":
      return period === "week" ? user.weeklyWordsMastered : user.wordsMastered;
    case "streak":
      return user.streak;
  }
}

// ============================================================================
// METRIC CONFIG
// ============================================================================

const METRICS: { id: MetricType; label: string; icon: typeof Zap; unit: string }[] = [
  { id: "avg_words_per_day", label: "Avg Words/Day", icon: Zap, unit: "Avg/Day" },
  { id: "words_mastered", label: "Words Mastered", icon: GraduationCap, unit: "Mastered" },
  { id: "streak", label: "Streak", icon: Flame, unit: "Days" },
];

// ============================================================================
// HELPERS
// ============================================================================

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-medium text-gray-400">#{rank}</span>;
}

function formatMetricValue(value: number, metric: MetricType): string {
  if (metric === "avg_words_per_day") return value.toFixed(1);
  return value.toLocaleString();
}

function getRewardForRank(rank: number, rewards: LeaderboardReward[]): number | null {
  // Match rewards for "bronze" league (default for all users currently)
  const reward = rewards.find(
    (r) => r.league === "bronze" && rank >= r.rank_min && rank <= r.rank_max
  );
  return reward ? reward.reward_cents : null;
}

function UserAvatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatar_url) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={entry.avatar_url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  // Emoji fallback based on user ID hash
  const emojis = ["\u{1F60A}", "\u{1F920}", "\u{1F913}", "\u{1F60E}", "\u{1F4AA}", "\u{1F393}", "\u{1F4DA}", "\u{1F9D0}"];
  const idx = entry.user_id.charCodeAt(0) % emojis.length;
  const bgColors = ["bg-green-100", "bg-purple-100", "bg-pink-100", "bg-blue-100", "bg-yellow-100", "bg-red-100", "bg-indigo-100", "bg-orange-100"];
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColors[idx]}`}>
      <span className="text-xl">{emojis[idx]}</span>
    </div>
  );
}

function NationalityFlags({ nationalities }: { nationalities: string[] }) {
  if (!nationalities || nationalities.length === 0) return null;
  // Show at most 2 flags
  return <span className="text-sm leading-tight">{nationalities.slice(0, 2).join(" ")}</span>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeaderboardClient({
  initialData,
  rewards,
  personalBests,
  languageId,
  userStreak,
}: LeaderboardClientProps) {
  const { languageName } = useCourseContext();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("avg_words_per_day");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const [showRewards, setShowRewards] = useState(true);
  const [data, setData] = useState<LeaderboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  const useMockData = data.entries.length < 5;

  const metric = METRICS.find((m) => m.id === selectedMetric)!;
  const MetricIcon = metric.icon;
  const periodLabel = timePeriod === "week" ? "This Week" : "All-Time";

  const handleMetricChange = (newMetric: MetricType) => {
    setSelectedMetric(newMetric);
    if (languageId) {
      const period: LeaderboardPeriod = timePeriod === "all-time" ? "all-time" : "week";
      startTransition(async () => {
        const result = await fetchLeaderboardData(languageId, newMetric, period);
        setData(result);
      });
    }
  };

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    if (languageId) {
      const period: LeaderboardPeriod = newPeriod === "all-time" ? "all-time" : "week";
      startTransition(async () => {
        const result = await fetchLeaderboardData(languageId, selectedMetric, period);
        setData(result);
      });
    }
  };

  // Get top reward amount for the banner
  const bronzeRewards = rewards.filter((r) => r.league === "bronze");
  const topRewardCents = bronzeRewards.length > 0 ? Math.max(...bronzeRewards.map((r) => r.reward_cents)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-amber-500" />
          <h1 className="text-3xl font-semibold">
            {languageName ? `${languageName} Leaderboard` : "Leaderboard"}
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          See how you rank against other learners
        </p>
      </div>

      {/* Rewards Banner */}
      {showRewards && bronzeRewards.length > 0 && (
        <div className="relative rounded-2xl border border-green-200 bg-green-50 p-5 pr-10">
          <button
            onClick={() => setShowRewards(false)}
            className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="font-semibold">Weekly Leaderboard Rewards</p>
              <p className="mt-1 text-sm text-gray-600">
                Finish in the top ranks this week and earn account credits.{" "}
                {bronzeRewards
                  .sort((a, b) => a.rank_min - b.rank_min)
                  .map((r) => (
                    <span key={r.rank_min} className="font-medium">
                      {r.rank_min === r.rank_max ? `#${r.rank_min}` : `#${r.rank_min}-${r.rank_max}`}: ${(r.reward_cents / 100).toFixed(0)}
                    </span>
                  ))
                  .reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, <span key={`sep-${i}`}> &middot; </span>, el]), [])}
                . Credits can be used toward any paid plan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Bests */}
      {personalBests && (
        <PersonalBestsCard
          bestDayWords={personalBests.bestDayWords}
          bestWeekWords={personalBests.bestWeekWords}
          highestStreak={personalBests.highestStreak}
        />
      )}

      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMetric === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleMetricChange(m.id)}
              disabled={isPending}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-green-600 text-green-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              } ${isPending ? "opacity-50" : ""}`}
            >
              <Icon
                className={`h-4 w-4 ${isSelected ? "text-green-600" : "text-gray-400"}`}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {/* Card Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex items-start gap-2.5">
            <MetricIcon className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-large-semibold">
                {metric.label} {periodLabel}
              </h2>
              <p className="text-sm text-muted-foreground">
                {useMockData ? "Sample rankings" : "Top learners"}
              </p>
            </div>
          </div>

          {/* Time Period Toggle */}
          <div className="flex items-center rounded-full border border-gray-200 p-0.5">
            <button
              onClick={() => handlePeriodChange("week")}
              disabled={isPending}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                timePeriod === "week"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handlePeriodChange("all-time")}
              disabled={isPending}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                timePeriod === "all-time"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All-Time
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Content */}
        <div className={`px-6 py-6 ${isPending ? "opacity-50 transition-opacity" : ""}`}>
          {/* Your Position */}
          {useMockData ? (
            <MockCurrentUserCard
              metric={selectedMetric}
              period={timePeriod}
              metricLabel={metric.label}
              periodLabel={periodLabel}
              metricUnit={metric.unit}
            />
          ) : data.userPosition ? (
            <RealUserPositionCard
              position={data.userPosition}
              metricLabel={metric.label}
              periodLabel={periodLabel}
              metricUnit={metric.unit}
              metric={selectedMetric}
              userStreak={userStreak}
            />
          ) : null}

          {/* Rankings */}
          <div className="divide-y divide-bone-hover">
            {useMockData
              ? MOCK_USERS.map((user) => (
                  <MockUserRow
                    key={user.rank}
                    user={user}
                    metric={selectedMetric}
                    period={timePeriod}
                    metricUnit={metric.unit}
                    rewards={rewards}
                  />
                ))
              : data.entries.map((entry) => (
                  <RealUserRow
                    key={entry.user_id}
                    entry={entry}
                    metric={selectedMetric}
                    metricUnit={metric.unit}
                    rewards={rewards}
                    period={timePeriod}
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MockCurrentUserCard({
  metric,
  period,
  metricLabel,
  periodLabel,
  metricUnit,
}: {
  metric: MetricType;
  period: TimePeriod;
  metricLabel: string;
  periodLabel: string;
  metricUnit: string;
}) {
  const value = getMockMetricValue(MOCK_CURRENT_USER, metric, period);
  return (
    <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30">
      <div className="flex items-center gap-4 px-4 py-4">
        <span className="w-10 text-center text-lg font-bold text-amber-600">
          #{MOCK_CURRENT_USER.rank}
        </span>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${MOCK_CURRENT_USER.avatarBg}`}>
          <span className="text-xl">{MOCK_CURRENT_USER.avatar}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-700">Your Position</p>
          <p className="text-sm text-muted-foreground">
            {metricLabel} {periodLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{metricUnit}</p>
          <p className="text-xl font-semibold">{formatMetricValue(value, metric)}</p>
        </div>
      </div>
      <div className="border-t border-amber-200 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Keep climbing!</p>
            <p className="text-sm text-muted-foreground">
              Study consistently each day to climb the leaderboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RealUserPositionCard({
  position,
  metricLabel,
  periodLabel,
  metricUnit,
  metric,
  userStreak,
}: {
  position: NonNullable<LeaderboardData["userPosition"]>;
  metricLabel: string;
  periodLabel: string;
  metricUnit: string;
  metric: MetricType;
  userStreak: number;
}) {
  const displayValue = metric === "streak" ? userStreak : position.metric_value;
  return (
    <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30">
      <div className="flex items-center gap-4 px-4 py-4">
        <span className="w-10 text-center text-lg font-bold text-amber-600">
          #{position.rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-700">Your Position</p>
          <p className="text-sm text-muted-foreground">
            {metricLabel} {periodLabel} &middot; {position.total_users} learner{position.total_users !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{metricUnit}</p>
          <p className="text-xl font-semibold">
            {formatMetricValue(displayValue, metric)}
          </p>
        </div>
      </div>
      <div className="border-t border-amber-200 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Keep climbing!</p>
            <p className="text-sm text-muted-foreground">
              Study consistently each day to climb the leaderboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockUserRow({
  user,
  metric,
  period,
  metricUnit,
  rewards,
}: {
  user: MockUser;
  metric: MetricType;
  period: TimePeriod;
  metricUnit: string;
  rewards: LeaderboardReward[];
}) {
  const value = getMockMetricValue(user, metric, period);
  const rewardCents = period === "week" ? getRewardForRank(user.rank, rewards) : null;

  return (
    <div className="flex items-center gap-4 py-4 first:pt-0">
      <div className="flex w-8 shrink-0 justify-center">
        <RankIcon rank={user.rank} />
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${user.avatarBg}`}>
        <span className="text-xl">{user.avatar}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{user.name}</p>
        <p className="text-sm leading-tight">{user.country}</p>
      </div>
      {rewardCents && rewardCents > 0 && period === "week" && (
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
          <DollarSign className="h-3 w-3" />
          ${(rewardCents / 100).toFixed(0)}
        </span>
      )}
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">{metricUnit}</p>
        <p className="text-lg font-semibold">{formatMetricValue(value, metric)}</p>
      </div>
    </div>
  );
}

function RealUserRow({
  entry,
  metric,
  metricUnit,
  rewards,
  period,
}: {
  entry: LeaderboardEntry;
  metric: MetricType;
  metricUnit: string;
  rewards: LeaderboardReward[];
  period: TimePeriod;
}) {
  const rewardCents = period === "week" ? getRewardForRank(entry.rank, rewards) : null;

  return (
    <div className="flex items-center gap-4 py-4 first:pt-0">
      <div className="flex w-8 shrink-0 justify-center">
        <RankIcon rank={entry.rank} />
      </div>
      <UserAvatar entry={entry} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entry.username || entry.name || "Learner"}</p>
        <NationalityFlags nationalities={entry.nationalities} />
      </div>
      {rewardCents && rewardCents > 0 && period === "week" && (
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
          <DollarSign className="h-3 w-3" />
          ${(rewardCents / 100).toFixed(0)}
        </span>
      )}
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">{metricUnit}</p>
        <p className="text-lg font-semibold">{formatMetricValue(entry.metric_value, metric)}</p>
      </div>
    </div>
  );
}
