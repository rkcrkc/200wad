"use client";

import { useState } from "react";
import { Clock, ChevronRight, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";

interface WordProgress {
  isCorrect: boolean;
  userNotes: string | null;
  hasAnswered: boolean;
}

interface LessonCompletedModalProps {
  lesson: Lesson;
  words: WordWithDetails[];
  wordProgressMap: Map<string, WordProgress>;
  elapsedSeconds: number;
  onStartTest: () => void;
  onDismiss: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function LessonCompletedModal({
  lesson,
  words,
  wordProgressMap,
  elapsedSeconds,
  onStartTest,
  onDismiss,
}: LessonCompletedModalProps) {
  const [showItalian, setShowItalian] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex max-h-[90vh] w-full max-w-content-md flex-col overflow-hidden rounded-3xl bg-white">
        {/* Header with background */}
        <div className="shrink-0 bg-[#EDE8DF] px-8 pt-8 pb-6 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            Lesson #{lesson.number} · {lesson.title}
          </p>
          <h1 className="mb-3 text-3xl font-bold">Lesson completed!</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(elapsedSeconds)}</span>
            </div>
            <span>·</span>
            <span>{words.length} words</span>
            <span>·</span>
            <button
              onClick={() => setShowItalian(!showItalian)}
              className="cursor-pointer"
              title={showItalian ? "Hide Italian" : "Show Italian"}
            >
              {showItalian ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-[#FAF8F3] p-8">
          {/* Word Grid */}
          <div className="grid grid-cols-5 gap-4">
            {words.map((word) => {
              const hasImage = !!word.memory_trigger_image_url;

              return (
                <div
                  key={word.id}
                  className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                >
                  {/* Image */}
                  <div className="relative h-28 w-full">
                    {hasImage ? (
                      <Image
                        src={word.memory_trigger_image_url!}
                        alt={word.english}
                        fill
                        className="object-contain"
                        sizes="200px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        🗣️
                      </div>
                    )}
                  </div>

                  {/* Word Info */}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {word.english}
                    </p>
                    {showItalian && (
                      <p className="truncate text-xs text-muted-foreground">
                        {word.headword}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed Actions */}
        <div className="shrink-0 bg-[#FAF8F3] px-8 py-6">
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={onStartTest}
              size="xl"
              className="w-full max-w-md"
            >
              Start Test
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <button
              onClick={onDismiss}
              className="text-sm text-primary hover:underline"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
