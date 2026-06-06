import { Info } from "lucide-react";
import type { CumulativeProgress } from "@/lib/queries/stats";
import { formatNumber, formatPercent } from "@/lib/utils/helpers";
import { Tooltip } from "@/components/ui/tooltip";

interface SummaryCardsProps {
  progress: CumulativeProgress;
}

const InfoIcon = ({ content }: { content: React.ReactNode }) => (
  <Tooltip align="right" position="above" label={content}>
    <span
      aria-label="More info"
      className="flex h-4 w-4 items-center justify-center text-muted-foreground/60"
    >
      <Info className="h-4 w-4" strokeWidth={2} />
    </span>
  </Tooltip>
);

export function SummaryCards({ progress }: SummaryCardsProps) {
  const totalVocab = progress.wordsLearned + progress.wordsMastered;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* My Vocab */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            My Vocab
          </p>
          <InfoIcon
            content={
              <div className="flex w-[260px] flex-col gap-1.5 whitespace-normal text-left text-xs leading-[1.4]">
                <p>
                  <span className="font-semibold">Learned</span> — a word
                  you&apos;ve answered with full marks (3/3) in a test at
                  least once: no clues used, no mistakes.
                </p>
                <p>
                  <span className="font-semibold">Mastered</span> — a learned
                  word you&apos;ve answered with full marks 3 times in a row.
                </p>
              </div>
            }
          />
        </div>
        <p className="text-[36px] font-bold leading-tight">
          {formatNumber(totalVocab)}{" "}
          <span className="text-base font-medium text-muted-foreground">
            words
          </span>
        </p>
        <p className="mt-1 text-sm font-medium text-black/50">
          {formatNumber(progress.wordsLearned)} learned +{" "}
          {formatNumber(progress.wordsMastered)} mastered
        </p>
      </div>

      {/* Course Completion */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            Course Completion
          </p>
          <InfoIcon
            content={
              <div className="flex w-[260px] flex-col gap-1.5 whitespace-normal text-left text-xs leading-[1.4]">
                <p>
                  Calculated as the number of words you&apos;ve{" "}
                  <span className="font-semibold">learned</span> (answered
                  with full marks 3/3 in a test at least once) divided by the
                  total number of testable words in the course.
                </p>
                <p className="text-white/70">
                  Mastered words count too — mastery requires being learned
                  first.
                </p>
              </div>
            }
          />
        </div>
        <p className="text-[36px] font-bold leading-tight">
          {formatPercent(progress.courseCompletionPercent)}
        </p>
        <p className="mt-1 text-sm font-medium text-black/50">
          {formatNumber(totalVocab)} vocab /{" "}
          {formatNumber(progress.totalWords)} total
        </p>
      </div>

      {/* Lessons Completed */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          Lessons Completed
        </p>
        <p className="text-[36px] font-bold leading-tight">
          {progress.lessonsCompleted}{" "}
          <span className="text-base font-medium text-muted-foreground">
            / {progress.totalLessons}
          </span>
        </p>
        <p className="mt-1 text-sm font-medium text-black/50">
          {progress.lessonsCompleted} lessons mastered / {progress.totalLessons} total ={" "}
          {formatPercent(
            progress.totalLessons > 0
              ? Math.round(
                  (progress.lessonsCompleted / progress.totalLessons) * 100
                )
              : 0
          )}
        </p>
      </div>

      {/* Lifetime XP — total points the user has earned across every test
          they've taken. Bottom sub-label surfaces their personal best in a
          single day, sourced from `users.pb_day_test_points`. */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            Lifetime XP
          </p>
          <InfoIcon
            content={
              <div className="flex w-[260px] flex-col gap-1.5 whitespace-normal text-left text-xs leading-[1.4]">
                <p>
                  Total XP earned across all tests. Full marks score 3 XP per
                  word (no mistakes, no clues).
                </p>
              </div>
            }
          />
        </div>
        <p className="text-[36px] font-bold leading-tight">
          {formatNumber(progress.lifetimeXp)}{" "}
          <span className="text-base font-medium text-muted-foreground">
            XP
          </span>
        </p>
        <p className="mt-1 text-sm font-medium text-black/50">
          Best day: {formatNumber(progress.bestDayXp)} XP
        </p>
      </div>
    </div>
  );
}
