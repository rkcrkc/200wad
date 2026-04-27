"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCourseContext } from "@/context/CourseContext";
import { TestType } from "@/types/test";
import { StartTestModal } from "./StartTestModal";

interface LessonStartTestModalProps {
  lessonId: string;
  lessonTitle: string;
  wordCount: number;
  /**
   * Number of words in this lesson with a memory-trigger image. If omitted,
   * the modal will lazy-fetch this on open so the picture-only option can be
   * disabled when no images exist.
   */
  wordsWithImages?: number;
  /** Optional milestone to forward as `?milestone=` on the test URL. */
  milestone?: string | null;
  /** Optional language name override (defaults to value from CourseContext). */
  languageName?: string;
  onCancel: () => void;
}

/**
 * Wrapper around StartTestModal that handles the URL-building and ancillary
 * data fetching needed to start a test from any non-detail page (tests page,
 * lessons list, scheduler, lesson-completed modal, etc.).
 */
export function LessonStartTestModal({
  lessonId,
  lessonTitle,
  wordCount,
  wordsWithImages: wordsWithImagesProp,
  milestone,
  languageName: languageNameProp,
  onCancel,
}: LessonStartTestModalProps) {
  const router = useRouter();
  const courseContext = useCourseContext();
  const languageName = languageNameProp ?? courseContext.languageName ?? "Foreign";

  const [fetchedImagesCount, setFetchedImagesCount] = useState<number | null>(null);

  useEffect(() => {
    // Skip the fetch when the caller has already supplied the count (e.g. the
    // study completion flow has the words array in scope).
    if (wordsWithImagesProp !== undefined) return;

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("lesson_words")
        .select("words(memory_trigger_image_url)")
        .eq("lesson_id", lessonId);

      if (cancelled) return;

      const count = (data || []).filter(
        (row: { words: { memory_trigger_image_url: string | null } | null }) =>
          row.words?.memory_trigger_image_url
      ).length;
      setFetchedImagesCount(count);
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, wordsWithImagesProp]);

  const handleStart = (
    testType: TestType,
    testTwice: boolean,
    randomOrder: boolean
  ) => {
    const params = new URLSearchParams({ type: testType });
    if (testTwice) params.set("twice", "true");
    if (randomOrder) params.set("random", "true");
    if (milestone) params.set("milestone", milestone);
    router.push(`/lesson/${lessonId}/test?${params.toString()}`);
  };

  // Portals only work in the browser; bail out on the server render pass.
  if (typeof document === "undefined") return null;

  const effectiveImagesCount = wordsWithImagesProp ?? fetchedImagesCount ?? 0;

  return createPortal(
    <StartTestModal
      languageName={languageName}
      lessonTitle={lessonTitle}
      wordCount={wordCount}
      wordsWithImages={effectiveImagesCount}
      onStart={handleStart}
      onCancel={onCancel}
    />,
    document.body
  );
}
