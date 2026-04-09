import { Star, Calendar, Flame } from "lucide-react";

export function PersonalBestsCard({
  bestDayWords,
  bestWeekWords,
  highestStreak,
}: {
  bestDayWords: number;
  bestWeekWords: number;
  highestStreak: number;
}) {
  // Don't show if no data
  if (bestDayWords === 0 && bestWeekWords === 0 && highestStreak === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Personal Bests</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
            <Star className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-lg font-semibold">{bestDayWords}</p>
          <p className="text-xs text-muted-foreground">Best Day</p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-lg font-semibold">{bestWeekWords}</p>
          <p className="text-xs text-muted-foreground">Best Week</p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
            <Flame className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-lg font-semibold">{highestStreak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
      </div>
    </div>
  );
}
