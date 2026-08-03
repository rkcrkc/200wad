"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/tabs";
import { InlineSearch } from "@/components/InlineSearch";
import { CategoryFilter, CategoryOption } from "@/components/CategoryFilter";
import { DictionaryRow } from "@/components/DictionaryRow";
import { useScrollFade } from "@/hooks/useScrollFade";
import { useWordPreview } from "@/context/WordPreviewContext";
import { useSidebarCollapsed } from "@/context/SidebarCollapseContext";
import { DictionaryWord } from "@/lib/queries/dictionary";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/helpers";

type FilterType = "learning" | "learned" | "mastered" | "course" | "all";
type SortColumn = "english" | "headword" | "partOfSpeech" | "status" | "lessonNumber";
type SortDirection = "asc" | "desc";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PAGE_SIZE = 50;

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: "word", label: "Words" },
  { value: "sentence", label: "Sentences" },
  { value: "phrase", label: "Phrases" },
  { value: "fact", label: "Facts" },
  { value: "information", label: "Information" },
];

interface DictionaryListProps {
  myWords: DictionaryWord[];
  courseWords: DictionaryWord[];
  allWords: DictionaryWord[];
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
  languageName,
}: DictionaryListProps) {
  const searchParams = useSearchParams();
  const { scrollRef: dictScrollRef, canScrollRight } = useScrollFade();
  // Separate tracker for the mobile letter-filter row's edge fades.
  const {
    scrollRef: letterScrollRef,
    canScrollLeft: letterCanScrollLeft,
    canScrollRight: letterCanScrollRight,
  } = useScrollFade();
  const { openWord, selectedWordId } = useWordPreview();
  const sidebarCollapsed = useSidebarCollapsed();
  const urlWordId = searchParams.get("word");

  const [filter, setFilter] = useState<FilterType>(() => {
    // If deep-linking to a specific word, pick the best tab to show it:
    // prefer "This Course" if the word is in the current course, else fall
    // back to "All {Language}" which contains every entry for the language.
    if (urlWordId) {
      const inCurrentCourse = courseWords.some((w) => w.id === urlWordId);
      return inCurrentCourse ? "course" : "all";
    }
    return "learning";
  });
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("english");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Derive status-specific lists from myWords
  const learningWords = useMemo(
    () => myWords.filter((w) => w.status === "learning"),
    [myWords]
  );
  const learnedWords = useMemo(
    () => myWords.filter((w) => w.status === "learned"),
    [myWords]
  );
  const masteredWords = useMemo(
    () => myWords.filter((w) => w.status === "mastered"),
    [myWords]
  );

  const tabs: Tab[] = [
    { id: "learning", label: "Learning", count: learningWords.length },
    { id: "learned", label: "Learned", count: learnedWords.length },
    { id: "mastered", label: "Mastered", count: masteredWords.length },
    { id: "course", label: "This Course", count: courseWords.length, separatorAfter: true },
    {
      id: "all",
      label: languageName ? `All ${languageName}` : "All",
      count: allWords.length,
    },
  ];

  // Get current word list based on filter
  const currentWords = useMemo(() => {
    switch (filter) {
      case "learning":
        return learningWords;
      case "learned":
        return learnedWords;
      case "mastered":
        return masteredWords;
      case "course":
        return courseWords;
      case "all":
        return allWords;
    }
  }, [filter, learningWords, learnedWords, masteredWords, courseWords, allWords]);

  // Filter by letter
  const letterFilteredWords = useMemo(() => {
    if (!letterFilter) return currentWords;
    return currentWords.filter((word) =>
      word.english.toUpperCase().startsWith(letterFilter)
    );
  }, [currentWords, letterFilter]);

  // Apply category filter (stacks on top of letter filter)
  const categoryFilteredWords = useMemo(() => {
    if (selectedCategories.length === 0) return letterFilteredWords;
    return letterFilteredWords.filter(
      (word) => word.category && selectedCategories.includes(word.category)
    );
  }, [letterFilteredWords, selectedCategories]);

  // Apply search filter (stacks on top of category + letter filter)
  const searchFilteredWords = useMemo(() => {
    if (!searchQuery) return categoryFilteredWords;
    const query = searchQuery.toLowerCase();
    return categoryFilteredWords.filter((word) =>
      word.english.toLowerCase().includes(query) ||
      word.headword.toLowerCase().includes(query)
    );
  }, [categoryFilteredWords, searchQuery]);

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
          const statusOrder = { mastered: 0, learned: 1, learning: 2, "not-started": 3 };
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

  // Open the global word-preview panel with full list context for prev/next.
  // Intentionally does NOT pass per-word lesson overrides — the dictionary is
  // a cross-lesson view, so the sidebar header should default to the
  // lowest-numbered lesson (resolved by fetchWordPreview).
  const handleSelectWord = useCallback(
    (index: number) => {
      const word = sortedWords[index];
      if (!word) return;
      openWord(word.id, {
        wordList: sortedWords.map((w) => ({
          id: w.id,
          english: w.english,
          foreign: w.headword,
        })),
        currentIndex: index,
      });
    },
    [sortedWords, openWord]
  );

  // When the URL ?word= changes (deep-link or header-search nav), make sure
  // the targeted word is visible in the current view by switching tabs and
  // clearing filters that could hide it. The panel itself is owned by the
  // global WordPreviewProvider, so we don't open it here.
  useEffect(() => {
    if (!urlWordId) return;
    const isInCurrentView = sortedWords.some((w) => w.id === urlWordId);
    if (isInCurrentView) return;

    const inCurrentCourse = courseWords.some((w) => w.id === urlWordId);
    setFilter(inCurrentCourse ? "course" : "all");
    setLetterFilter(null);
    setSelectedCategories([]);
    setSearchQuery("");
    // We intentionally only respond when urlWordId changes; sortedWords
    // changing shouldn't re-trigger tab switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlWordId]);

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
  }, [sortedWords.length, filter, letterFilter, searchQuery, selectedCategories]);

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

  // Ensure enough items are displayed to include a deep-linked word, so the
  // selected row remains visible in the table when the panel is open.
  useEffect(() => {
    if (!urlWordId) return;
    const wordIndex = sortedWords.findIndex((w) => w.id === urlWordId);
    if (wordIndex >= 0 && wordIndex >= displayCount) {
      setDisplayCount(wordIndex + PAGE_SIZE);
    }
  }, [urlWordId, sortedWords, displayCount]);

  return (
    <>
      {/* Filter tabs — the pill strip scrolls horizontally on overflow (via
          ScrollFadeRow) so it can't bleed off-axis on a phone; the search +
          category cluster stays pinned in the trailing slot. */}
      <div className="mb-4 flex items-center gap-3">
        {/* min-w-0 lets the tab strip shrink below its content width so
            ScrollFadeRow's overflow-x-auto actually scrolls. */}
        <div className="min-w-0 flex-1">
          <Tabs
            tabs={tabs}
            activeTab={filter}
            onChange={(tabId) => handleFilterChange(tabId as FilterType)}
            fadeClassName="from-background"
          />
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <InlineSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Filter words..."
          />
          <CategoryFilter
            options={CATEGORY_OPTIONS}
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />
        </div>
      </div>

      {/* Letter filter — a single horizontally-scrollable row on mobile (the
          full A–Z won't fit), wrapping onto multiple rows from md up. The
          edge gradients (mobile only) hint that the row scrolls. */}
      <div className="relative mb-4">
        <div ref={letterScrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-x-visible">
          {ALPHABET.map((letter) => {
            const isAvailable = availableLetters.has(letter);
            const isActive = letterFilter === letter;
            return (
              <button
                key={letter}
                onClick={() => isAvailable && handleLetterChange(isActive ? null : letter)}
                disabled={!isAvailable}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors",
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
        {/* Edge fades (mobile only) — each side only shows when scrollable that way. */}
        {letterCanScrollLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent md:hidden" />
        )}
        {letterCanScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent md:hidden" />
        )}
      </div>

      {/* Words Table — on mobile the columns collapse into a single stacked
          cell per row (see DictionaryRow), so the header is hidden and the
          800px min-width (which forces horizontal scroll) only applies from
          md up. */}
      <div ref={dictScrollRef} className="overflow-x-auto rounded-xl pb-16">
        <table className="w-full table-fixed border-collapse md:min-w-[800px]">
          {/* Table Header */}
          <thead className="hidden md:table-header-group">
            <tr className="whitespace-nowrap">
              <th className="w-[72px] px-6 py-3"></th>
              <th className="px-2 py-3 text-left">
                <SortableHeader
                  label="English"
                  column="english"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-2 py-3 text-left">
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
              <th className="w-[160px] px-2 py-3 text-left">
                <SortableHeader
                  label="Lesson"
                  column="lessonNumber"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className={cn(
                "sticky right-0 z-10 w-[60px] bg-background px-2 py-3",
                canScrollRight && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-background"
              )}></th>
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
                      : filter === "learning"
                        ? "No words being learned yet — start studying to begin!"
                        : filter === "learned"
                          ? "No learned words yet — answer a word with full marks in a test to learn it."
                          : filter === "mastered"
                            ? "No mastered words yet — answer a word with full marks 3 times in a row to master it."
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
                  onClick={() => handleSelectWord(index)}
                  isFirst={index === 0}
                  isLast={index === visibleWords.length - 1 && !hasMore}
                  isSelected={selectedWordId === word.id}
                  showScrollFade={canScrollRight}
                />
              ))
            )}
          </tbody>
        </table>
        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Floating Footer — full width on mobile (no sidebar), insetting to
          clear the nav rail from md up. */}
      <div className={cn("fixed bottom-0 right-0 z-10 bg-white shadow-bar px-6 py-3", sidebarCollapsed ? "left-0 md:left-[72px]" : "left-0 md:left-[240px]")}>
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
