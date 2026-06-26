"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  Crown,
  Medal,
  TrendingUp,
  Coins,
  ArrowUpDown,
  HelpCircle,
  Lock,
  X,
} from "lucide-react";
import type {
  LeaderboardData,
  LeaderboardEntry,
  LeagueReward,
  LeagueRoom,
  LeagueRoomMember,
} from "@/lib/queries/leaderboard";
import { LevelBadge } from "@/components/levels/LevelBadge";
import { XpIcon } from "@/components/ui/xp-icon";
import { XpBadge } from "@/components/ui/xp-badge";
import { Popover } from "@/components/ui/popover";
import { Tabs, type Tab } from "@/components/ui/tabs";
import { useUser } from "@/context/UserContext";
import { formatNumber } from "@/lib/utils/helpers";

/** localStorage flag: once the learner dismisses the inline tip it stays hidden. */
const LEARNING_TIP_KEY = "leaderboard-learning-tip-dismissed";

// ============================================================================
// TYPES
// ============================================================================

type TimePeriod = "week" | "all-time";

const PERIOD_TABS: Tab[] = [
  { id: "week", label: "This Week" },
  { id: "all-time", label: "All-Time" },
];

interface LeaderboardClientProps {
  /** The signed-in user's weekly league room (null for guests / no tiers). */
  initialRoom: LeagueRoom | null;
  /** Flat global all-time XP board (reference tab). */
  initialAllTime: LeaderboardData;
  rewards: LeagueReward[];
  personalBests: {
    bestRank: number | null;
    bestWeekXp: number;
    bestWeekAt: string | null;
    lifetimeXp: number;
  } | null;
  /**
   * Distinct real lessons the signed-in user has tested. `null` = guest (no
   * weekly tab at all); a number < `minLessonsToJoin` means logged-in but
   * locked (weekly tab shows the lock gate).
   */
  distinctLessonsTested: number | null;
  /** Distinct real lessons required before weekly leagues unlock. */
  minLessonsToJoin: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Podium medal shown inline after the player's name (top 3 only): gold,
 *  silver, bronze. */
function PlaceMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="h-4 w-4 shrink-0 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 shrink-0 text-gray-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 shrink-0 text-amber-700" />;
  return null;
}

/** Coin payout for a rank, or null if the rank earns nothing (outside top 3). */
function coinRewardForRank(
  rank: number,
  bands: LeagueReward[]
): number | null {
  const band = bands.find((b) => rank >= b.rank_min && rank <= b.rank_max);
  return band ? band.coin_reward : null;
}

/**
 * Inline coin pill shown after a podium member's name in the weekly room.
 * Uses the shared "available" (orange/warning) variant — these coins are up for
 * grabs this week, not yet earned (the earned variant is green, on trophies).
 */
function CoinRewardBadge({ coins }: { coins: number }) {
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs-medium text-warning">
      <Coins className="h-3 w-3" strokeWidth={2} />
      {coins}
    </span>
  );
}

/**
 * Shared explainer body for the league rewards: how XP ranks you, the top-3
 * coin payouts, and the weekly promote/relegate movement. Rendered both in the
 * dismissible inline "How it works" callout and the page-title (?) popover —
 * both are white-background surfaces.
 */
function LearningTipBody({
  rewardBands,
  movementText,
}: {
  rewardBands: LeagueReward[];
  movementText: string;
}) {
  return (
    <div className="space-y-2 text-sm text-gray-600">
      <div className="flex items-start gap-2.5">
        <XpIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Your rank is based on XP — the points you score from tests — totalled across every language and course you study.</p>
      </div>
      <div className="flex items-start gap-2.5">
        <Coins
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
          strokeWidth={1.67}
        />
        <p>
          Finish in the top 3 this week to earn coins:{" "}
          {rewardBands.map((band, i) => (
            <span key={band.rank_min} className="font-medium text-gray-700">
              {band.rank_min === band.rank_max
                ? `${ordinal(band.rank_min)} place: `
                : `${ordinal(band.rank_min)}–${ordinal(band.rank_max)} place: `}
              +{band.coin_reward}
              {i < rewardBands.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>
      {movementText && (
        <div className="flex items-start gap-2.5">
          <ArrowUpDown
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
            strokeWidth={1.67}
          />
          <p>{movementText}</p>
        </div>
      )}
    </div>
  );
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th", etc. */
function ordinal(n: number): string {
  const v = n % 100;
  const suffix =
    v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

/**
 * Current Mon–Sun week range as a short label (e.g. "Jun 9 – 15", or
 * "Jun 30 – Jul 6" across a month boundary). Matches the DB's Monday week start.
 */
function currentWeekRangeLabel(): string {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // days since Monday
  const start = new Date(now);
  start.setDate(now.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  return startMonth === endMonth
    ? `${startMonth} ${start.getDate()} – ${end.getDate()}`
    : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

/** Shared column header for the leaderboard tables. */
function ColumnHeader() {
  return (
    <div className="flex items-center gap-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <div className="w-10 shrink-0 text-center">Rank</div>
      <div className="flex-1">Player</div>
      <div className="hidden w-28 shrink-0 sm:block">Level</div>
      <div className="hidden w-36 shrink-0 sm:block">Location</div>
      <div className="flex w-16 shrink-0 items-center justify-end gap-1">
        <XpIcon />
        XP
      </div>
    </div>
  );
}

function UserAvatar({ avatarUrl, userId }: { avatarUrl: string | null; userId: string }) {
  if (avatarUrl) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  // Emoji fallback based on user ID hash
  const emojis = ["\u{1F60A}", "\u{1F920}", "\u{1F913}", "\u{1F60E}", "\u{1F4AA}", "\u{1F393}", "\u{1F4DA}", "\u{1F9D0}"];
  const idx = userId.charCodeAt(0) % emojis.length;
  const bgColors = ["bg-green-100", "bg-purple-100", "bg-pink-100", "bg-blue-100", "bg-yellow-100", "bg-red-100", "bg-indigo-100", "bg-orange-100"];
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColors[idx]}`}>
      <span className="text-xl">{emojis[idx]}</span>
    </div>
  );
}

function CurrentUserAvatar({
  avatarUrl,
  ring = false,
}: {
  avatarUrl: string | null;
  /** Blue brand ring — shown on table rows, omitted in the position callout. */
  ring?: boolean;
}) {
  const ringClass = ring ? " ring-2 ring-primary" : "";
  if (avatarUrl) {
    return (
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100${ringClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full${ringClass}`}
      style={{
        backgroundImage: "linear-gradient(135deg, #2b7fff 0%, #ad46ff 100%)",
      }}
    >
      <span className="text-sm font-normal text-white">You</span>
    </div>
  );
}

/** Rank-belt column cell. Falls back to an em dash when the level isn't resolved. */
function LevelCell({ name, color }: { name: string | null; color: string | null }) {
  return (
    <div className="hidden w-28 shrink-0 sm:block">
      {name ? (
        <LevelBadge name={name} color={color ?? "#9ca3af"} size="sm" />
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </div>
  );
}

/** Location column cell. `users.location` is free-text (e.g. "Bali, Indonesia"). */
function LocationCell({ location }: { location: string | null }) {
  return (
    <div className="hidden w-36 shrink-0 truncate text-sm text-muted-foreground sm:block">
      {location || "—"}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeaderboardClient({
  initialRoom,
  initialAllTime,
  rewards,
  personalBests,
  distinctLessonsTested,
  minLessonsToJoin,
}: LeaderboardClientProps) {
  const { user, avatarUrl: currentUserAvatarUrl } = useUser();

  // Inline tip shows by default and stays dismissed across visits (the same
  // content is always available via the title's (?) tooltip). Read once via a
  // lazy initializer (SSR-safe) so we don't setState in an effect.
  const [tipDismissed, setTipDismissed] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(LEARNING_TIP_KEY) === "1"
  );
  const dismissTip = () => {
    setTipDismissed(true);
    try {
      localStorage.setItem(LEARNING_TIP_KEY, "1");
    } catch {
      /* private mode / quota — tip simply reappears next visit */
    }
  };

  // Three states distinguished by (logged-in?, room?):
  //   * Guest          — distinctLessonsTested === null → All-time only, no toggle.
  //   * Locked         — logged in, under threshold, RPC returned no room → toggle
  //                      shown, weekly tab is the lock gate, All-time open.
  //   * Unlocked       — initialRoom !== null → weekly room / teaser (unchanged).
  const isLoggedIn = distinctLessonsTested !== null;
  const isLocked = isLoggedIn && initialRoom === null;
  const canWeek = initialRoom !== null || isLocked; // weekly tab available
  const initialPeriod: TimePeriod = canWeek ? "week" : "all-time";
  const [period, setPeriod] = useState<TimePeriod>(initialPeriod);

  // Coin payout bands for the banner. Show the user's current room tier; guests
  // (no room) see the entry tier (Wood) so the reward still reads as relevant.
  const rewardLeagueSlug = initialRoom?.league.slug ?? "wood";
  const rewardBands = rewards
    .filter((r) => r.league_slug === rewardLeagueSlug)
    .sort((a, b) => a.rank_min - b.rank_min);

  // The signed-in member of the room (always returned by the RPC) and whether
  // they've scored any XP this week. Until they do, the board is hidden behind a
  // teaser (the RPC also hides other zero-XP members), so this gates both.
  const me = initialRoom?.members.find((m) => m.is_current_user);
  const hasWeeklyXp = (me?.xp_earned ?? 0) > 0;

  // Weekly promote/relegate movement for the user's tier (0 at the ends of the
  // ladder, where there's nowhere to move). Drives the rewards-callout copy.
  const promoteCount =
    initialRoom && !initialRoom.league.is_top ? initialRoom.league.promote_count : 0;
  const relegateCount =
    initialRoom && !initialRoom.league.is_bottom ? initialRoom.league.relegate_count : 0;
  let movementText = "";
  if (promoteCount > 0 && relegateCount > 0) {
    movementText = `Each week the top ${promoteCount} are promoted to the next league, where you can earn more XP, and the bottom ${relegateCount} are relegated.`;
  } else if (promoteCount > 0) {
    movementText = `Each week the top ${promoteCount} are promoted to the next league, where you can earn more XP.`;
  } else if (relegateCount > 0) {
    movementText = `Each week the bottom ${relegateCount} are relegated to a lower league.`;
  }

  return (
    <div className="space-y-6">
      {/* Header — title on the left, personal-best stats inline on the right
          (mirrors the trophies/lessons header-stat format). */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold">Leaderboard</h1>
            {rewardBands.length > 0 && (
              <Popover
                position="below"
                align="left"
                content={
                  <LearningTipBody
                    rewardBands={rewardBands}
                    movementText={movementText}
                  />
                }
              >
                <button
                  type="button"
                  aria-label="How it works"
                  className="relative top-[3px] inline-flex text-black-50 transition-colors hover:text-black-80"
                >
                  <HelpCircle className="h-[15px] w-[15px]" strokeWidth={2} />
                </button>
              </Popover>
            )}
          </div>
          <p className="mt-3 text-muted-foreground">
            Compete against learners worldwide and earn coins
          </p>
        </div>

        <PersonalBestsStats personalBests={personalBests} />
      </div>

      {/* Dismissible "Learning tip" — same content lives in the title's (?)
          tooltip once dismissed. */}
      {!tipDismissed && rewardBands.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">How it works</p>
            <button
              onClick={dismissTip}
              aria-label="Dismiss"
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2">
            <LearningTipBody rewardBands={rewardBands} movementText={movementText} />
          </div>
        </div>
      )}

      {/* Leaderboard Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {/* Card Header */}
        <div className="flex items-start justify-between px-10 pt-6 pb-4">
          <div>
            {period === "week" && initialRoom ? (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{initialRoom.league.icon}</span>
                  <h2 className="text-large-semibold">{initialRoom.league.name} League</h2>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    Division {initialRoom.league.division} &middot; {currentWeekRangeLabel()}
                  </span>
                  {rewardBands.length > 0 && (
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span aria-hidden="true">&middot;</span>
                      {rewardBands.map((b, i) => (
                        <span
                          key={b.rank_min}
                          className="inline-flex items-center gap-1"
                        >
                          {b.rank_min === b.rank_max
                            ? `${ordinal(b.rank_min)} = ${b.coin_reward}`
                            : `${ordinal(b.rank_min)}–${ordinal(b.rank_max)} = ${b.coin_reward}`}
                          <span className="inline-flex items-center">
                            <Coins
                              className="h-3.5 w-3.5 text-amber-500"
                              strokeWidth={2}
                            />
                            {i < rewardBands.length - 1 ? "," : ""}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </>
            ) : period === "week" && isLocked ? (
              <>
                <div className="flex items-center gap-2.5">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-large-semibold">Leagues</h2>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Test {minLessonsToJoin} lessons to unlock
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h2 className="text-large-semibold">Hall of Fame</h2>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">Top 20 highest scoring learners of all time</p>
              </>
            )}
          </div>

          {/* Time Period Toggle — hidden for guests; shown for locked users so
              they can flip to the lock gate / All-Time. */}
          {canWeek && (
            <Tabs
              tabs={PERIOD_TABS}
              activeTab={period}
              onChange={(id) => setPeriod(id as TimePeriod)}
            />
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Content — horizontal padding lives on the table wrapper; the
            signed-in learner is marked by a blue avatar ring + blue name. */}
        <div className="py-6">
          {period === "week" && initialRoom ? (
            hasWeeklyXp ? (
              <>
                <WeeklyPositionCard
                  room={initialRoom}
                  avatarUrl={currentUserAvatarUrl}
                />
                <LeagueRoomView
                  room={initialRoom}
                  avatarUrl={currentUserAvatarUrl}
                  rewardBands={rewardBands}
                />
              </>
            ) : (
              <LeagueTeaser league={initialRoom.league} />
            )
          ) : period === "week" && isLocked ? (
            <LeagueLockGate
              tested={distinctLessonsTested ?? 0}
              required={minLessonsToJoin}
            />
          ) : (
            <>
              {initialAllTime.userPosition &&
                initialAllTime.userPosition.metric_value > 0 && (
                  <UserPositionCard
                    position={initialAllTime.userPosition}
                    avatarUrl={currentUserAvatarUrl}
                  />
                )}

              {initialAllTime.entries.length > 0 ? (
                <div className="px-10">
                  <ColumnHeader />
                  <div className="divide-y divide-bone-hover border-t border-bone-hover">
                    {initialAllTime.entries.map((entry) => (
                      <UserRow
                        key={entry.user_id}
                        entry={entry}
                        currentUserId={user?.id ?? null}
                        currentUserAvatarUrl={currentUserAvatarUrl}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState period="all-time" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Personal bests rendered as inline header stats (small label above, icon +
 * value below) — the same header-stat format used on the trophies/lessons
 * pages. Hidden entirely when the learner has no recorded XP yet.
 */
function PersonalBestsStats({
  personalBests,
}: {
  personalBests: LeaderboardClientProps["personalBests"];
}) {
  if (!personalBests || personalBests.lifetimeXp === 0) {
    return null;
  }

  const bestWeekAt = personalBests.bestWeekAt
    ? new Date(personalBests.bestWeekAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
      <Popover
        className="flex flex-col items-start gap-1.5"
        content={
          <p className="max-w-[220px] text-[13px] leading-[1.4] text-foreground">
            Your total XP across every language and course you study — the same
            all-course score your leaderboard rank is based on.
          </p>
        }
      >
        <span className="text-xs text-muted-foreground">Total XP</span>
        <XpBadge value={personalBests.lifetimeXp} variant="default" size="md" />
      </Popover>

      {bestWeekAt ? (
        <Popover
          className="flex flex-col items-start gap-1.5"
          content={
            <p className="text-[13px] leading-[1.4] text-foreground">{bestWeekAt}</p>
          }
        >
          <span className="text-xs text-muted-foreground">Best week</span>
          <XpBadge value={personalBests.bestWeekXp} variant="default" size="md" />
        </Popover>
      ) : (
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-xs text-muted-foreground">Best week</span>
          <XpBadge value={personalBests.bestWeekXp} variant="default" size="md" />
        </div>
      )}

      <Popover
        className="flex flex-col items-start gap-1.5"
        content={
          <p className="max-w-[220px] text-[13px] leading-[1.4] text-foreground">
            Your highest position on the all-time, all-language leaderboard.
          </p>
        }
      >
        <span className="text-xs text-muted-foreground">Highest rank</span>
        <span className="py-0.5 text-regular-semibold text-black">
          {personalBests.bestRank !== null ? `#${formatNumber(personalBests.bestRank)}` : "—"}
        </span>
      </Popover>
    </div>
  );
}

/**
 * Weekly-board empty state shown before the learner earns any XP this week. The
 * room is hidden behind this teaser (the RPC also hides other zero-XP members)
 * until they score — a centred card with the tier emoji and a CTA into a lesson.
 * The coin reward bands live in the card header, so they're omitted here.
 */
function LeagueTeaser({
  league,
}: {
  league: LeagueRoom["league"];
}) {
  return (
    <div className="flex flex-col items-center justify-center px-10 py-12 text-center">
      <span className="text-5xl leading-none">{league.icon}</span>
      <p className="mt-4 text-large-semibold">{league.name} League</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Earn your first XP this week to join the leaderboard and start climbing.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Start a lesson
      </Link>
    </div>
  );
}

/**
 * Weekly-tab lock gate for logged-in users who haven't tested enough distinct
 * lessons yet. Mirrors the LeagueTeaser layout (centred card) but with a lock,
 * a progress bar toward the threshold, and a CTA into a lesson. The enrolment
 * gate in the room RPC guarantees these users have no membership row, so the
 * weekly board genuinely doesn't exist for them yet.
 */
function LeagueLockGate({
  tested,
  required,
}: {
  tested: number;
  required: number;
}) {
  const clamped = Math.min(tested, required);
  const percent = required > 0 ? Math.round((clamped / required) * 100) : 0;
  return (
    <div className="flex flex-col items-center justify-center px-10 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 text-large-semibold">Leagues locked</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Test {required} lessons to unlock weekly leagues and compete for coins.
      </p>
      <div className="mt-6 w-full max-w-xs">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {clamped} of {required} lessons tested
        </p>
      </div>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Start a lesson
      </Link>
    </div>
  );
}

function EmptyState({ period }: { period: TimePeriod }) {
  return (
    <div className="flex flex-col items-center justify-center px-10 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Zap className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-4 font-semibold">No rankings yet</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {period === "week"
          ? "Be the first to earn XP this week — complete a test to get on the board."
          : "No XP has been earned yet. Complete a test to claim the top spot."}
      </p>
    </div>
  );
}

/**
 * The signed-in user's weekly league room: every member sharing the room, ranked
 * by live weekly XP. Members are always listed (even at 0 XP), so the room is
 * never an empty "no rankings" state. (Promote/relegate cut-lines arrive with the
 * Phase 2 movement job.)
 */
function LeagueRoomView({
  room,
  avatarUrl,
  rewardBands,
}: {
  room: LeagueRoom;
  avatarUrl: string | null;
  rewardBands: LeagueReward[];
}) {
  return (
    <div className="px-10">
      <ColumnHeader />
      <div className="divide-y divide-bone-hover border-t border-bone-hover">
        {room.members.map((member) => (
          <LeagueMemberRow
            key={member.user_id}
            member={member}
            currentUserAvatarUrl={avatarUrl}
            rewardBands={rewardBands}
          />
        ))}
      </div>
    </div>
  );
}

function LeagueMemberRow({
  member,
  currentUserAvatarUrl,
  rewardBands,
}: {
  member: LeagueRoomMember;
  currentUserAvatarUrl: string | null;
  rewardBands: LeagueReward[];
}) {
  // Podium members (top 3) advertise their weekly coin payout instead of a
  // medal — the league's whole hook is the reward, so surface it inline.
  const coinReward = coinRewardForRank(member.rank, rewardBands);
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="w-10 shrink-0 text-center text-sm font-semibold text-muted-foreground">
        {member.rank}
      </div>
      {member.is_current_user ? (
        <CurrentUserAvatar avatarUrl={currentUserAvatarUrl} ring />
      ) : (
        <UserAvatar avatarUrl={member.avatar_url} userId={member.user_id} />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p
          className={`truncate font-medium ${
            member.is_current_user ? "text-primary" : ""
          }`}
        >
          {member.is_current_user
            ? "You"
            : member.username || member.name || "Learner"}
        </p>
        {coinReward != null && <CoinRewardBadge coins={coinReward} />}
      </div>
      <LevelCell name={member.level_name} color={member.level_color} />
      <LocationCell location={member.location} />
      <div className="w-16 shrink-0 text-right text-lg font-semibold">
        {formatNumber(member.xp_earned)}
      </div>
    </div>
  );
}

/** Motivational copy for the all-time card, keyed off the learner's rank. */
function allTimeMessage(rank: number): { title: string; body: string } {
  if (rank === 1) {
    return {
      title: "You're #1!",
      body: "Keep earning XP to defend your spot at the top of the Hall of Fame.",
    };
  }
  if (rank <= 3) {
    return {
      title: "So close to the top!",
      body: "Keep earning XP to claim the #1 spot in the Hall of Fame.",
    };
  }
  if (rank <= 20) {
    return {
      title: "You're in the Hall of Fame!",
      body: "Keep climbing to break into the all-time top 3.",
    };
  }
  return {
    title: "Keep climbing!",
    body: "Earn more XP to break into the Hall of Fame top 20.",
  };
}

/** Motivational copy for the weekly league card, keyed off the room rank. */
function weeklyMessage(rank: number): { title: string; body: string } {
  if (rank === 1) {
    return {
      title: "You're #1 this week!",
      body: "Stay on top to win the biggest coin reward this week.",
    };
  }
  if (rank <= 3) {
    return {
      title: "You're in the coins!",
      body: "Climb to #1 this week for the biggest coin reward.",
    };
  }
  return {
    title: "Keep climbing!",
    body: "Break into the top 3 this week to earn coins.",
  };
}

/**
 * Shared "your position" card used on both boards: avatar + rank + XP on top,
 * a motivational message strip below. The two boards differ only in their copy
 * and the count subtext.
 */
function PositionCard({
  rank,
  metricValue,
  countSubtext,
  avatarUrl,
  message,
}: {
  rank: number;
  metricValue: number;
  countSubtext: string;
  avatarUrl: string | null;
  message: { title: string; body: string };
}) {
  return (
    <div className="mx-10 mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30">
      <div className="flex items-center gap-4 px-4 py-4">
        <CurrentUserAvatar avatarUrl={avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-700">Your Position = #{rank}</p>
          <p className="text-sm text-muted-foreground">{countSubtext}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">XP</p>
          <p className="text-xl font-semibold">{formatNumber(metricValue)}</p>
        </div>
      </div>
      <div className="border-t border-amber-200 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{message.title}</p>
            <p className="text-sm text-muted-foreground">{message.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** All-time board "your position" card. */
function UserPositionCard({
  position,
  avatarUrl,
}: {
  position: NonNullable<LeaderboardData["userPosition"]>;
  avatarUrl: string | null;
}) {
  return (
    <PositionCard
      rank={position.rank}
      metricValue={position.metric_value}
      countSubtext={`of ${position.total_users} learner${
        position.total_users !== 1 ? "s" : ""
      } worldwide`}
      avatarUrl={avatarUrl}
      message={allTimeMessage(position.rank)}
    />
  );
}

/** Weekly league "your position" card. Hidden if the user isn't in the room. */
function WeeklyPositionCard({
  room,
  avatarUrl,
}: {
  room: LeagueRoom;
  avatarUrl: string | null;
}) {
  const me = room.members.find((m) => m.is_current_user);
  if (!me) return null;
  return (
    <PositionCard
      rank={me.rank}
      metricValue={me.xp_earned}
      countSubtext={`of ${room.members.length} in your league this week`}
      avatarUrl={avatarUrl}
      message={weeklyMessage(me.rank)}
    />
  );
}

function UserRow({
  entry,
  currentUserId,
  currentUserAvatarUrl,
}: {
  entry: LeaderboardEntry;
  currentUserId: string | null;
  currentUserAvatarUrl: string | null;
}) {
  // Mirror the weekly room: the signed-in learner reads as "You" with the
  // gradient avatar (blue ring) and a blue name, on both boards.
  const isCurrentUser = currentUserId != null && entry.user_id === currentUserId;
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="w-10 shrink-0 text-center text-sm font-semibold text-muted-foreground">
        {entry.rank}
      </div>
      {isCurrentUser ? (
        <CurrentUserAvatar avatarUrl={currentUserAvatarUrl} ring />
      ) : (
        <UserAvatar avatarUrl={entry.avatar_url} userId={entry.user_id} />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p
          className={`truncate font-medium ${
            isCurrentUser ? "text-primary" : ""
          }`}
        >
          {isCurrentUser ? "You" : entry.username || entry.name || "Learner"}
        </p>
        <PlaceMedal rank={entry.rank} />
      </div>
      {/* Show the rank belt for every tier, including the Novice floor — the
          badge is the visual anchor for a learner's rank progression. */}
      <LevelCell name={entry.level_name} color={entry.level_color} />
      <LocationCell location={entry.location} />
      <div className="w-16 shrink-0 text-right text-lg font-semibold">
        {formatNumber(entry.metric_value)}
      </div>
    </div>
  );
}
