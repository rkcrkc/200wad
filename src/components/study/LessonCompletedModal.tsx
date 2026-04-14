"use client";

import { useState } from "react";
import {
  Clock,
  ChevronRight,
  Eye,
  EyeOff,
  Zap,
  Image as ImageIcon,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Lesson } from "@/types/database";
import { WordWithDetails } from "@/lib/queries/words";
import { formatDuration, formatNumber } from "@/lib/utils/helpers";
import { CompletedModalShell } from "./CompletedModalShell";
import { WordGrid } from "./WordGrid";

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
  onDismiss: () => void;
}

export function LessonCompletedModal({
  lesson,
  words,
  elapsedSeconds,
  newWordsCount,
  onStartTest,
  onDismiss,
}: LessonCompletedModalProps) {
  const [showItalian, setShowItalian] = useState(true);
  const [imageMode, setImageMode] = useState<"memory-trigger" | "flashcard">("memory-trigger");
  const [columns, setColumns] = useState<4 | 5>(5);

  return (
    <CompletedModalShell onDismiss={onDismiss}>
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
          <span>{formatNumber(words.length)} words</span>
          <span>{formatNumber(newWordsCount)} new</span>
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

      <CompletedModalShell.Body>
        <WordGrid
          words={words}
          imageMode={imageMode}
          showEnglish={showItalian}
          columns={columns}
        />
      </CompletedModalShell.Body>

      <CompletedModalShell.Footer>
        <div className="flex flex-col items-center gap-3">
          <Button onClick={onStartTest} size="xl" className="w-full max-w-md">
            Start Test
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
          <button
            onClick={onDismiss}
            className="text-sm text-primary"
          >
            Not now
          </button>
        </div>
      </CompletedModalShell.Footer>
    </CompletedModalShell>
  );
}
