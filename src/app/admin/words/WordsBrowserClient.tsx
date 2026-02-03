"use client";

import { useState, useMemo } from "react";
import { Search, Book } from "lucide-react";
import { getFlagFromCode } from "@/lib/utils/flags";

interface Language {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  name: string;
  language_id: string | null;
}

interface LessonInfo {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

interface WordWithLessons {
  id: string;
  headword: string;
  lemma: string;
  english: string;
  language_id: string;
  part_of_speech: string | null;
  gender: string | null;
  transitivity: string | null;
  is_irregular: boolean | null;
  grammatical_number: string | null;
  notes: string | null;
  created_at: string | null;
  language: Language | null;
  lessons: LessonInfo[];
}

interface WordsBrowserClientProps {
  languages: Language[];
  courses: Course[];
  words: WordWithLessons[];
}

export function WordsBrowserClient({
  languages,
  courses,
  words,
}: WordsBrowserClientProps) {
  const [filterLanguageId, setFilterLanguageId] = useState<string>("");
  const [filterCourseId, setFilterCourseId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter courses by language
  const filteredCourses = useMemo(() => {
    if (!filterLanguageId) return courses;
    return courses.filter((c) => c.language_id === filterLanguageId);
  }, [courses, filterLanguageId]);

  // Filter and search words
  const filteredWords = useMemo(() => {
    let result = words;

    // Filter by language
    if (filterLanguageId) {
      result = result.filter((w) => w.language_id === filterLanguageId);
    }

    // Filter by course (words that are in at least one lesson of the selected course)
    if (filterCourseId) {
      result = result.filter((w) =>
        w.lessons.some((l) => l.course_id === filterCourseId)
      );
    }

    // Search by headword or english
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.headword.toLowerCase().includes(query) ||
          w.english.toLowerCase().includes(query) ||
          w.lemma.toLowerCase().includes(query)
      );
    }

    return result;
  }, [words, filterLanguageId, filterCourseId, searchQuery]);

  // Handle language filter change - reset course filter if language changes
  const handleLanguageChange = (languageId: string) => {
    setFilterLanguageId(languageId);
    if (languageId) {
      const validCourse = courses.find(
        (c) => c.language_id === languageId && c.id === filterCourseId
      );
      if (!validCourse) {
        setFilterCourseId("");
      }
    }
  };

  // Get course name for a lesson
  const getCourseName = (courseId: string | null) => {
    if (!courseId) return "";
    const course = courses.find((c) => c.id === courseId);
    return course?.name || "";
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Words</h1>
        <p className="mt-1 text-gray-600">
          Browse all vocabulary words across courses. {words.length} total words.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">
            Language:
          </label>
          <select
            value={filterLanguageId}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All languages</option>
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {getFlagFromCode(lang.code)} {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">
            Course:
          </label>
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All courses</option>
            {filteredCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Search:</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words..."
              className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        Showing {filteredWords.length} of {words.length} words
      </p>

      {/* Words Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Headword
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                English
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Lessons
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredWords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {words.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <Book className="h-8 w-8 text-gray-300" />
                      <p>No words yet. Add words through the Lessons page.</p>
                    </div>
                  ) : (
                    "No words match the current filters."
                  )}
                </td>
              </tr>
            ) : (
              filteredWords.map((word) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{word.headword}</div>
                    {word.lemma !== word.headword && (
                      <div className="text-xs text-gray-400">lemma: {word.lemma}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{word.english}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      {getFlagFromCode(word.language?.code)}
                      {word.language?.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-col gap-0.5">
                      <span className="capitalize">{word.part_of_speech || "-"}</span>
                      {word.gender && (
                        <span className="text-xs text-gray-400">
                          {word.gender === "m" ? "masc" : word.gender === "f" ? "fem" : word.gender === "n" ? "neut" : "m/f"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {word.lessons.length === 0 ? (
                      <span className="text-sm text-gray-400">Not in any lesson</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {word.lessons.map((lesson) => (
                          <span
                            key={lesson.id}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                            title={`${getCourseName(lesson.course_id)} - Lesson #${lesson.number}: ${lesson.title}`}
                          >
                            {lesson.emoji && <span>{lesson.emoji}</span>}
                            #{lesson.number}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
