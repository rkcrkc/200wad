import { getWords } from "@/lib/queries";
import { notFound } from "next/navigation";
import { StudyModeClient } from "./StudyModeClient";

interface StudyPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { lessonId } = await params;
  const { language, course, lesson, words, isGuest } = await getWords(lessonId);

  if (!lesson || words.length === 0) {
    notFound();
  }

  // For guests, we still allow studying but won't save progress
  return (
    <StudyModeClient
      lesson={lesson}
      language={language}
      course={course}
      words={words}
      isGuest={isGuest}
    />
  );
}
