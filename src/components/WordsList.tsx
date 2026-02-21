"use client";

import { useState } from "react";
import { LayoutGrid, List, Zap } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WordRow } from "@/components/WordRow";
import { WordCard } from "@/components/WordCard";
import { WordWithDetails } from "@/lib/queries/words";

interface WordsListProps {
  words: WordWithDetails[];
  languageFlag?: string;
  languageName?: string;
  wordsNotStudied: number;
  wordsNotMastered: number;
}

type FilterTab = "all" | "not-studied" | "not-mastered";
type ViewMode = "list" | "grid";

export function WordsList({
  words,
  languageFlag,
  languageName,
  wordsNotStudied,
  wordsNotMastered,
}: WordsListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const tabs: Tab[] = [
    { id: "all", label: "All words", count: words.length },
    { id: "not-studied", label: "Not yet studied", count: wordsNotStudied },
    { id: "not-mastered", label: "Not yet mastered", count: wordsNotMastered },
  ];

  const filteredWords = words.filter((word) => {
    switch (activeTab) {
      case "not-studied":
        return word.status === "not-started";
      case "not-mastered":
        return word.status !== "mastered";
      default:
        return true;
    }
  });

  const emptyMessage =
    activeTab === "not-studied"
      ? "All words have been studied!"
      : activeTab === "not-mastered"
        ? "All words have been mastered!"
        : "No words found.";

  return (
    <div>
      {/* Filter Tabs + Page controls */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as FilterTab)}
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Flashcard mode (coming soon)"
          >
            <Zap className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            aria-label={viewMode === "list" ? "Switch to grid view" : "Switch to list view"}
          >
            {viewMode === "list" ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
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
        <div className="flex flex-col gap-2">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_64px_1fr_1fr_140px_60px] items-center gap-4 px-6 py-3">
            <div className="text-small-medium text-black-50">#</div>
            <div></div>
            <div className="text-small-medium text-black-50">English</div>
            <div className="text-small-medium text-black-50">
              {languageName ?? "Translation"}
            </div>
            <div className="text-small-medium text-black-50">Status</div>
            <div></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {filteredWords.map((word, index) => (
              <WordRow
                key={word.id}
                word={word}
                index={index}
                languageFlag={languageFlag}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {filteredWords.map((word, index) => (
            <WordCard
              key={word.id}
              word={word}
              index={index}
              languageFlag={languageFlag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
