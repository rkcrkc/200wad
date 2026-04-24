"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { useCourseContext } from "@/context/CourseContext";
import {
  searchCourse,
  SearchWordResult,
  SearchLessonResult,
} from "@/lib/queries/search.client";

// ============================================================================
// Category display config
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  word: "Words",
  sentence: "Sentences",
  phrase: "Phrases",
  fact: "Facts",
  information: "Information",
};

const CATEGORY_ORDER = ["word", "sentence", "phrase", "fact", "information"];

// ============================================================================
// Highlight helper
// ============================================================================

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ============================================================================
// Flattened result item for keyboard navigation
// ============================================================================

interface FlatItem {
  type: "word" | "lesson";
  word?: SearchWordResult;
  lesson?: SearchLessonResult;
}

// ============================================================================
// SearchBar Component
// ============================================================================

export function SearchBar() {
  const router = useRouter();
  const { courseId, languageId } = useCourseContext();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    words: SearchWordResult[];
    lessons: SearchLessonResult[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Build a flat list of all results for keyboard navigation
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!results) return [];
    const items: FlatItem[] = [];

    // Group words by category in defined order
    for (const cat of CATEGORY_ORDER) {
      const catWords = results.words.filter((w) => w.category === cat);
      for (const word of catWords) {
        items.push({ type: "word", word });
      }
    }
    // Words with unknown categories
    const knownCats = new Set(CATEGORY_ORDER);
    const otherWords = results.words.filter(
      (w) => !w.category || !knownCats.has(w.category)
    );
    for (const word of otherWords) {
      items.push({ type: "word", word });
    }

    // Lessons
    for (const lesson of results.lessons) {
      items.push({ type: "lesson", lesson });
    }

    return items;
  }, [results]);

  // Debounced search
  const performSearch = useCallback(
    (searchQuery: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!courseId || !languageId || searchQuery.trim().length < 2) {
        setResults(null);
        setIsLoading(false);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        const data = await searchCourse(searchQuery, courseId, languageId);
        setResults(data);
        setActiveIndex(-1);
        setIsOpen(true);
        setIsLoading(false);
      }, 300);
    },
    [courseId, languageId]
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    performSearch(value);
  };

  // Navigate to a result
  const navigateTo = useCallback(
    (item: FlatItem) => {
      setIsOpen(false);
      setQuery("");
      setResults(null);
      inputRef.current?.blur();

      if (item.type === "word" && item.word) {
        router.push(
          `/course/${courseId}/dictionary?word=${item.word.id}`
        );
      } else if (item.type === "lesson" && item.lesson) {
        router.push(`/lesson/${item.lesson.id}`);
      }
    },
    [router, courseId]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatItems.length === 0) {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < flatItems.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : flatItems.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatItems.length) {
          navigateTo(flatItems[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll("[data-search-item]");
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Close on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !inputRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Cmd+K global shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        if (query.trim().length >= 2 && results) {
          setIsOpen(true);
        }
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [query, results]);

  // Re-open on focus if there are cached results
  const handleFocus = () => {
    if (query.trim().length >= 2 && results) {
      setIsOpen(true);
    }
  };

  // Group words by category for rendering
  const wordGroups = useMemo(() => {
    if (!results) return [];
    const groups: { category: string; label: string; words: SearchWordResult[] }[] = [];

    for (const cat of CATEGORY_ORDER) {
      const catWords = results.words.filter((w) => w.category === cat);
      if (catWords.length > 0) {
        groups.push({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          words: catWords,
        });
      }
    }

    // Unknown categories
    const knownCats = new Set(CATEGORY_ORDER);
    const otherWords = results.words.filter(
      (w) => !w.category || !knownCats.has(w.category)
    );
    if (otherWords.length > 0) {
      groups.push({ category: "other", label: "Other", words: otherWords });
    }

    return groups;
  }, [results]);

  // Track the flat index for rendering
  let flatIdx = 0;

  const hasResults =
    results && (results.words.length > 0 || results.lessons.length > 0);
  const showDropdown = isOpen && results !== null;

  return (
    <div className="relative ml-5 hidden h-[42px] w-[400px] shrink-0 lg:block">
      <div className="border-secondary bg-input-background absolute top-0 left-0 h-[42px] w-full rounded-[10px] border">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search words, lessons or help"
          className="text-foreground placeholder:text-muted-foreground focus:ring-primary h-full w-full rounded-[inherit] bg-transparent py-2 pr-4 pl-10 text-[15px] leading-[1.35] font-medium tracking-[-0.3px] focus:ring-2 focus:outline-none"
        />
      </div>
      <div className="pointer-events-none absolute top-[9px] left-3">
        {isLoading ? (
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        ) : (
          <Search className="text-muted-foreground h-5 w-5" />
        )}
      </div>

      {/* Cmd+K hint */}
      {!query && (
        <div className="pointer-events-none absolute top-[9px] right-3">
          <kbd className="text-muted-foreground flex h-6 items-center rounded-md border border-gray-200 bg-gray-50 px-1.5 text-[11px] font-medium">
            <span className="mr-0.5 text-[13px]">&#8984;</span>K
          </kbd>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-[calc(100%+6px)] left-0 z-50 max-h-[400px] w-full overflow-y-auto rounded-xl bg-white shadow-xl ring-1 ring-black/5"
        >
          {!hasResults ? (
            <div className="px-4 py-8 text-center">
              <span className="text-muted-foreground text-[14px]">
                No results found
              </span>
            </div>
          ) : (
            <>
              {/* Word groups */}
              {wordGroups.map((group) => (
                <div key={group.category}>
                  <div className="px-4 pb-1 pt-3">
                    <span className="text-muted-foreground text-[12px] font-medium uppercase tracking-wide">
                      {group.label}
                    </span>
                  </div>
                  {group.words.map((word) => {
                    const idx = flatIdx++;
                    return (
                      <button
                        key={word.id}
                        data-search-item
                        onClick={() =>
                          navigateTo({ type: "word", word })
                        }
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          idx === activeIndex
                            ? "bg-bone-hover"
                            : "hover:bg-bone-hover"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground truncate text-[14px] font-semibold leading-[1.4]">
                            <HighlightMatch
                              text={word.english}
                              query={query}
                            />
                          </div>
                          <div className="text-muted-foreground truncate text-[13px] leading-[1.4]">
                            <HighlightMatch
                              text={word.headword}
                              query={query}
                            />
                          </div>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-[12px]">
                          Lesson {word.lessonNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Lessons */}
              {results.lessons.length > 0 && (
                <div>
                  {results.words.length > 0 && (
                    <div className="mx-4 border-t border-gray-100" />
                  )}
                  <div className="px-4 pb-1 pt-3">
                    <span className="text-muted-foreground text-[12px] font-medium uppercase tracking-wide">
                      Lessons
                    </span>
                  </div>
                  {results.lessons.map((lesson) => {
                    const idx = flatIdx++;
                    return (
                      <button
                        key={lesson.id}
                        data-search-item
                        onClick={() =>
                          navigateTo({ type: "lesson", lesson })
                        }
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          idx === activeIndex
                            ? "bg-bone-hover"
                            : "hover:bg-bone-hover"
                        }`}
                      >
                        {lesson.emoji && (
                          <span className="shrink-0 text-[18px]">
                            {lesson.emoji}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground truncate text-[14px] font-semibold leading-[1.4]">
                            <HighlightMatch
                              text={lesson.title}
                              query={query}
                            />
                          </div>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-[12px]">
                          #{lesson.number}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
