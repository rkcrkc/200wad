"use client";

import { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  ChevronDown,
  List,
  X,
  ChevronsUpDown,
  HelpCircle,
  BookOpen,
  MessageCircleQuestion,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { HelpLinkPreview } from "@/components/HelpLinkPreview";
import { Badge } from "@/components/ui/badge";
import type { HelpEntry } from "@/types/database";

interface HelpPageClientProps {
  entries: HelpEntry[];
  initialSlug?: string;
}

export function HelpPageClient({ entries, initialSlug }: HelpPageClientProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | undefined>(initialSlug);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<number>(0);

  // Sync with prop when navigating between routes
  useEffect(() => {
    setActiveSlug(initialSlug);
  }, [initialSlug]);

  // Group entries by category
  const groupedEntries = useMemo(() => {
    const groups: Record<string, HelpEntry[]> = {};
    const filtered = searchQuery
      ? entries.filter(
          (e) =>
            e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : entries;

    for (const entry of filtered) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return groups;
  }, [entries, searchQuery]);

  const categoryNames = useMemo(
    () => Object.keys(groupedEntries).sort(),
    [groupedEntries]
  );

  // Start with all categories collapsed
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => new Set(Object.keys(groupedEntries))
  );

  // Expand all when searching
  useEffect(() => {
    if (searchQuery) {
      setCollapsedCategories(new Set());
    }
  }, [searchQuery]);

  // Resolve selected entry
  const selectedEntry = useMemo(() => {
    if (activeSlug) {
      return entries.find((e) => e.slug === activeSlug) || null;
    }
    return null;
  }, [activeSlug, entries]);

  const selectEntry = useCallback(
    (slug: string) => {
      if (sidebarScrollRef.current) {
        savedScrollRef.current = sidebarScrollRef.current.scrollTop;
      }
      setActiveSlug(slug);
      router.push(`/help/${slug}`, { scroll: false });
      setSidebarOpen(false);
    },
    [router]
  );

  // Restore sidebar scroll position after re-render
  useLayoutEffect(() => {
    if (sidebarScrollRef.current && savedScrollRef.current > 0) {
      sidebarScrollRef.current.scrollTop = savedScrollRef.current;
    }
  }, [activeSlug]);

  // Build a map of slug → { title, preview } for tooltip lookups
  const previewMap = useMemo(() => {
    const map: Record<string, { title: string; preview: string }> = {};
    for (const entry of entries) {
      if (entry.preview) {
        map[entry.slug] = { title: entry.title, preview: entry.preview };
      }
    }
    return map;
  }, [entries]);

  // Custom markdown components — wraps internal /help/ links in HelpLinkPreview
  const markdownComponents = useMemo(
    () => ({
      br: () => <span className="block mt-[0.5rem]" />,
      a: ({ href, children, node, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode; node?: unknown }) => {
        const linkClass = "text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid";

        if (href?.startsWith("/help/")) {
          const slug = href.replace("/help/", "");
          const info = previewMap[slug];

          const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            selectEntry(slug);
          };

          if (info) {
            return (
              <HelpLinkPreview slug={slug} title={info.title} preview={info.preview}>
                <a href={href} onClick={handleClick} className={linkClass} {...props}>
                  {children}
                </a>
              </HelpLinkPreview>
            );
          }

          return (
            <a href={href} onClick={handleClick} className={linkClass} {...props}>
              {children}
            </a>
          );
        }

        return (
          <a href={href} className={linkClass} {...props}>
            {children}
          </a>
        );
      },
    }),
    [previewMap, selectEntry]
  );

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle expand/collapse all
  const allCollapsed = collapsedCategories.size === categoryNames.length;
  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedCategories(new Set());
    } else {
      setCollapsedCategories(new Set(categoryNames));
    }
  };

  // Expand category of selected entry when it changes
  useEffect(() => {
    if (selectedEntry) {
      setCollapsedCategories((prev) => {
        if (prev.has(selectedEntry.category)) {
          const next = new Set(prev);
          next.delete(selectedEntry.category);
          return next;
        }
        return prev;
      });
    }
  }, [selectedEntry]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Search + expand/collapse toggle */}
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <span className="text-xs text-muted-foreground">
          {entries.length} entries
        </span>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 rounded-md p-1 text-xs text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
          title={allCollapsed ? "Expand all" : "Collapse all"}
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Entry list */}
      <div ref={sidebarScrollRef} className="flex-1 overflow-auto px-2 pb-4">
        {categoryNames.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No entries found.
          </p>
        ) : (
          categoryNames.map((category) => {
            const isCollapsed = collapsedCategories.has(category);
            return (
              <div key={category} className="mb-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-white"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {category}
                  <span className="ml-auto text-xs font-normal">
                    {groupedEntries[category].length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div>
                    {groupedEntries[category].map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => selectEntry(entry.slug)}
                        className={`w-full rounded-lg py-1.5 pl-8 pr-3 text-left text-sm transition-colors ${
                          selectedEntry?.id === entry.id
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground hover:bg-white"
                        }`}
                      >
                        {entry.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="-mx-4 -mt-[8px] flex h-[calc(100vh-72px)] md:-mx-8 lg:-mx-10">
      {/* Desktop sidebar (lg+) — fixed position */}
      <div className="hidden lg:fixed lg:left-[240px] lg:top-[72px] lg:bottom-0 lg:z-10 lg:block lg:w-[280px] lg:border-r lg:border-gray-200 lg:bg-background">
        {sidebarContent}
      </div>

      {/* Spacer for fixed sidebar */}
      <div className="hidden lg:block lg:w-[280px] lg:shrink-0" />

      {/* Mobile sidebar button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:hidden"
        aria-label="Open help index"
      >
        <List className="h-5 w-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[300px] bg-background shadow-xl lg:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <span className="text-sm font-semibold">Help Index</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1 hover:bg-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        </>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {selectedEntry ? (
          <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
            <div className="rounded-xl bg-white p-6 lg:p-10">
              <h1 className="text-page-header mb-2">{selectedEntry.title}</h1>
              <Badge variant="beige" className="mb-6 text-muted-foreground">
                {selectedEntry.category}
              </Badge>
              <div className="prose prose-gray mt-4 max-w-none prose-a:text-primary prose-a:underline prose-a:decoration-dotted prose-a:underline-offset-2 hover:prose-a:decoration-solid">
                <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>{selectedEntry.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl px-6 py-12 lg:px-10">
            <div className="text-center">
              <HelpCircle className="mx-auto mb-4 h-12 w-12 text-primary/40" />
              <h1 className="text-xxl-bold mb-3">Help</h1>
              <p className="text-regular-semibold text-muted-foreground">
                Everything you need to know about using 200 Words a Day
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <BookOpen className="mb-3 h-6 w-6 text-primary" />
                <h3 className="text-regular-semibold mb-1">Browse Topics</h3>
                <p className="text-sm text-muted-foreground">
                  Use the sidebar to explore {categoryNames.length} categories covering {entries.length} topics — from lessons and tests to memory techniques and settings.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <Search className="mb-3 h-6 w-6 text-primary" />
                <h3 className="text-regular-semibold mb-1">Search</h3>
                <p className="text-sm text-muted-foreground">
                  Looking for something specific? Type in the search bar to filter entries by title or content.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <MessageCircleQuestion className="mb-3 h-6 w-6 text-primary" />
                <h3 className="text-regular-semibold mb-1">Linked Entries</h3>
                <p className="text-sm text-muted-foreground">
                  Many help entries link to related topics. Click any blue link within an entry to jump straight to it.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <List className="mb-3 h-6 w-6 text-primary" />
                <h3 className="text-regular-semibold mb-1">On Mobile</h3>
                <p className="text-sm text-muted-foreground">
                  Tap the blue button in the bottom-right corner to open the topic index and navigate between entries.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
