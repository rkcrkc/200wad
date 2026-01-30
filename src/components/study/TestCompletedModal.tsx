"use client";

import { useState } from "react";
import { Clock, ChevronRight, TrendingUp } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";
import { cn } from "@/lib/utils";

export interface TestWordResult {
  wordId: string;
  pointsEarned: number;
  maxPoints: number;
  isCorrect: boolean;
  grade: "correct" | "half-correct" | "incorrect";
}

interface TestCompletedModalProps {
  lesson: Lesson;
  words: WordWithDetails[];
  wordResultsMap: Map<string, TestWordResult>;
  elapsedSeconds: number;
  totalPoints: number;
  maxPoints: number;
  scorePercent: number;
  newWordsCount: number;
  masteredWordsCount: number;
  totalVocabulary: number;
  onDone: () => void;
  onTestAgain: () => void;
  onRetestIncorrect: () => void;
  onStudyIncorrect: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TestCompletedModal({
  lesson,
  words,
  wordResultsMap,
  elapsedSeconds,
  totalPoints,
  maxPoints,
  scorePercent,
  newWordsCount,
  masteredWordsCount,
  totalVocabulary,
  onDone,
  onTestAgain,
  onRetestIncorrect,
  onStudyIncorrect,
}: TestCompletedModalProps) {
  const [activeTab, setActiveTab] = useState<"incorrect" | "all">("incorrect");
  
  const isPerfectScore = scorePercent === 100;
  
  // Filter words by result
  const incorrectWords = words.filter((word) => {
    const result = wordResultsMap.get(word.id);
    return result && result.grade !== "correct";
  });
  
  const displayWords = activeTab === "incorrect" ? incorrectWords : words;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-3xl bg-white p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            #{lesson.number} {lesson.title}
          </p>
          <h1 className="mb-2 text-3xl font-bold">Test completed!</h1>
          <p className="text-xl text-muted-foreground">
            You scored {scorePercent}%
          </p>
        </div>

        {/* Stats Row */}
        <div className="mb-6 flex items-center justify-center gap-8 text-sm">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Points</p>
            <p className="flex items-center gap-1 font-semibold text-success">
              <span className="text-success">●</span>
              {totalPoints}/{maxPoints}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Time taken</p>
            <p className="flex items-center gap-1 font-semibold">
              <Clock className="h-4 w-4" />
              {formatDuration(elapsedSeconds)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">New words this test</p>
            <p className="font-semibold">{newWordsCount} words</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Mastered this test</p>
            <p className="font-semibold">{masteredWordsCount} words</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Your total vocabulary</p>
            <p className="flex items-center gap-1 font-semibold">
              {totalVocabulary} words
              <TrendingUp className="h-4 w-4 text-success" />
            </p>
          </div>
        </div>

        {/* Tabs - only show if not perfect score */}
        {!isPerfectScore && (
          <div className="mb-4 flex gap-4">
            <button
              onClick={() => setActiveTab("incorrect")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "incorrect"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Incorrect words <span className="ml-1 text-muted-foreground">{incorrectWords.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "all"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All words <span className="ml-1 text-muted-foreground">{words.length}</span>
            </button>
          </div>
        )}

        {/* Perfect score label */}
        {isPerfectScore && (
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">
              Words in this lesson <sup className="text-xs">1</sup><sub className="text-xs">0</sub>
            </span>
          </div>
        )}

        {/* Word Grid */}
        <div className="mb-8 grid grid-cols-5 gap-3">
          {displayWords.map((word) => {
            const result = wordResultsMap.get(word.id);
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
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions - differ based on score */}
        <div className="flex flex-col items-center gap-3">
          {isPerfectScore ? (
            <>
              {/* Perfect score: Done + Test again */}
              <Button onClick={onDone} size="xl" className="w-full max-w-md">
                Done
              </Button>
              <button
                onClick={onTestAgain}
                className="text-sm text-primary hover:underline"
              >
                Test again
              </button>
            </>
          ) : (
            <>
              {/* Less than 100%: Retest + Study + Not now */}
              <Button onClick={onRetestIncorrect} size="xl" className="w-full max-w-md gap-2">
                Retest incorrect words
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                onClick={onStudyIncorrect}
                variant="outline"
                size="xl"
                className="w-full max-w-md gap-2"
              >
                Study incorrect words
                <ChevronRight className="h-5 w-5" />
              </Button>
              <button
                onClick={onDone}
                className="text-sm text-primary hover:underline"
              >
                Not now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
