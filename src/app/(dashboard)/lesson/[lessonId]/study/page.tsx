import { getWords, isAutoLesson } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { canAccessLesson } from "@/lib/utils/accessControl";
import { StudyModeClient } from "./StudyModeClient";

interface StudyPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { lessonId } = await params;
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

  // For guests, we still allow studying but won't save progress
  return (
    <StudyModeClient
      lesson={lesson}
      language={language}
      course={course}
      words={words}
      isGuest={isGuest}
      courseLessons={courseLessons}
      dismissedTipIds={dismissedTipIds}
    />
  );
}
