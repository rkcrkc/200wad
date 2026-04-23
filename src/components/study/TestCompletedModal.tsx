"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Clock,
  Eye,
  EyeOff,
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
import { Tooltip } from "@/components/ui/tooltip";
import { Popover } from "@/components/ui/popover";
import { SubBadge } from "@/components/ui/sub-badge";
import { Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";
import { formatDuration, formatNumber, formatPercent } from "@/lib/utils/helpers";
import { CompletedModalShell } from "./CompletedModalShell";
import { WordGrid } from "./WordGrid";
import { CompletedModalActionCard } from "./CompletedModalActionCard";
import { WordDetailView, type WordListItem } from "@/components/WordDetailView";
import { WordDetailActionBar } from "@/components/WordDetailActionBar";

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
  newlyLearnedCount: number;
  masteredWordsCount: number;
  /** Learned word count for the current course (total vocab). null when unavailable (guest mode or server error). */
  courseWordsMastered: number | null;
  newlyLearnedWordIds: string[];
  masteredWordIds: string[];
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
  newlyLearnedCount,
  masteredWordsCount,
  courseWordsMastered,
  newlyLearnedWordIds,
  masteredWordIds,
  onDone,
  onTestAgain,
  onRetestIncorrect,
  onStudyIncorrect,
}: TestCompletedModalProps) {
  const [showForeign, setShowForeign] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("completedModal:showForeign");
    return saved !== null ? saved === "true" : true;
  });
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
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  // Build word lists for popovers
  const newlyLearnedWordIdSet = new Set(newlyLearnedWordIds);
  const masteredWordIdSet = new Set(masteredWordIds);

  // Post-test totals (current status + newly changed in this test)
  const allLearnedWords = words.filter(
    (w) => w.status === "learned" || w.status === "mastered" || newlyLearnedWordIdSet.has(w.id) || masteredWordIdSet.has(w.id)
  );
  const allMasteredWords = words.filter(
    (w) => w.status === "mastered" || masteredWordIdSet.has(w.id)
  );
  const totalLearnedCount = allLearnedWords.length;
  const totalMasteredCount = allMasteredWords.length;

  const displayWords = activeTab === "incorrect" ? incorrectWords : words;

  const selectedWordIndex = selectedWordId ? displayWords.findIndex((w) => w.id === selectedWordId) : -1;
  const selectedWord = selectedWordIndex >= 0 ? displayWords[selectedWordIndex] : null;

  const wordList: WordListItem[] = displayWords.map((w) => ({
    id: w.id,
    english: w.english,
    foreign: w.headword,
  }));

  return (
    <CompletedModalShell onDismiss={onDone}>
      {!selectedWord && (
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
            <span>·</span>
            {totalLearnedCount > 0 ? (
              <Popover
                position="below"
                content={
                  <div className="flex flex-col gap-1">
                    {allLearnedWords.map((w) => (
                      <div key={w.id} className="flex items-baseline gap-1.5 text-sm">
                        <span className="font-medium text-foreground">{w.headword}</span>
                        <span className="text-muted-foreground">—</span>
                        <span className="text-muted-foreground">{w.english}</span>
                        {newlyLearnedWordIdSet.has(w.id) && <span className="text-xs text-primary">new</span>}
                      </div>
                    ))}
                  </div>
                }
              >
                <span className="inline-flex cursor-default items-center gap-1.5">
                  <span><span className="font-medium text-foreground">{formatNumber(totalLearnedCount)}</span> learned</span>
                  {newlyLearnedCount > 0 && (
                    <SubBadge variant="header">+{newlyLearnedCount} <TrendingUp className="inline h-3 w-3" /></SubBadge>
                  )}
                </span>
              </Popover>
            ) : (
              <span><span className="font-medium text-foreground">0</span> learned</span>
            )}
            {totalMasteredCount > 0 ? (
              <Popover
                position="below"
                content={
                  <div className="flex flex-col gap-1">
                    {allMasteredWords.map((w) => (
                      <div key={w.id} className="flex items-baseline gap-1.5 text-sm">
                        <span className="font-medium text-foreground">{w.headword}</span>
                        <span className="text-muted-foreground">—</span>
                        <span className="text-muted-foreground">{w.english}</span>
                        {masteredWordIdSet.has(w.id) && <span className="text-xs text-primary">new</span>}
                      </div>
                    ))}
                  </div>
                }
              >
                <span className="inline-flex cursor-default items-center gap-1.5">
                  <span><span className="font-medium text-foreground">{formatNumber(totalMasteredCount)}</span> mastered</span>
                  {masteredWordsCount > 0 && (
                    <SubBadge variant="header">+{masteredWordsCount} <TrendingUp className="inline h-3 w-3" /></SubBadge>
                  )}
                </span>
              </Popover>
            ) : (
              <span><span className="font-medium text-foreground">0</span> mastered</span>
            )}
            {courseWordsMastered !== null && (
              <>
                <Tooltip label="Total words learned across course" position="below">
                  <span className="inline-flex items-center gap-1.5">
                    <span><span className="font-medium text-foreground">{formatNumber(courseWordsMastered)}</span> total vocab</span>
                    {newlyLearnedCount > 0 && (
                      <SubBadge variant="header">+{newlyLearnedCount} <TrendingUp className="inline h-3 w-3" /></SubBadge>
                    )}
                  </span>
                </Tooltip>
              </>
            )}
            <span>·</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = !showForeign;
                  setShowForeign(next);
                  localStorage.setItem("completedModal:showForeign", String(next));
                }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-bone"
                title={showForeign ? "Hide foreign words" : "Show foreign words"}
              >
                {showForeign ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
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
      )}

      <CompletedModalShell.Body>
        {selectedWord ? (
          <>
            <button
              onClick={() => setSelectedWordId(null)}
              className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <WordDetailView
              word={selectedWord}
              lessonTitle={lesson.title}
              lessonNumber={lesson.number}
              onBack={() => setSelectedWordId(null)}
              onPrevious={
                selectedWordIndex > 0
                  ? () => setSelectedWordId(displayWords[selectedWordIndex - 1].id)
                  : undefined
              }
              onNext={
                selectedWordIndex < displayWords.length - 1
                  ? () => setSelectedWordId(displayWords[selectedWordIndex + 1].id)
                  : undefined
              }
              onJumpToWord={(index) => setSelectedWordId(displayWords[index].id)}
              hasPrevious={selectedWordIndex > 0}
              hasNext={selectedWordIndex < displayWords.length - 1}
              currentIndex={selectedWordIndex}
              totalWords={displayWords.length}
              wordList={wordList}
              layout="sidebar"
              autoPlayAudio={false}
              showTabs={false}
            />
          </>
        ) : (
          <>
            <Tabs
              tabs={[
                ...(incorrectWords.length > 0
                  ? [{ id: "incorrect", label: "Incorrect words", count: incorrectWords.length }]
                  : []),
                { id: "all", label: "All words", count: words.length },
              ]}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as "incorrect" | "all")}
              className="mb-4"
            />

            <WordGrid words={displayWords} imageMode={imageMode} showForeign={showForeign} columns={columns} wordResults={wordResultsMap} onWordClick={setSelectedWordId} />
          </>
        )}
      </CompletedModalShell.Body>

      {selectedWord ? (
        <div className="sticky bottom-0 z-10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.04)] [&>div]:!static">
          <WordDetailActionBar
            currentWordIndex={selectedWordIndex}
            totalWords={displayWords.length}
            englishWord={selectedWord.english}
            foreignWord={selectedWord.headword}
            partOfSpeech={selectedWord.part_of_speech}
            gender={selectedWord.gender}
            category={selectedWord.category}
            wordList={wordList}
            testHistory={selectedWord.testHistory}
            scoreStats={selectedWord.scoreStats}
            onJumpToWord={(index) => setSelectedWordId(displayWords[index].id)}
            onPreviousWord={() => selectedWordIndex > 0 && setSelectedWordId(displayWords[selectedWordIndex - 1].id)}
            onNextWord={() => selectedWordIndex < displayWords.length - 1 && setSelectedWordId(displayWords[selectedWordIndex + 1].id)}
            onReplay={() => {}}
            hasPrevious={selectedWordIndex > 0}
            hasNext={selectedWordIndex < displayWords.length - 1}
            wordStatus={selectedWord.status}
            variant="sidebar"
          />
        </div>
      ) : (
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
              />
            </div>
          )}
        </CompletedModalShell.Footer>
      )}
    </CompletedModalShell>
  );
}
