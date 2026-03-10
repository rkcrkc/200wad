import { getWords } from "@/lib/queries";
import { notFound } from "next/navigation";
import { TestModeClient } from "./TestModeClient";
import { TestType, DEFAULT_TEST_TYPE } from "@/types/test";

interface TestPageProps {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ type?: string; twice?: string; milestone?: string }>;
}

export default async function TestPage({ params, searchParams }: TestPageProps) {
  const { lessonId } = await params;
  const { type, twice, milestone } = await searchParams;
  const testTwice = twice === "true";
  const { language, course, lesson, words, isGuest } = await getWords(lessonId);

  if (!lesson || words.length === 0) {
    notFound();
  }

  // Validate test type from URL, default to english-to-foreign
  const validTestTypes: TestType[] = ["english-to-foreign", "foreign-to-english", "picture-only"];
  const testType: TestType = validTestTypes.includes(type as TestType)
    ? (type as TestType)
    : DEFAULT_TEST_TYPE;

  // For picture-only mode, filter to only words with images
  const testWords = testType === "picture-only"
    ? words.filter((w) => w.memory_trigger_image_url)
    : words;

  // If picture-only mode but no words with images, redirect or show error
  if (testType === "picture-only" && testWords.length === 0) {
    notFound();
  }

  // For guests, we still allow testing but won't save progress
  return (
    <TestModeClient
      lesson={lesson}
      language={language}
      course={course}
      words={testWords}
      isGuest={isGuest}
      testType={testType}
      testTwice={testTwice}
      milestone={milestone || null}
    />
  );
}
