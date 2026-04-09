import Link from "next/link";
import { ArrowRight, BookOpen, Eye } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { WordTagPill } from "./WordTagPill";
import { WordsPreviewTooltip } from "@/components/WordsPreviewTooltip";
import type { LessonForScheduler } from "@/lib/queries";

interface LessonPreviewCardProps {
  lesson: LessonForScheduler;
}

export function LessonPreviewCard({ lesson }: LessonPreviewCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
      <Link href={`/lesson/${lesson.id}`}>
        {/* Lesson Image */}
        <div className="relative h-[180px] w-full overflow-hidden">
          {lesson.imageUrl ? (
            <img
              src={lesson.imageUrl}
              alt={lesson.title}
              className="h-full w-full object-contain pt-4"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-8 w-8 text-gray-300" />
            </div>
          )}
        </div>
      </Link>

      {/* Lesson Info */}
      <div className="flex min-w-0 flex-col p-6 pb-0">
        {/* Lesson Number & Word Count */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-regular-semibold text-muted-foreground">
            Lesson #{lesson.number}
          </p>
          <WordsPreviewTooltip
            lessonId={lesson.id}
            wordCount={lesson.word_count || lesson.sampleWords.length}
            variant="pill"
          />
        </div>

        {/* Title */}
        <Link href={`/lesson/${lesson.id}`}>
          <h3 className="mb-4 truncate text-xl-semibold text-foreground">
            {lesson.title}
          </h3>
        </Link>

        {/* Word Tags - max 2 rows */}
        <div className="flex max-h-[76px] flex-wrap gap-2 overflow-hidden">
          {lesson.sampleWords.map((word, index) => (
            <WordTagPill key={index} word={word} />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 p-6">
        <Button asChild size="lg" className="flex-1 gap-2">
          <Link href={`/lesson/${lesson.id}/study`}>
            Study lesson
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <Tooltip label="Preview lesson">
          <Button asChild variant="ghost" size="icon-lg">
            <Link href={`/lesson/${lesson.id}`}>
              <Eye className="size-5" />
            </Link>
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
