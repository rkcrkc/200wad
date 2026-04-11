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
  /**
   * User's total mastered vocabulary across ALL lessons. Server-authoritative:
   * `null` when unavailable (guest mode or server error) — rendered as "—".
   */
  totalVocabulary: number | null;
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
  totalVocabulary,
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
      />

      <CompletedModalShell.StatsBar>
        <div>
          <p className="text-xs text-muted-foreground">Points</p>
          <p className="font-semibold">
            {formatNumber(totalPoints)}/{formatNumber(maxPoints)} ({formatPercent(scorePercent)})
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Time taken</p>
          <p className="flex items-center gap-1.5 font-semibold">
            <Clock className="h-4 w-4" />
            {formatDuration(elapsedSeconds, { style: "timer" })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">New words this test</p>
          <p className="font-semibold">{formatNumber(newWordsCount)} words</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Mastered this test</p>
          <p className="font-semibold">{formatNumber(masteredWordsCount)} words</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Your total vocabulary</p>
          <p className="flex items-center gap-1.5 font-semibold">
            {totalVocabulary !== null ? `${formatNumber(totalVocabulary)} words` : "—"}
            <TrendingUp className="h-4 w-4 text-primary" />
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setImageMode(imageMode === "memory-trigger" ? "flashcard" : "memory-trigger")
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            title={
              imageMode === "memory-trigger"
                ? "Switch to flashcards"
                : "Switch to memory triggers"
            }
          >
            {imageMode === "memory-trigger" ? (
              <Zap className="h-5 w-5 text-foreground" />
            ) : (
              <ImageIcon className="h-5 w-5 text-foreground" />
            )}
          </button>
          <button
            onClick={() => setColumns(columns === 5 ? 4 : 5)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            title={columns === 5 ? "Switch to 4 columns" : "Switch to 5 columns"}
          >
            <LayoutGrid className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </CompletedModalShell.StatsBar>

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

        <WordGrid words={displayWords} imageMode={imageMode} columns={columns} />
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
              label="Retest incorrect"
              onClick={onRetestIncorrect}
              primary
            />
            <CompletedModalActionCard
              icon={<BookOpen className="h-6 w-6" />}
              label="Study incorrect"
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
