import { getWords } from "@/lib/queries";
import { notFound } from "next/navigation";
import { TestModeClient } from "./TestModeClient";

interface TestPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function TestPage({ params }: TestPageProps) {
  const { lessonId } = await params;
  const { language, course, lesson, words, isGuest } = await getWords(lessonId);

  if (!lesson || words.length === 0) {
    notFound();
  }

  // For guests, we still allow testing but won't save progress
  return (
    <TestModeClient
      lesson={lesson}
      language={language}
      course={course}
      words={words}
      isGuest={isGuest}
    />
  );
}
