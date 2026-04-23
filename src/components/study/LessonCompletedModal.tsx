"use client";

import { useState } from "react";
import {
  Clock,
  ChevronLeft,
  Eye,
  EyeOff,
  Zap,
  Image as ImageIcon,
  LayoutGrid,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";
import { formatDuration } from "@/lib/utils/helpers";
import { CompletedModalShell } from "./CompletedModalShell";
import { CompletedModalActionCard } from "./CompletedModalActionCard";
import { WordGrid } from "./WordGrid";
import { WordDetailView, type WordListItem } from "@/components/WordDetailView";
import { WordDetailActionBar } from "@/components/WordDetailActionBar";

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
  onStudyAgain: () => void;
  onDismiss: () => void;
}

export function LessonCompletedModal({
  lesson,
  words,
  elapsedSeconds,
  onStartTest,
  onStudyAgain,
  onDismiss,
}: LessonCompletedModalProps) {
  const [showForeign, setShowForeign] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("completedModal:showForeign");
    return saved !== null ? saved === "true" : true;
  });
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");
  const [columns, setColumns] = useState<4 | 5>(5);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  // Filter words by status
  const learningWords = words.filter((w) => w.status === "learning");
  const learnedWords = words.filter((w) => w.status === "learned" || w.status === "mastered");
  const masteredWords = words.filter((w) => w.status === "mastered");

  const [activeTab, setActiveTab] = useState<"all" | "learning" | "learned" | "mastered">("all");

  const displayWords =
    activeTab === "learning"
      ? learningWords
      : activeTab === "learned"
        ? learnedWords
        : activeTab === "mastered"
          ? masteredWords
          : words;

  const selectedWordIndex = selectedWordId ? displayWords.findIndex((w) => w.id === selectedWordId) : -1;
  const selectedWord = selectedWordIndex >= 0 ? displayWords[selectedWordIndex] : null;

  const wordList: WordListItem[] = displayWords.map((w) => ({
    id: w.id,
    english: w.english,
    foreign: w.headword,
  }));

  return (
    <CompletedModalShell onDismiss={onDismiss}>
      {!selectedWord && (
        <CompletedModalShell.Header
          eyebrow={`Lesson #${lesson.number} · ${lesson.title}`}
          title="Lesson completed!"
        >
          <div className="flex cursor-default items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(elapsedSeconds, { style: "timer" })}</span>
            </div>
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
                { id: "all", label: "All words", count: words.length },
                ...(learningWords.length > 0
                  ? [{ id: "learning", label: "Learning", count: learningWords.length }]
                  : []),
                ...(learnedWords.length > 0
                  ? [{ id: "learned", label: "Learned", count: learnedWords.length }]
                  : []),
                ...(masteredWords.length > 0
                  ? [{ id: "mastered", label: "Mastered", count: masteredWords.length }]
                  : []),
              ]}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as "all" | "learning" | "learned" | "mastered")}
              className="mb-4"
            />
            <WordGrid
              words={displayWords}
              imageMode={imageMode}
              showForeign={showForeign}
              showStatus
              columns={columns}
              onWordClick={setSelectedWordId}
            />
          </>
        )}
      </CompletedModalShell.Body>

      {selectedWord ? (
        <div className="shrink-0 [&>div]:!static">
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
          <div className="flex justify-center gap-4">
            <CompletedModalActionCard
              icon={<Play className="h-6 w-6" />}
              label="Start test"
              onClick={onStartTest}
              primary
            />
            <CompletedModalActionCard
              icon={<RotateCcw className="h-6 w-6" />}
              label="Study again"
              onClick={onStudyAgain}
            />
            <CompletedModalActionCard
              icon={<X className="h-6 w-6" />}
              label="Not now"
              onClick={onDismiss}
              muted
            />
          </div>
        </CompletedModalShell.Footer>
      )}
    </CompletedModalShell>
  );
}
