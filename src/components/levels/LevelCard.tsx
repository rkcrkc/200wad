import { XpIcon } from "@/components/ui/xp-icon";
import { LevelBadge } from "@/components/levels/LevelBadge";
import type { UserLevelData } from "@/lib/queries/levels";

/**
 * Experience-level block. Shows the user's current tier and, when there's a
 * tier above, the dual-gate progress toward it — both the XP and
 * lessons-mastered gates must be cleared for promotion (mirrors
 * `compute_user_level`).
 */
export function LevelCard({ data }: { data: UserLevelData }) {
  const { current, next } = data;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <h2 className="mb-5 text-xl font-semibold">Experience Level</h2>

      {/* Tier badges — current vs next, split horizontally. */}
      <div className="flex gap-6 sm:gap-8">
        <div className="flex-1">
          <p className="text-small-medium text-muted-foreground">
            Current level
          </p>
          <div className="mt-2">
            <LevelBadge name={current.name} color={current.color} size="lg" />
          </div>
          {next && (
            <p className="mt-3 text-sm text-muted-foreground">
              You currently have:
            </p>
          )}
        </div>

        {next ? (
          <div className="flex-1 text-right">
            <p className="text-small-medium text-muted-foreground">Next level</p>
            <div className="mt-2">
              <LevelBadge name={next.name} color={next.color} size="lg" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Achieve the following to reach the next level:
            </p>
          </div>
        ) : (
          <p className="flex-1 text-sm text-gray-500">
            You&apos;ve reached the top level — {current.name} is as high as it
            goes.
          </p>
        )}
      </div>

      {/* One block per gate: the current/next values (split horizontally) sit
          directly above that gate's full-width progress bar. */}
      {next && (
        <div className="mt-4 space-y-6">
          <MetricBlock
            withXpIcon
            currentValue={`${data.lifetimeXp.toLocaleString()} XP`}
            nextValue={`${next.xpThreshold.toLocaleString()} XP`}
            color={next.color}
            progress={data.xpProgress ?? 0}
            trailing={
              data.xpToNext > 0
                ? `${data.xpToNext.toLocaleString()} XP to go`
                : "XP goal met"
            }
          />
          <MetricBlock
            currentValue={`${data.lessonsMastered.toLocaleString()} lessons mastered`}
            nextValue={`${next.lessonsMasteredThreshold.toLocaleString()} lessons mastered`}
            color={next.color}
            progress={data.lessonsProgress ?? 0}
            trailing={
              data.lessonsToNext > 0
                ? `${data.lessonsToNext.toLocaleString()} lessons to go`
                : "Lessons goal met"
            }
          />
        </div>
      )}
    </div>
  );
}

/**
 * A single dual-gate metric: the current value (left) and next-level target
 * (right) split horizontally to line up under the tier badges, with that gate's
 * full-width progress bar stacked directly beneath them.
 */
function MetricBlock({
  currentValue,
  nextValue,
  withXpIcon = false,
  color,
  progress,
  trailing,
}: {
  currentValue: string;
  nextValue: string;
  withXpIcon?: boolean;
  color: string;
  progress: number;
  trailing: string;
}) {
  return (
    <div>
      <div className="mb-3 flex gap-6 sm:gap-8">
        <div className="flex-1">
          <MetricValue withXpIcon={withXpIcon} value={currentValue} />
        </div>
        <div className="flex-1">
          <MetricValue withXpIcon={withXpIcon} value={nextValue} align="right" />
        </div>
      </div>
      <ProgressRow color={color} progress={progress} trailing={trailing} />
    </div>
  );
}

/** A bold value line, optionally prefixed with the XP coin icon. */
function MetricValue({
  value,
  withXpIcon = false,
  align = "left",
}: {
  value: string;
  withXpIcon?: boolean;
  align?: "left" | "right";
}) {
  return (
    <p
      className={`flex items-center gap-1 text-regular-semibold text-gray-900 ${
        align === "right" ? "justify-end" : ""
      }`}
    >
      {withXpIcon && <XpIcon />}
      {value}
    </p>
  );
}

/** Full-width progress bar with a muted "# to go" caption beneath it. */
function ProgressRow({
  color,
  progress,
  trailing,
}: {
  color: string;
  progress: number;
  trailing: string;
}) {
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="mt-1.5 text-small-regular text-muted-foreground">
        {trailing}
      </p>
    </div>
  );
}
