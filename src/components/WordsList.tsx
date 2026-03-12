"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Zap } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { WordRow } from "@/components/WordRow";
import { WordCard } from "@/components/WordCard";
import { WordDetailView } from "@/components/WordDetailView";
import { WordWithDetails } from "@/lib/queries/words";
import { useUser } from "@/context/UserContext";

interface WordsListProps {
  words: WordWithDetails[];
  languageFlag?: string;
  languageName?: string;
  wordsNotStudied: number;
  wordsNotMastered: number;
  lessonTitle: string;
  lessonNumber: number;
  onWordSelected?: (isSelected: boolean) => void;
  rightContent?: ReactNode;
}

type FilterTab = "all" | "not-studied" | "not-mastered";
type ViewMode = "list" | "grid";

export function WordsList({
  words,
  languageFlag,
  languageName,
  wordsNotStudied,
  wordsNotMastered,
  lessonTitle,
  lessonNumber,
  onWordSelected,
  rightContent,
}: WordsListProps) {
  const { isAdmin } = useUser();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [initialWordHandled, setInitialWordHandled] = useState(false);

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
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      setInitialWordHandled(true);
    }
  }, [searchParams, words, onWordSelected, initialWordHandled]);

  const allTabs: Tab[] = [
    { id: "all", label: "All words", count: words.length },
    { id: "not-studied", label: "Not yet studied", count: wordsNotStudied },
    { id: "not-mastered", label: "Not yet mastered", count: wordsNotMastered },
  ];

  // Hide tabs with zero items (except "all" which always shows)
  const tabs = allTabs.filter((tab) => tab.id === "all" || (tab.count ?? 0) > 0);

  // If active tab is no longer visible, switch to "all"
  const visibleTabIds = tabs.map((t) => t.id);
  const effectiveActiveTab = visibleTabIds.includes(activeTab) ? activeTab : "all";

  const filteredWords = words.filter((word) => {
    switch (effectiveActiveTab) {
      case "not-studied":
        return word.status === "not-started";
      case "not-mastered":
        return word.status !== "mastered";
      default:
        return true;
    }
  });

  const emptyMessage =
    effectiveActiveTab === "not-studied"
      ? "All words have been studied!"
      : effectiveActiveTab === "not-mastered"
        ? "All words have been mastered!"
        : "No words found.";

  // Navigation handlers - navigate within filtered list
  const handleSelectWord = useCallback((index: number) => {
    setSelectedWordIndex(index);
    onWordSelected?.(true);
    // Scroll to top when selecting a word
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [onWordSelected]);

  const handleBack = useCallback(() => {
    setSelectedWordIndex(null);
    onWordSelected?.(false);
  }, [onWordSelected]);

  const handlePreviousWord = useCallback(() => {
    if (selectedWordIndex !== null && selectedWordIndex > 0) {
      setSelectedWordIndex(selectedWordIndex - 1);
      // Scroll to top when navigating
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [selectedWordIndex]);

  const handleNextWord = useCallback(() => {
    if (selectedWordIndex !== null && selectedWordIndex < filteredWords.length - 1) {
      setSelectedWordIndex(selectedWordIndex + 1);
      // Scroll to top when navigating
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [selectedWordIndex, filteredWords.length]);

  const selectedWord = selectedWordIndex !== null ? filteredWords[selectedWordIndex] : null;

  const handleJumpToWord = useCallback((index: number) => {
    if (index >= 0 && index < filteredWords.length) {
      setSelectedWordIndex(index);
      // Scroll to top when jumping to a word
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [filteredWords.length]);

  // Build word list for action bar dropdown
  const wordListForActionBar = filteredWords.map((w) => ({
    id: w.id,
    english: w.english,
    foreign: w.headword,
  }));

  // Show detail view when a word is selected
  if (selectedWord && selectedWordIndex !== null) {
    return (
      <WordDetailView
        word={selectedWord}
        lessonTitle={lessonTitle}
        lessonNumber={lessonNumber}
        onBack={handleBack}
        onPrevious={fromDictionary ? undefined : handlePreviousWord}
        onNext={fromDictionary ? undefined : handleNextWord}
        onJumpToWord={fromDictionary ? undefined : handleJumpToWord}
        hasPrevious={fromDictionary ? false : selectedWordIndex > 0}
        hasNext={fromDictionary ? false : selectedWordIndex < filteredWords.length - 1}
        currentIndex={selectedWordIndex}
        totalWords={fromDictionary ? 1 : filteredWords.length}
        wordList={fromDictionary ? [] : wordListForActionBar}
        isAdmin={isAdmin}
        fromDictionary={fromDictionary}
      />
    );
  }

  // Show list view
  return (
    <div>
      {/* Filter Tabs + Page controls */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <Tabs
          tabs={tabs}
          activeTab={effectiveActiveTab}
          onChange={(tabId) => setActiveTab(tabId as FilterTab)}
        />
        <div className="flex items-center gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-[#FAF8F3]"
            aria-label="Flashcard mode (coming soon)"
          >
            <Zap className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-[#FAF8F3]"
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
        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-[600px] w-full border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="whitespace-nowrap text-xs-medium text-muted-foreground">
                <th className="w-[40px] px-6 py-3 text-left font-medium">#</th>
                <th className="w-12 px-2 py-3"></th>
                <th className="min-w-[120px] px-2 py-3 text-left font-medium">English</th>
                <th className="min-w-[120px] px-2 py-3 text-left font-medium">
                  {languageName ?? "Translation"}
                </th>
                <th className="w-[140px] px-2 py-3 text-left font-medium">Status</th>
                <th className="sticky right-0 w-[60px] bg-background px-2 py-3"></th>
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
    </div>
  );
}
