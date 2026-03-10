"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { DictionaryRow } from "@/components/DictionaryRow";
import { DictionaryWord } from "@/lib/queries/dictionary";
import { cn } from "@/lib/utils";

type FilterType = "my-words" | "course" | "all";
type SortColumn = "english" | "headword" | "partOfSpeech" | "status" | "lessonNumber";
type SortDirection = "asc" | "desc";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface DictionaryListProps {
  myWords: DictionaryWord[];
  courseWords: DictionaryWord[];
  allWords: DictionaryWord[];
  languageFlag?: string;
  languageName?: string;
}

interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  centered?: boolean;
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  centered = false,
}: SortableHeaderProps) {
  const isActive = currentColumn === column;

  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "flex items-center gap-0.5 whitespace-nowrap transition-colors hover:text-foreground",
        centered && "justify-center",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
      style={{ fontSize: "13px", fontWeight: 500 }}
    >
      <span>{label}</span>
      {isActive && (
        direction === "asc" ? (
          <ChevronUp className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" />
        )
      )}
    </button>
  );
}

export function DictionaryList({
  myWords,
  courseWords,
  allWords,
  languageFlag,
  languageName,
}: DictionaryListProps) {
  const [filter, setFilter] = useState<FilterType>("course");
  const [letterFilter, setLetterFilter] = useState<string | null>("A"); // Default to 'A' for course/all
  const [sortColumn, setSortColumn] = useState<SortColumn>("english");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const tabs: Tab[] = [
    { id: "my-words", label: "My Words", count: myWords.length },
    { id: "course", label: "Words in this Course", count: courseWords.length },
    { id: "all", label: "All Words", count: allWords.length },
  ];

  // Get current word list based on filter
  const currentWords = useMemo(() => {
    switch (filter) {
      case "my-words":
        return myWords;
      case "course":
        return courseWords;
      case "all":
        return allWords;
    }
  }, [filter, myWords, courseWords, allWords]);

  // Filter by letter
  const letterFilteredWords = useMemo(() => {
    if (!letterFilter) return currentWords;
    return currentWords.filter((word) =>
      word.english.toUpperCase().startsWith(letterFilter)
    );
  }, [currentWords, letterFilter]);

  // Sort words
  const sortedWords = useMemo(() => {
    const sorted = [...letterFilteredWords];
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "english":
          comparison = a.english.localeCompare(b.english);
          break;
        case "headword":
          comparison = a.headword.localeCompare(b.headword);
          break;
        case "partOfSpeech":
          comparison = (a.partOfSpeech || "").localeCompare(b.partOfSpeech || "");
          break;
        case "status":
          const statusOrder = { mastered: 0, studying: 1, "not-started": 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "lessonNumber":
          comparison = (a.lessonNumber || 999) - (b.lessonNumber || 999);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [letterFilteredWords, sortColumn, sortDirection]);

  // Handle filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    // "My Words" shows all by default, others start on 'A'
    setLetterFilter(newFilter === "my-words" ? null : "A");
  };

  const handleLetterChange = (letter: string | null) => {
    setLetterFilter(letter);
  };

  // Get available letters (letters that have words)
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    currentWords.forEach((word) => {
      const firstLetter = word.english.charAt(0).toUpperCase();
      if (ALPHABET.includes(firstLetter)) {
        letters.add(firstLetter);
      }
    });
    return letters;
  }, [currentWords]);

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-4 flex items-center justify-between">
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onChange={(tabId) => handleFilterChange(tabId as FilterType)}
        />

        {languageFlag && <div className="text-2xl">{languageFlag}</div>}
      </div>

      {/* Letter filter */}
      <div className="mb-4 flex flex-wrap gap-1">
        {ALPHABET.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          const isActive = letterFilter === letter;
          return (
            <button
              key={letter}
              onClick={() => isAvailable && handleLetterChange(isActive ? null : letter)}
              disabled={!isAvailable}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : isAvailable
                    ? "bg-white text-foreground hover:bg-bone-hover"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Words Table */}
      <div className="overflow-x-auto rounded-xl pb-16">
        <table className="min-w-[800px] w-full border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="whitespace-nowrap">
              <th className="w-12 px-6 py-3"></th>
              <th className="min-w-[150px] px-2 py-3 text-left">
                <SortableHeader
                  label="English"
                  column="english"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="min-w-[150px] px-2 py-3 text-left">
                <SortableHeader
                  label={languageName || "Translation"}
                  column="headword"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-[120px] px-2 py-3 text-left">
                <SortableHeader
                  label="Word Type"
                  column="partOfSpeech"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-[140px] px-2 py-3 text-left">
                <SortableHeader
                  label="Status"
                  column="status"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="w-[140px] px-2 py-3 text-left">
                <SortableHeader
                  label="Lesson"
                  column="lessonNumber"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="sticky right-0 w-[40px] bg-background px-2 py-3"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {sortedWords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">
                    {letterFilter
                      ? `No words starting with "${letterFilter}".`
                      : filter === "my-words"
                        ? "No words yet — start studying to build your vocabulary!"
                        : "No words found."}
                  </p>
                  {letterFilter && (
                    <button
                      onClick={() => handleLetterChange(null)}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Show all words
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              sortedWords.map((word, index) => (
                <DictionaryRow
                  key={word.id}
                  word={word}
                  isFirst={index === 0}
                  isLast={index === sortedWords.length - 1}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Footer */}
      <div className="fixed bottom-0 left-[240px] right-0 z-10 border-t border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-[1200px]">
          <span className="text-sm text-muted-foreground">
            {sortedWords.length === 0
              ? "No words"
              : `${sortedWords.length} word${sortedWords.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
    </>
  );
}
