"use client";

import { Clock, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
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

function getWordStatus(
  word: WordWithDetails,
  progress: WordProgress | undefined
): "mastered" | "studying" | "not-started" {
  if (!progress?.hasAnswered) {
    return word.status || "not-started";
  }
  // If answered correctly, show as studying (mastered requires multiple correct answers)
  return progress.isCorrect ? "studying" : "not-started";
}

export function LessonCompletedModal({
  lesson,
  words,
  wordProgressMap,
  elapsedSeconds,
  onStartTest,
  onDismiss,
}: LessonCompletedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-3xl bg-white p-8">
        {/* Header */}
        <div className="mb-6 text-center">
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
          </div>
        </div>

        {/* Word Grid */}
        <div className="mb-8 grid grid-cols-5 gap-3">
          {words.map((word) => {
            const progress = wordProgressMap.get(word.id);
            const status = getWordStatus(word, progress);
            const hasImage = !!word.memory_trigger_image_url;

            return (
              <div
                key={word.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                {/* Image */}
                <div className="relative h-24 w-full bg-gradient-to-br from-purple-100 to-pink-100">
                  {hasImage ? (
                    <Image
                      src={word.memory_trigger_image_url!}
                      alt={word.english}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">
                      🗣️
                    </div>
                  )}
                </div>

                {/* Word Info */}
                <div className="p-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {word.english}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {word.part_of_speech?.slice(0, 4) || "word"}
                    </span>
                    {status !== "not-started" && (
                      <StatusPill status={status === "studying" ? "studying" : "mastered"} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
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
  );
}
