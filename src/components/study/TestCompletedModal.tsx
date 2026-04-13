"use client";

import { useState } from "react";
import {
  Clock,
  TrendingUp,
  Zap,
  Image as ImageIcon,
  RotateCcw,
  BookOpen,
  RefreshCw,
  X,
  LayoutGrid,
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";
import { formatDuration, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { CompletedModalShell } from "./CompletedModalShell";
import { WordGrid } from "./WordGrid";
import { CompletedModalActionCard } from "./CompletedModalActionCard";

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
  /** Mastered word count for the current course. null when unavailable (guest mode or server error). */
  courseWordsMastered: number | null;
  onDone: () => void;
  onTestAgain: () => void;
  onRetestIncorrect: () => void;
  onStudyIncorrect: () => void;
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
  courseWordsMastered,
  onDone,
  onTestAgain,
  onRetestIncorrect,
  onStudyIncorrect,
}: TestCompletedModalProps) {
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");
  const [columns, setColumns] = useState<4 | 5>(5);

  const isPerfectScore = scorePercent === 100;

  // Filter words by result
  const incorrectWords = words.filter((word) => {
    const result = wordResultsMap.get(word.id);
    return result && result.grade !== "correct";
  });

  const [activeTab, setActiveTab] = useState<"incorrect" | "all">(
    isPerfectScore ? "all" : "incorrect"
  );

  const displayWords = activeTab === "incorrect" ? incorrectWords : words;

  return (
    <CompletedModalShell onDismiss={onDone}>
      <CompletedModalShell.Header
        eyebrow={`Lesson #${lesson.number} · ${lesson.title}`}
        title={
          <>
            Test completed!{" "}
            <span className="text-muted-foreground">You scored {formatPercent(scorePercent)}</span>
          </>
        }
      >
        <div className="flex cursor-default items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>
            {formatNumber(totalPoints)}/{formatNumber(maxPoints)} ({formatPercent(scorePercent)})
          </span>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(elapsedSeconds, { style: "timer" })}</span>
          </div>
          {newWordsCount > 0 && <span>{formatNumber(newWordsCount)} new words</span>}
          {masteredWordsCount > 0 && <span>{formatNumber(masteredWordsCount)} mastered</span>}
          {courseWordsMastered !== null && (
            <div className="flex items-center gap-1.5">
              <span>{formatNumber(courseWordsMastered)} words mastered</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          )}
          <span>·</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setImageMode(imageMode === "memory-trigger" ? "flashcard" : "memory-trigger")
              }
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-bone"
              title={
                imageMode === "memory-trigger"
                  ? "Switch to flashcards"
                  : "Switch to memory triggers"
              }
            >
              {imageMode === "memory-trigger" ? (
                <Zap className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setColumns(columns === 5 ? 4 : 5)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-bone"
              title={columns === 5 ? "Switch to 4 columns" : "Switch to 5 columns"}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CompletedModalShell.Header>

      <CompletedModalShell.Body>
        {/* Tabs - hidden on perfect score */}
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

        <WordGrid words={displayWords} imageMode={imageMode} columns={columns} wordResults={wordResultsMap} />
      </CompletedModalShell.Body>

      <CompletedModalShell.Footer>
        {isPerfectScore ? (
          <div className="flex justify-center gap-4">
            <CompletedModalActionCard
              icon={<RefreshCw className="h-6 w-6" />}
              label="Retest all words"
              onClick={onTestAgain}
            />
            <CompletedModalActionCard
              icon={<X className="h-6 w-6" />}
              label="Done"
              onClick={onDone}
              muted
            />
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <CompletedModalActionCard
              icon={<RotateCcw className="h-6 w-6" />}
              label="Retest incorrect words"
              onClick={onRetestIncorrect}
              primary
            />
            <CompletedModalActionCard
              icon={<BookOpen className="h-6 w-6" />}
              label="Study incorrect words"
              onClick={onStudyIncorrect}
            />
            <CompletedModalActionCard
              icon={<RefreshCw className="h-6 w-6" />}
              label="Retest all words"
              onClick={onTestAgain}
            />
            <CompletedModalActionCard
              icon={<X className="h-6 w-6" />}
              label="Not now"
              onClick={onDone}
              muted
            />
          </div>
        )}
      </CompletedModalShell.Footer>
    </CompletedModalShell>
  );
}
