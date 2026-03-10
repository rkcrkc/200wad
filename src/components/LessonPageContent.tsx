"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { WordsList } from "@/components/WordsList";
import { Button } from "@/components/ui/button";
import { StartTestModal } from "@/components/study";
import { formatTime } from "@/lib/utils/helpers";
import { WordWithDetails } from "@/lib/queries/words";
import { Lesson } from "@/types/database";
import { TestType } from "@/types/test";

interface AdjacentLesson {
  id: string;
  number: number;
  title: string;
}

interface LessonPageContentProps {
  lesson: Lesson;
  words: WordWithDetails[];
  languageFlag?: string;
  languageName?: string;
  courseId?: string;
  wordsNotStudied: number;
  wordsNotMastered: number;
  masteredPercentage: number;
  totalTimeSeconds: number;
  previousLesson: AdjacentLesson | null;
  nextLesson: AdjacentLesson | null;
}

export function LessonPageContent({
  lesson,
  words,
  languageFlag,
  languageName,
  courseId,
  wordsNotStudied,
  wordsNotMastered,
  masteredPercentage,
  totalTimeSeconds,
  previousLesson,
  nextLesson,
}: LessonPageContentProps) {
  const router = useRouter();
  const [isWordSelected, setIsWordSelected] = useState(false);
  const [showStartTestModal, setShowStartTestModal] = useState(false);

  // Count words with memory trigger images (for picture-only mode)
  const wordsWithImages = words.filter((w) => w.memory_trigger_image_url).length;

  const handleStartTest = (testType: TestType, testTwice: boolean) => {
    setShowStartTestModal(false);
    const params = new URLSearchParams({ type: testType });
    if (testTwice) params.set("twice", "true");
    router.push(`/lesson/${lesson.id}/test?${params.toString()}`);
  };

  return (
    <>
      {/* Back button - always visible */}
      {!isWordSelected && courseId && (
        <Link
          href={`/course/${courseId}`}
          className="mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All Lessons
        </Link>
      )}

      {/* Header - hidden when word selected */}
      {!isWordSelected && (
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-regular-semibold text-black-80">
              Lesson #{lesson.number}
            </p>
            <h1 className="flex items-center gap-4 text-xxl-semibold">
              {lesson.emoji && <span className="text-2xl">{lesson.emoji}</span>}
              {lesson.title}
            </h1>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {/* Average score */}
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Average score</span>
              <div className="flex items-center gap-1.5 text-success">
                <span className="text-regular-semibold">✓ {masteredPercentage}%</span>
              </div>
            </div>

            {/* Total time */}
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Total time</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-regular-semibold">{formatTime(totalTimeSeconds)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Words List */}
      <div className={!isWordSelected && words.length > 0 ? "pb-24" : ""}>
        <WordsList
          words={words}
          languageFlag={languageFlag}
          languageName={languageName}
          wordsNotStudied={wordsNotStudied}
          wordsNotMastered={wordsNotMastered}
          lessonTitle={lesson.title}
          lessonNumber={lesson.number}
          onWordSelected={setIsWordSelected}
        />
      </div>

      {/* Fixed footer bar - hidden when word selected */}
      {!isWordSelected && words.length > 0 && (
        <div className="fixed bottom-0 left-[240px] right-0 z-10 bg-white shadow-[0px_-8px_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-4">
            {previousLesson ? (
              <Link
                href={`/lesson/${previousLesson.id}`}
                className="flex min-w-0 max-w-44 shrink-0 items-center gap-2 overflow-hidden text-left transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="text-xs text-muted-foreground">Previous</span>
                  <span className="block min-w-0 truncate text-regular-semibold text-foreground" title={`#${previousLesson.number} ${previousLesson.title}`}>
                    #{previousLesson.number} {previousLesson.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div />
            )}
            <div className="flex flex-1 items-center justify-center gap-4">
              <Button asChild size="xl" className="flex-1 max-w-[240px]">
                <Link href={`/lesson/${lesson.id}/study`}>
                  Study lesson
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="flex-1 max-w-[240px] border-primary text-primary hover:bg-primary/5"
                onClick={() => setShowStartTestModal(true)}
              >
                Take test
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            {nextLesson ? (
              <Link
                href={`/lesson/${nextLesson.id}`}
                className="flex min-w-0 max-w-44 shrink-0 items-center gap-2 overflow-hidden text-left transition-colors hover:text-foreground"
              >
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="text-xs text-muted-foreground">Next</span>
                  <span className="block min-w-0 truncate text-regular-semibold text-foreground" title={`#${nextLesson.number} ${nextLesson.title}`}>
                    #{nextLesson.number} {nextLesson.title}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Start Test Modal */}
      {showStartTestModal && (
        <StartTestModal
          languageName={languageName || "Foreign"}
          lessonTitle={`#${lesson.number} ${lesson.title}`}
          wordCount={words.length}
          wordsWithImages={wordsWithImages}
          onStart={handleStartTest}
          onCancel={() => setShowStartTestModal(false)}
        />
      )}
    </>
  );
}
