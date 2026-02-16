import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { LessonForScheduler } from "@/lib/queries";

interface LessonPreviewCardProps {
  lesson: LessonForScheduler;
}

export function LessonPreviewCard({ lesson }: LessonPreviewCardProps) {
  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md"
    >
      {/* Lesson Image */}
      <div className="relative h-[100px] w-[100px] flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {lesson.imageUrl ? (
          <img
            src={lesson.imageUrl}
            alt={lesson.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-8 w-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Lesson Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Lesson Number */}
        <p className="text-xs text-muted-foreground">#{lesson.number}</p>

        {/* Title */}
        <h3 className="mb-2 truncate text-lg font-semibold text-foreground">
          {lesson.title}
        </h3>

        {/* Word Tags - max 2 rows with overflow hidden */}
        {(() => {
          const totalWords = lesson.word_count || lesson.sampleWords.length;
          // Fixed limit of 5 word pills - reliable fit in 2 rows
          const maxVisiblePills = 5;
          const visibleWords = lesson.sampleWords.slice(0, maxVisiblePills);
          const remainingCount = totalWords - visibleWords.length;

          return (
            <div className="flex max-h-[54px] flex-wrap gap-1.5 overflow-hidden">
              {visibleWords.map((word, index) => (
                <span
                  key={index}
                  className="max-w-[110px] truncate whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {word}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="shrink-0 whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-xs text-muted-foreground">
                  +{remainingCount} more
                </span>
              )}
            </div>
          );
        })()}
      </div>
    </Link>
  );
}
