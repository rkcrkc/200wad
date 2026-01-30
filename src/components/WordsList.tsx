"use client";

import { useState } from "react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { WordRow } from "@/components/WordRow";
import { WordWithDetails } from "@/lib/queries/words";

interface WordsListProps {
  words: WordWithDetails[];
  languageFlag?: string;
  wordsNotStudied: number;
  wordsNotMastered: number;
}

type FilterTab = "all" | "not-studied" | "not-mastered";

export function WordsList({
  words,
  languageFlag,
  wordsNotStudied,
  wordsNotMastered,
}: WordsListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

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

  return (
    <div>
      {/* Filter Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as FilterTab)}
        className="mb-6"
      />

      {/* Words List */}
      <div className="space-y-2">
        {filteredWords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-muted-foreground">
              {activeTab === "not-studied"
                ? "All words have been studied!"
                : activeTab === "not-mastered"
                ? "All words have been mastered!"
                : "No words found."}
            </p>
          </div>
        ) : (
          filteredWords.map((word, index) => (
            <WordRow
              key={word.id}
              word={word}
              index={index}
              languageFlag={languageFlag}
            />
          ))
        )}
      </div>
    </div>
  );
}
