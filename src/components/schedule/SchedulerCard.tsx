"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonForScheduler } from "@/lib/queries";

interface SchedulerCardProps {
  lesson: LessonForScheduler;
  mode: "test" | "lesson";
}

export function SchedulerCard({ lesson, mode }: SchedulerCardProps) {
  const isTest = mode === "test";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        {/* Lesson Image */}
        <div className="flex flex-col items-center">
          <div className="relative h-[180px] w-[180px] flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {lesson.imageUrl ? (
              <img
                src={lesson.imageUrl}
                alt={lesson.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>
          {/* Image caption - could show memory trigger text */}
          {lesson.sampleWords.length > 0 && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {lesson.sampleWords[0]}
            </p>
          )}
        </div>

        {/* Lesson Info */}
        <div className="flex flex-1 flex-col">
          {/* Lesson Number */}
          <p className="mb-1 text-sm text-muted-foreground">
            Lesson #{lesson.number}
          </p>

          {/* Title */}
          <h2 className="mb-4 text-3xl font-semibold text-foreground">
            {lesson.title}
          </h2>

          {/* Word Tags */}
          <div className="mb-6 flex flex-wrap gap-2">
            {lesson.sampleWords.slice(0, 10).map((word, index) => (
              <span
                key={index}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-foreground"
              >
                {word}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link
                href={
                  isTest
                    ? `/lesson/${lesson.id}/test`
                    : `/lesson/${lesson.id}/study`
                }
              >
                {isTest ? "Start test" : "Study lesson"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href={`/lesson/${lesson.id}`}>
                Preview lesson
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
