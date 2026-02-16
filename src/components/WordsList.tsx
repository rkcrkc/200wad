"use client";

import { useState } from "react";
import { LayoutGrid, List, Zap } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WordRow } from "@/components/WordRow";
import { WordCard } from "@/components/WordCard";
import { WordWithDetails } from "@/lib/queries/words";
import { cn } from "@/lib/utils";

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
      <div className="mb-2 flex items-center justify-between gap-4">
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
            className={cn("size-8", "bg-accent text-primary")}
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
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {/* Column headers - same flex structure as WordRow */}
          <div className="mb-1 flex items-center justify-between rounded-xl border border-transparent p-4">
            <div className="flex flex-1 items-center gap-4">
              <span className="w-8 text-center text-xs text-muted-foreground">
                #
              </span>
              <span className="h-12 w-12 shrink-0" aria-hidden />
              <span className="flex-1 text-xs text-muted-foreground">English</span>
              <span className="flex-1 text-xs text-muted-foreground">
                {languageName ?? "Translation"}
              </span>
              <div className="flex flex-1 justify-end">
                <span className="text-xs text-muted-foreground">Status</span>
              </div>
            </div>
            <span className="ml-4 w-5" aria-hidden />
          </div>
          {filteredWords.map((word, index) => (
            <WordRow
              key={word.id}
              word={word}
              index={index}
              languageFlag={languageFlag}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Invisible spacer so first row of cards aligns with first row in list view */}
          <div
            className="mb-1 flex items-center justify-between rounded-xl border border-transparent p-4 invisible"
            aria-hidden
          >
            <span className="w-8 text-center text-xs" />
            <span className="h-12 w-12 shrink-0" />
            <span className="flex-1 text-xs" />
            <span className="flex-1 text-xs" />
            <div className="flex flex-1 justify-end">
              <span className="text-xs" />
            </div>
            <span className="ml-4 w-5" />
          </div>
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
        </div>
      )}
    </div>
  );
}
