"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { InlineSearch } from "@/components/InlineSearch";
import { DictionaryRow } from "@/components/DictionaryRow";
import { DictionaryWord } from "@/lib/queries/dictionary";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/helpers";

type FilterType = "my-words" | "course" | "all";
type SortColumn = "english" | "headword" | "partOfSpeech" | "status" | "lessonNumber";
type SortDirection = "asc" | "desc";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PAGE_SIZE = 50;

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
  const searchParams = useSearchParams();
  const highlightWordId = searchParams.get("word");

  const [filter, setFilter] = useState<FilterType>(() => {
    // If navigating to a specific word, start on "course" tab (most likely to contain it)
    return "course";
  });
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("english");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedWordId, setHighlightedWordId] = useState<string | null>(highlightWordId);

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

  // Apply search filter (stacks on top of letter filter)
  const searchFilteredWords = useMemo(() => {
    if (!searchQuery) return letterFilteredWords;
    const query = searchQuery.toLowerCase();
    return letterFilteredWords.filter((word) =>
      word.english.toLowerCase().includes(query) ||
      word.headword.toLowerCase().includes(query)
    );
  }, [letterFilteredWords, searchQuery]);

  // Sort words
  const sortedWords = useMemo(() => {
    const sorted = [...searchFilteredWords];
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
  }, [searchFilteredWords, sortColumn, sortDirection]);

  // Handle filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setLetterFilter(null);
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

  // Infinite scroll
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset display count when filtered results change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [sortedWords.length, filter, letterFilter, searchQuery]);

  const hasMore = displayCount < sortedWords.length;

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, sortedWords.length));
  }, [sortedWords.length]);

  // IntersectionObserver to trigger loadMore
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const visibleWords = sortedWords.slice(0, displayCount);

  // Scroll to highlighted word from search navigation
  useEffect(() => {
    if (!highlightedWordId) return;

    // Find the word's index in sorted results
    const wordIndex = sortedWords.findIndex((w) => w.id === highlightedWordId);
    if (wordIndex === -1) return;

    // Ensure enough items are displayed to include the word
    if (wordIndex >= displayCount) {
      setDisplayCount(wordIndex + PAGE_SIZE);
    }

    // Scroll to the row after a short delay for render
    const timer = setTimeout(() => {
      const row = document.querySelector(`[data-word-id="${highlightedWordId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    // Clear highlight after 3 seconds
    const clearTimer = setTimeout(() => {
      setHighlightedWordId(null);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, [highlightedWordId, sortedWords, displayCount]);

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-4 flex items-center justify-between">
        <Tabs
          tabs={tabs}
          activeTab={filter}
          onChange={(tabId) => handleFilterChange(tabId as FilterType)}
        />

        <div className="flex items-center gap-3">
          <InlineSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Filter words..."
          />
          {languageFlag && <div className="text-2xl">{languageFlag}</div>}
        </div>
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
              visibleWords.map((word, index) => (
                <DictionaryRow
                  key={word.id}
                  word={word}
                  isFirst={index === 0}
                  isLast={index === visibleWords.length - 1 && !hasMore}
                  isHighlighted={word.id === highlightedWordId}
                />
              ))
            )}
          </tbody>
        </table>
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Floating Footer */}
      <div className="fixed bottom-0 left-[240px] right-0 z-10 border-t border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-[1200px]">
          <span className="text-sm text-muted-foreground">
            {sortedWords.length === 0
              ? "No words"
              : `${formatNumber(sortedWords.length)} word${sortedWords.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
    </>
  );
}
