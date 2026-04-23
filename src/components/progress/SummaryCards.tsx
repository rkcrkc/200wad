import type { CumulativeProgress } from "@/lib/queries/stats";
import { formatNumber, formatPercent } from "@/lib/utils/helpers";

interface SummaryCardsProps {
  progress: CumulativeProgress;
}

export function SummaryCards({ progress }: SummaryCardsProps) {
  const totalVocab = progress.wordsLearned + progress.wordsMastered;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* My Vocab */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          My Vocab
        </p>
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
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          Course Completion
        </p>
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
    </div>
  );
}
