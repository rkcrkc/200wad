import { Shield, TrendingUp, TrendingDown } from "lucide-react";
import { LeagueBadge } from "./LeagueBadge";

const LEAGUE_ORDER = ["bronze", "silver", "gold", "diamond"];

function getNextLeague(league: string): string | null {
  const idx = LEAGUE_ORDER.indexOf(league);
  if (idx === -1 || idx >= LEAGUE_ORDER.length - 1) return null;
  return LEAGUE_ORDER[idx + 1];
}

function getPrevLeague(league: string): string | null {
  const idx = LEAGUE_ORDER.indexOf(league);
  if (idx <= 0) return null;
  return LEAGUE_ORDER[idx - 1];
}

export function LeagueInfoCard({
  userLeague,
  userRank,
  totalUsers,
  promoteTopN = 10,
  relegateBottomN = 5,
}: {
  userLeague: string;
  userRank: number | null;
  totalUsers: number;
  promoteTopN?: number;
  relegateBottomN?: number;
}) {
  const nextLeague = getNextLeague(userLeague);
  const prevLeague = getPrevLeague(userLeague);

  // Only consider zones valid when there are actual users
  const hasRankData = userRank !== null && totalUsers > 0;
  const isInPromotionZone = hasRankData && userRank <= promoteTopN;
  const isInRelegationZone =
    hasRankData &&
    prevLeague !== null &&
    userRank > totalUsers - relegateBottomN;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Your League</h3>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <LeagueBadge league={userLeague} size="md" />
        {hasRankData && (
          <span className="text-sm text-muted-foreground">
            Rank #{userRank} of {totalUsers}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* Promotion zone info */}
        {nextLeague && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            isInPromotionZone
              ? "bg-green-50 text-green-700"
              : "bg-gray-50 text-gray-600"
          }`}>
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>
              {isInPromotionZone ? (
                <>You&apos;re in the <strong>promotion zone</strong>!</>
              ) : (
                <>Top {promoteTopN} get promoted to <LeagueBadge league={nextLeague} size="sm" /></>
              )}
            </span>
          </div>
        )}

        {/* Relegation zone info */}
        {prevLeague && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            isInRelegationZone
              ? "bg-red-50 text-red-700"
              : "bg-gray-50 text-gray-600"
          }`}>
            <TrendingDown className="h-4 w-4 shrink-0" />
            <span>
              {isInRelegationZone ? (
                <>You&apos;re in the <strong>relegation zone</strong></>
              ) : (
                <>Bottom {relegateBottomN} get relegated to <LeagueBadge league={prevLeague} size="sm" /></>
              )}
            </span>
          </div>
        )}

        {/* Diamond league - no promotion */}
        {!nextLeague && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>You&apos;re in the <strong>top league</strong>!</span>
          </div>
        )}
      </div>
    </div>
  );
}
