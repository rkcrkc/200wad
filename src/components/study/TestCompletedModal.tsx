"use client";

import { useState } from "react";
import { Clock, ChevronRight, TrendingUp, Zap, Image as ImageIcon, ImageOff } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";

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
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");

  const isPerfectScore = scorePercent === 100;
  
  // Filter words by result
  const incorrectWords = words.filter((word) => {
    const result = wordResultsMap.get(word.id);
    return result && result.grade !== "correct";
  });
  
  const displayWords = activeTab === "incorrect" ? incorrectWords : words;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex max-h-[90vh] w-full max-w-content-md flex-col overflow-hidden rounded-3xl bg-white">
        {/* Header with background */}
        <div className="shrink-0 bg-[#EDE8DF] px-8 pt-8 pb-6 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            Lesson #{lesson.number} · {lesson.title}
          </p>
          <h1 className="mb-3 text-3xl font-bold">
            Test completed! <span className="text-muted-foreground">You scored {scorePercent}%</span>
          </h1>
        </div>

        {/* Stats Row */}
        <div className="shrink-0 flex items-center justify-between bg-white px-8 py-5 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Points</p>
            <p className="flex items-center gap-1.5 font-semibold">
              <span className="text-success">◐</span>
              {totalPoints}/{maxPoints}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time taken</p>
            <p className="flex items-center gap-1.5 font-semibold">
              <Clock className="h-4 w-4" />
              {formatDuration(elapsedSeconds)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">New words this test</p>
            <p className="font-semibold">{newWordsCount} words</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mastered this test</p>
            <p className="font-semibold">{masteredWordsCount} words</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your total vocabulary</p>
            <p className="flex items-center gap-1.5 font-semibold">
              {totalVocabulary} words
              <TrendingUp className="h-4 w-4 text-primary" />
            </p>
          </div>
          <button
            onClick={() => setImageMode(imageMode === "memory-trigger" ? "flashcard" : "memory-trigger")}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            title={imageMode === "memory-trigger" ? "Switch to flashcards" : "Switch to memory triggers"}
          >
            {imageMode === "memory-trigger" ? (
              <Zap className="h-5 w-5 text-foreground" />
            ) : (
              <ImageIcon className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-[#FAF8F3] p-8">
          {/* Tabs - only show if not perfect score */}
          {!isPerfectScore && (
            <Tabs
              tabs={[
                { id: "incorrect", label: "Incorrect words", count: incorrectWords.length },
                { id: "all", label: "All words", count: words.length },
              ]}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as "incorrect" | "all")}
              className="mb-4"
            />
          )}

          {/* Word Grid */}
          <div className="grid grid-cols-5 gap-4">
            {displayWords.map((word) => {
              const result = wordResultsMap.get(word.id);
              const imageUrl = imageMode === "memory-trigger"
                ? word.memory_trigger_image_url
                : word.flashcard_image_url;
              const hasImage = !!imageUrl;

              return (
                <div
                  key={word.id}
                  className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                >
                  {/* Image */}
                  <div className="relative h-28 w-full">
                    {hasImage ? (
                      <Image
                        src={imageUrl!}
                        alt={word.english}
                        fill
                        className="object-contain"
                        sizes="200px"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                        {imageMode === "flashcard" ? (
                          <>
                            <ImageOff className="h-8 w-8 text-gray-300" />
                            <span className="text-xs text-muted-foreground">Coming soon</span>
                          </>
                        ) : (
                          <span className="text-3xl">🗣️</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Word Info - Foreign first, English beneath */}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {word.headword}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {word.english}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed Actions */}
        <div className="shrink-0 bg-[#FAF8F3] px-8 py-6">
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
                <div className="flex w-full max-w-2xl gap-3">
                  <Button onClick={onRetestIncorrect} size="xl" className="flex-1 gap-2">
                    Retest incorrect words
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={onStudyIncorrect}
                    variant="outline"
                    size="xl"
                    className="flex-1 gap-2"
                  >
                    Study incorrect words
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
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
    </div>
  );
}
