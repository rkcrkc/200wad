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
import { formatDuration, formatNumber } from "@/lib/utils/helpers";
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
  /** Number of words studied for the first time in this session (were not-started before). */
  newWordsCount: number;
  onStartTest: () => void;
  onStudyAgain: () => void;
  onDismiss: () => void;
}

export function LessonCompletedModal({
  lesson,
  words,
  elapsedSeconds,
  newWordsCount,
  onStartTest,
  onStudyAgain,
  onDismiss,
}: LessonCompletedModalProps) {
  const [showItalian, setShowItalian] = useState(true);
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");
  const [columns, setColumns] = useState<4 | 5>(5);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  const selectedWordIndex = selectedWordId ? words.findIndex((w) => w.id === selectedWordId) : -1;
  const selectedWord = selectedWordIndex >= 0 ? words[selectedWordIndex] : null;

  const wordList: WordListItem[] = words.map((w) => ({
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
            {newWordsCount > 0 && <><span>·</span><span><span className="font-medium text-foreground">{formatNumber(newWordsCount)}</span> new</span></>}
            <span>·</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowItalian(!showItalian)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-bone"
                title={showItalian ? "Hide Italian" : "Show Italian"}
              >
                {showItalian ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                  ? () => setSelectedWordId(words[selectedWordIndex - 1].id)
                  : undefined
              }
              onNext={
                selectedWordIndex < words.length - 1
                  ? () => setSelectedWordId(words[selectedWordIndex + 1].id)
                  : undefined
              }
              onJumpToWord={(index) => setSelectedWordId(words[index].id)}
              hasPrevious={selectedWordIndex > 0}
              hasNext={selectedWordIndex < words.length - 1}
              currentIndex={selectedWordIndex}
              totalWords={words.length}
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
              ]}
              activeTab="all"
              onChange={() => {}}
              className="mb-4"
            />
            <WordGrid
              words={words}
              imageMode={imageMode}
              showEnglish={showItalian}
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
            totalWords={words.length}
            englishWord={selectedWord.english}
            foreignWord={selectedWord.headword}
            partOfSpeech={selectedWord.part_of_speech}
            gender={selectedWord.gender}
            category={selectedWord.category}
            wordList={wordList}
            testHistory={selectedWord.testHistory}
            scoreStats={selectedWord.scoreStats}
            onJumpToWord={(index) => setSelectedWordId(words[index].id)}
            onPreviousWord={() => selectedWordIndex > 0 && setSelectedWordId(words[selectedWordIndex - 1].id)}
            onNextWord={() => selectedWordIndex < words.length - 1 && setSelectedWordId(words[selectedWordIndex + 1].id)}
            onReplay={() => {}}
            hasPrevious={selectedWordIndex > 0}
            hasNext={selectedWordIndex < words.length - 1}
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
