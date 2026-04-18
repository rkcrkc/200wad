import { getWords, isAutoLesson } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { canAccessLesson } from "@/lib/utils/accessControl";
import { StudyModeClient } from "./StudyModeClient";

interface StudyPageProps {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ wordIds?: string }>;
}

export default async function StudyPage({ params, searchParams }: StudyPageProps) {
  const { lessonId } = await params;
  const { wordIds: wordIdsParam } = await searchParams;
  const { language, course, lesson, words, isGuest, courseLessons, userId, dismissedTipIds } = await getWords(lessonId);

  if (!lesson || words.length === 0) {
    notFound();
  }

  // Access gate: redirect to course page if lesson is locked
  if (course && !isAutoLesson(lessonId)) {
    const access = await canAccessLesson(
      userId,
      { lessonNumber: lesson.number },
      { id: course.id, language_id: course.language_id, free_lessons: course.free_lessons }
    );
    if (!access.hasAccess) {
      redirect(`/course/${course.id}`);
    }
  }

  // Filter words if specific word IDs are provided (e.g. "study incorrect words" from test modal)
  let studyWords = words;
  if (wordIdsParam) {
    const wordIdSet = new Set(wordIdsParam.split(","));
    const filtered = words.filter((w) => wordIdSet.has(w.id));
    if (filtered.length > 0) {
      studyWords = filtered;
    }
  }

  // For guests, we still allow studying but won't save progress
  return (
    <StudyModeClient
      lesson={lesson}
      language={language}
      course={course}
      words={studyWords}
      isGuest={isGuest}
      courseLessons={courseLessons}
      dismissedTipIds={dismissedTipIds}
    />
  );
}
