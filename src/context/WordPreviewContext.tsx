"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WordDetailSidebar } from "@/components/WordDetailSidebar";
import { fetchWordPreview } from "@/lib/actions/words";
import { useUser } from "@/context/UserContext";
import type { AdjacentLesson, WordWithDetails } from "@/lib/queries/words";

export interface WordPreviewListItem {
  id: string;
  english: string;
  foreign: string;
  lessonId?: string;
  lessonTitle?: string;
  lessonNumber?: number;
}

interface OpenWordOptions {
  /** Optional list context (e.g. dictionary's filtered/sorted words) so the
   *  panel can show prev/next/jump navigation through that list. */
  wordList?: WordPreviewListItem[];
  currentIndex?: number;
  /** Override lesson info — useful when caller already has it from a row.
   *  When omitted, the provider fetches it as part of the word fetch. */
  lessonId?: string;
  lessonTitle?: string;
  lessonNumber?: number;
}

interface WordPreviewContextValue {
  openWord: (id: string, opts?: OpenWordOptions) => void;
  closeWord: () => void;
  selectedWordId: string | null;
}

const WordPreviewContext = createContext<WordPreviewContextValue | undefined>(
  undefined
);

interface PanelState {
  wordId: string;
  word: WordWithDetails | null;
  lessonId: string | null;
  lessonTitle: string;
  lessonNumber: number;
  /** Every lesson containing this word, ordered by lesson number ASC. */
  lessons: AdjacentLesson[];
  wordList: WordPreviewListItem[] | null;
  currentIndex: number;
  /** True when every lesson containing this word is locked for the user. */
  isLocked: boolean;
}

export function WordPreviewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin } = useUser();

  const [panel, setPanel] = useState<PanelState | null>(null);
  // Race-safe token so a stale fetch doesn't overwrite a newer one
  const fetchTokenRef = useRef(0);
  // Snapshot of the most recent options so prev/next/jump can reuse them
  const optsRef = useRef<OpenWordOptions | undefined>(undefined);

  const buildUrl = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("word", id);
      else params.delete("word");
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams]
  );

  const loadWord = useCallback(
    async (
      id: string,
      list: WordPreviewListItem[] | null,
      index: number,
      providedLessonId?: string,
      providedTitle?: string,
      providedNumber?: number
    ) => {
      const token = ++fetchTokenRef.current;
      const { word, lessonId, lessonTitle, lessonNumber, lessons, isLocked } =
        await fetchWordPreview(id);
      if (token !== fetchTokenRef.current) return;

      if (!word) {
        // Word not found — silently strip param and close
        setPanel(null);
        router.replace(buildUrl(null), { scroll: false });
        return;
      }

      setPanel({
        wordId: id,
        word,
        lessonId: providedLessonId ?? lessonId,
        lessonTitle: providedTitle ?? lessonTitle,
        lessonNumber:
          providedNumber !== undefined ? providedNumber : lessonNumber,
        lessons,
        wordList: list,
        currentIndex: index,
        isLocked,
      });
    },
    [buildUrl, router]
  );

  const openWord = useCallback(
    (id: string, opts?: OpenWordOptions) => {
      optsRef.current = opts;
      const list = opts?.wordList ?? null;
      const index = opts?.currentIndex ?? 0;

      // Optimistically show panel with placeholder while details load
      setPanel((prev) =>
        prev && prev.wordId === id
          ? prev
          : {
              wordId: id,
              word: null,
              lessonId: opts?.lessonId ?? null,
              lessonTitle: opts?.lessonTitle ?? "",
              lessonNumber: opts?.lessonNumber ?? 0,
              lessons: [],
              wordList: list,
              currentIndex: index,
              isLocked: false,
            }
      );

      // Push history entry so browser back closes the panel
      const targetUrl = buildUrl(id);
      const currentWord = searchParams.get("word");
      if (currentWord !== id) {
        if (currentWord) {
          // Already showing another word — just swap content, don't bloat history
          router.replace(targetUrl, { scroll: false });
        } else {
          router.push(targetUrl, { scroll: false });
        }
      }

      void loadWord(
        id,
        list,
        index,
        opts?.lessonId,
        opts?.lessonTitle,
        opts?.lessonNumber
      );
    },
    [buildUrl, router, searchParams, loadWord]
  );

  const closeWord = useCallback(() => {
    setPanel(null);
    optsRef.current = undefined;
    fetchTokenRef.current++; // cancel any in-flight fetch
    router.replace(buildUrl(null), { scroll: false });
  }, [buildUrl, router]);

  // Switch to another word in the same list — replace URL (no history bloat)
  const switchToIndex = useCallback(
    (index: number) => {
      const list = panel?.wordList;
      if (!list || index < 0 || index >= list.length) return;
      const next = list[index];
      router.replace(buildUrl(next.id), { scroll: false });
      void loadWord(
        next.id,
        list,
        index,
        next.lessonId,
        next.lessonTitle,
        next.lessonNumber
      );
    },
    [panel, router, buildUrl, loadWord]
  );

  // Sync from URL (handles bookmarks, refresh, browser back/forward)
  const urlWordId = searchParams.get("word");
  useEffect(() => {
    if (!urlWordId) {
      // URL no longer has ?word= — close panel if open
      if (panel) {
        setPanel(null);
        fetchTokenRef.current++;
      }
      return;
    }
    if (panel?.wordId === urlWordId) return;

    // URL has a word that the panel isn't currently showing — load it
    const opts = optsRef.current;
    void loadWord(
      urlWordId,
      opts?.wordList ?? null,
      opts?.currentIndex ?? 0,
      opts?.lessonId,
      opts?.lessonTitle,
      opts?.lessonNumber
    );
    setPanel((prev) =>
      prev && prev.wordId === urlWordId
        ? prev
        : {
            wordId: urlWordId,
            word: null,
            lessonId: opts?.lessonId ?? null,
            lessonTitle: opts?.lessonTitle ?? "",
            lessonNumber: opts?.lessonNumber ?? 0,
            lessons: [],
            wordList: opts?.wordList ?? null,
            currentIndex: opts?.currentIndex ?? 0,
            isLocked: false,
          }
    );
    // We intentionally only depend on urlWordId — panel changes shouldn't retrigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlWordId]);

  // Esc / background-tab cleanup: stop in-flight fetches when unmounting
  useEffect(() => {
    return () => {
      fetchTokenRef.current++;
    };
  }, []);

  const hasList = !!panel?.wordList && panel.wordList.length > 0;
  const listLength = panel?.wordList?.length ?? 0;
  const idx = panel?.currentIndex ?? 0;

  return (
    <WordPreviewContext.Provider
      value={{
        openWord,
        closeWord,
        selectedWordId: panel?.wordId ?? null,
      }}
    >
      {children}
      {panel && panel.word && (
        <WordDetailSidebar
          word={panel.word}
          lessonTitle={panel.lessonTitle}
          lessonNumber={panel.lessonNumber}
          lessonId={panel.lessonId ?? undefined}
          lessons={panel.lessons}
          onClose={closeWord}
          onPrevious={hasList && idx > 0 ? () => switchToIndex(idx - 1) : undefined}
          onNext={
            hasList && idx < listLength - 1
              ? () => switchToIndex(idx + 1)
              : undefined
          }
          onJumpToWord={hasList ? switchToIndex : undefined}
          hasPrevious={hasList && idx > 0}
          hasNext={hasList && idx < listLength - 1}
          currentIndex={idx}
          totalWords={hasList ? listLength : 1}
          wordList={
            hasList
              ? panel.wordList!.map((w) => ({
                  id: w.id,
                  english: w.english,
                  foreign: w.foreign,
                }))
              : [
                  {
                    id: panel.word.id,
                    english: panel.word.english,
                    foreign: panel.word.headword,
                  },
                ]
          }
          isAdmin={isAdmin}
          showProgress={hasList}
          isLocked={panel.isLocked}
        />
      )}
    </WordPreviewContext.Provider>
  );
}

export function useWordPreview() {
  const ctx = useContext(WordPreviewContext);
  if (!ctx) {
    throw new Error("useWordPreview must be used within WordPreviewProvider");
  }
  return ctx;
}
