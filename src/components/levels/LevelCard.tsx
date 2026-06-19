import { XpIcon } from "@/components/ui/xp-icon";
import { LevelBadge } from "@/components/levels/LevelBadge";
import { cn } from "@/lib/utils";
import type { UserLevelData } from "@/lib/queries/levels";

/**
 * Experience-level block. A top stats row (current tier, lifetime XP, lessons
 * mastered) sits above a reference table of every enabled tier and its dual
 * gates (XP and lessons-mastered required), with the user's held tier
 * highlighted. The thresholds mirror `compute_user_level`.
 */
export function LevelCard({ data }: { data: UserLevelData }) {
  const { current, ladder } = data;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <h2 className="mb-5 text-xl font-semibold">Experience Level</h2>

      {/* Top stats: current tier, lifetime XP, lessons mastered. */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Current level">
          <LevelBadge name={current.name} color={current.color} size="lg" />
        </Stat>
        <Stat
          label="Current XP"
          sub={
            data.next
              ? data.xpToNext > 0
                ? `${data.xpToNext.toLocaleString()} XP to next level`
                : "XP goal met"
              : undefined
          }
        >
          <span className="flex items-center gap-1 text-large-semibold text-gray-900">
            <XpIcon />
            {data.lifetimeXp.toLocaleString()}
          </span>
        </Stat>
        <Stat
          label="Lessons mastered"
          sub={
            data.next
              ? data.lessonsToNext > 0
                ? `${data.lessonsToNext.toLocaleString()} more to next level`
                : "Lessons goal met"
              : undefined
          }
        >
          <span className="text-large-semibold text-gray-900">
            {data.lessonsMastered.toLocaleString()}
          </span>
        </Stat>
      </div>

      {/* Reference ladder: every tier with its XP and lessons-mastered gates. */}
      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-bone text-small-medium text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Level</th>
              <th className="px-4 py-2.5 text-right font-medium">XP required</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Lessons mastered required
              </th>
            </tr>
          </thead>
          <tbody>
            {ladder.map((tier) => {
              const isCurrent = tier.levelNumber === current.levelNumber;
              const xpMet = data.lifetimeXp >= tier.xpThreshold;
              const lessonsMet =
                data.lessonsMastered >= tier.lessonsMasteredThreshold;
              return (
                <tr key={tier.levelNumber} className="border-t border-gray-100">
                  <td
                    className={cn(
                      "px-4 py-2.5 text-gray-900",
                      isCurrent ? "text-small-semibold" : "text-small-regular"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {tier.name}
                      {isCurrent && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs-medium text-primary">
                          Current level
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-small-regular text-gray-900">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {xpMet && <span aria-label="Achieved">✅</span>}
                      {tier.xpThreshold.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-small-regular text-gray-900">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {lessonsMet && <span aria-label="Achieved">✅</span>}
                      {tier.lessonsMasteredThreshold.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * A labelled stat: a muted caption, the value, and an optional small
 * "# to next level" hint stacked beneath.
 */
function Stat({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-small-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center">{children}</div>
      {sub && (
        <p className="mt-1 text-xs-medium text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
