"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import { useScrollFade } from "@/hooks/useScrollFade";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Zap } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { InlineSearch } from "@/components/InlineSearch";
import { WordRow } from "@/components/WordRow";
import { WordCard } from "@/components/WordCard";
import { WordDetailSidebar } from "@/components/WordDetailSidebar";
import { WordWithDetails } from "@/lib/queries/words";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/helpers";
import { SubBadge } from "@/components/ui/sub-badge";

interface WordsListProps {
  words: WordWithDetails[];
  languageFlag?: string;
  languageName?: string;
  wordsNotStarted: number;
  wordsLearning: number;
  wordsLearned: number;
  wordsMastered: number;
  averageTestScore?: number | null;
  lessonTitle: string;
  lessonNumber: number;
  onWordSelected?: (isSelected: boolean) => void;
  rightContent?: ReactNode;
}

type FilterTab = "all" | "not-started" | "learning" | "learned" | "mastered";
type ViewMode = "list" | "grid";

export function WordsList({
  words,
  languageFlag,
  languageName,
  wordsNotStarted,
  wordsLearning,
  wordsLearned,
  wordsMastered,
  averageTestScore,
  lessonTitle,
  lessonNumber,
  onWordSelected,
  rightContent,
}: WordsListProps) {
  const { isAdmin } = useUser();
  const { scrollRef, canScrollRight } = useScrollFade();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [initialWordHandled, setInitialWordHandled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Detect if accessed from dictionary
  const fromDictionary = searchParams.get("from") === "dictionary";

  // Handle ?word= query parameter to auto-select a word
  useEffect(() => {
    if (initialWordHandled) return;

    const wordId = searchParams.get("word");
    if (wordId) {
      const wordIndex = words.findIndex((w) => w.id === wordId);
      if (wordIndex !== -1) {
        setSelectedWordIndex(wordIndex);
        onWordSelected?.(true);
      }
      setInitialWordHandled(true);
    }
  }, [searchParams, words, onWordSelected, initialWordHandled]);

  const allTabs: Tab[] = [
    { id: "all", label: "All words", count: words.length },
    { id: "not-started", label: "Not started", count: wordsNotStarted },
    { id: "learning", label: "Learning", count: wordsLearning },
    { id: "learned", label: "Learned", count: wordsLearned },
    { id: "mastered", label: "Mastered", count: wordsMastered },
  ];

  // Hide tabs with zero items (except "all" which always shows)
  const tabs = allTabs.filter((tab) => tab.id === "all" || (tab.count ?? 0) > 0);

  // If active tab is no longer visible, switch to "all"
  const visibleTabIds = tabs.map((t) => t.id);
  const effectiveActiveTab = visibleTabIds.includes(activeTab) ? activeTab : "all";

  const filteredWords = words.filter((word) => {
    // Status filter
    switch (effectiveActiveTab) {
      case "not-started":
        if (word.status !== "not-started") return false;
        break;
      case "learning":
        if (word.status !== "learning") return false;
        break;
      case "learned":
        if (word.status !== "learned") return false;
        break;
      case "mastered":
        if (word.status !== "mastered") return false;
        break;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !word.english.toLowerCase().includes(query) &&
        !word.headword.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const emptyMessage =
    effectiveActiveTab === "not-started"
      ? "No words are Not started."
      : effectiveActiveTab === "learning"
        ? "No words are Learning."
        : effectiveActiveTab === "learned"
          ? "No words are Learned yet."
          : effectiveActiveTab === "mastered"
            ? "No words are Mastered yet."
            : "No words found.";

  // Navigation handlers - navigate within filtered list
  const handleSelectWord = useCallback((index: number) => {
    if (selectedWordIndex === index) {
      setSelectedWordIndex(null);
      onWordSelected?.(false);
    } else {
      setSelectedWordIndex(index);
      onWordSelected?.(true);
    }
  }, [onWordSelected, selectedWordIndex]);

  const handleBack = useCallback(() => {
    setSelectedWordIndex(null);
    onWordSelected?.(false);
  }, [onWordSelected]);

  const handlePreviousWord = useCallback(() => {
    if (selectedWordIndex !== null && selectedWordIndex > 0) {
      setSelectedWordIndex(selectedWordIndex - 1);
    }
  }, [selectedWordIndex]);

  const handleNextWord = useCallback(() => {
    if (selectedWordIndex !== null && selectedWordIndex < filteredWords.length - 1) {
      setSelectedWordIndex(selectedWordIndex + 1);
    }
  }, [selectedWordIndex, filteredWords.length]);

  const selectedWord = selectedWordIndex !== null ? filteredWords[selectedWordIndex] : null;

  const handleJumpToWord = useCallback((index: number) => {
    if (index >= 0 && index < filteredWords.length) {
      setSelectedWordIndex(index);
    }
  }, [filteredWords.length]);

  // Build word list for action bar dropdown
  const wordListForActionBar = filteredWords.map((w) => ({
    id: w.id,
    english: w.english,
    foreign: w.headword,
  }));

  // Show list view (always render), sidebar overlays when word is selected
  return (
    <div>
      {/* Filter Tabs + Page controls */}
      <div className="mb-4 flex min-h-9 items-center justify-between gap-4">
        <Tabs
          tabs={tabs}
          activeTab={effectiveActiveTab}
          onChange={(tabId) => setActiveTab(tabId as FilterTab)}
        />
        <div className="flex items-center gap-1">
          <InlineSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Filter words..."
          />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-beige"
            aria-label="Flashcard mode (coming soon)"
          >
            <Zap className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-beige"
            aria-label={viewMode === "list" ? "Switch to grid view" : "Switch to list view"}
          >
            {viewMode === "list" ? (
              <LayoutGrid className="h-5 w-5" />
            ) : (
              <List className="h-5 w-5" />
            )}
          </button>
          {rightContent}
        </div>
      </div>

      {/* Words content */}
      {filteredWords.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
            {activeTab !== "all" && (
              <button
                onClick={() => setActiveTab("all")}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Show all words
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div ref={scrollRef} className="overflow-x-auto overflow-y-visible pt-10 -mt-10 rounded-xl">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: 72 }} />
              <col style={{ width: 64 }} />
              <col />
              <col />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            {/* Table Header */}
            <thead>
              <tr className="h-12 cursor-default whitespace-nowrap text-xs-medium text-muted-foreground">
                <th className="px-6 py-3 text-left font-medium">#</th>
                <th className="px-2 py-3"></th>
                <th className="px-2 py-3 text-left font-medium">English</th>
                <th className="px-2 py-3 text-left font-medium">
                  {languageName ?? "Translation"}
                </th>
                <th className="px-2 py-3 text-left font-medium">Status</th>
                <th className="px-2 py-3 text-left font-medium">
                  <div className="flex items-center gap-2">
                    Avg. score
                    {averageTestScore !== null && averageTestScore !== undefined && (
                      <SubBadge variant="header">
                        {formatPercent(averageTestScore)}
                      </SubBadge>
                    )}
                  </div>
                </th>
                <th className={cn(
                  "sticky right-0 z-10 bg-background px-2 py-3",
                  canScrollRight && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-background"
                )}></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {filteredWords.map((word, index) => (
                <WordRow
                  key={word.id}
                  word={word}
                  index={index}
                  languageFlag={languageFlag}
                  onClick={() => handleSelectWord(index)}
                  isFirst={index === 0}
                  isLast={index === filteredWords.length - 1}
                  isSelected={selectedWordIndex === index}
                  showScrollFade={canScrollRight}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {filteredWords.map((word, index) => (
            <WordCard
              key={word.id}
              word={word}
              index={index}
              languageFlag={languageFlag}
              onClick={() => handleSelectWord(index)}
            />
          ))}
        </div>
      )}

      {/* Word Detail Sidebar */}
      {selectedWord && selectedWordIndex !== null && !fromDictionary && (
        <WordDetailSidebar
          word={selectedWord}
          lessonTitle={lessonTitle}
          lessonNumber={lessonNumber}
          onClose={handleBack}
          onPrevious={handlePreviousWord}
          onNext={handleNextWord}
          onJumpToWord={handleJumpToWord}
          hasPrevious={selectedWordIndex > 0}
          hasNext={selectedWordIndex < filteredWords.length - 1}
          currentIndex={selectedWordIndex}
          totalWords={filteredWords.length}
          wordList={wordListForActionBar}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
