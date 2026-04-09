"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Book, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPagination } from "@/components/admin";
import { AdminWordEditModal } from "@/components/admin/AdminWordEditModal";
import type { WordWithDetails, WordLessonInfo } from "@/components/admin/AdminWordEditModal";
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

interface WordWithLessons extends WordWithDetails {
  language: Language | null;
  lessons: LessonInfo[];
}

interface LessonOption {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

interface WordsBrowserClientProps {
  languages: Language[];
  courses: Course[];
  lessons: LessonOption[];
  words: WordWithLessons[];
  totalCount: number;
  totalWords: number;
  letterCounts: Record<string, number>;
  currentLetter: string;
  currentPage: number;
  pageSize: number;
  languageId: string;
  courseId: string;
  searchQuery: string;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function WordsBrowserClient({
  languages,
  courses,
  lessons,
  words,
  totalCount,
  totalWords,
  letterCounts,
  currentLetter,
  currentPage,
  pageSize,
  languageId,
  courseId,
  searchQuery,
}: WordsBrowserClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local search input state (for debouncing)
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordWithLessons | null>(null);

  // Build URL with updated params
  const buildUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    return `/admin/words?${params.toString()}`;
  };

  // Navigation handlers
  const handleLetterChange = (letter: string) => {
    router.push(buildUrl({ letter, page: "1", search: undefined }));
  };

  const handlePageChange = (page: number) => {
    router.push(buildUrl({ page: page.toString() }));
  };

  const handleLanguageChange = (langId: string) => {
    router.push(buildUrl({ language: langId || undefined, course: undefined, page: "1" }));
  };

  const handleCourseChange = (crsId: string) => {
    router.push(buildUrl({ course: crsId || undefined, page: "1" }));
  };

  const handleSearch = () => {
    if (localSearch.trim()) {
      router.push(buildUrl({ search: localSearch.trim(), page: "1" }));
    } else {
      router.push(buildUrl({ search: undefined, page: "1" }));
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setLocalSearch("");
    router.push(buildUrl({ search: undefined, page: "1" }));
  };

  // Filter courses by language
  const filteredCourses = languageId
    ? courses.filter((c) => c.language_id === languageId)
    : courses;

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get course name for a lesson
  const getCourseName = (courseId: string | null) => {
    if (!courseId) return "";
    const course = courses.find((c) => c.id === courseId);
    return course?.name || "";
  };

  const openEditModal = (word: WordWithLessons) => {
    setEditingWord(word);
    setIsEditModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsEditModalOpen(false);
    setEditingWord(null);
    router.refresh();
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setEditingWord(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Words</h1>
        <p className="mt-1 text-gray-600">
          Browse all vocabulary words across courses. {totalWords.toLocaleString("en-US")} total words.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">
            Language:
          </label>
          <select
            value={languageId}
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
            value={courseId}
            onChange={(e) => handleCourseChange(e.target.value)}
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
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search words..."
              className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button size="sm" onClick={handleSearch}>
            Search
          </Button>
          {searchQuery && (
            <Button size="sm" variant="outline" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Alphabet Tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {ALPHABET.map((letter) => {
          const count = letterCounts[letter] || 0;
          const isSelected = currentLetter === letter && !searchQuery;
          return (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              disabled={count === 0}
              className={`min-w-[36px] rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-white"
                  : count === 0
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={`${count} words`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Pagination Controls (Top) */}
      <div className="mb-4">
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemLabel="words"
          onPageChange={handlePageChange}
        />
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        Showing {words.length.toLocaleString("en-US")} of {totalCount.toLocaleString("en-US")} words
        {currentLetter && !searchQuery && ` starting with "${currentLetter}"`}
        {searchQuery && ` matching "${searchQuery}"`}
      </p>

      {/* Words Table */}
      <div className="rounded-xl bg-white shadow-card">
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
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone-hover">
            {words.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {totalWords === 0 ? (
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
              words.map((word) => (
                <tr
                  key={word.id}
                  onClick={() => openEditModal(word)}
                  className="cursor-pointer hover:bg-gray-50"
                >
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
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (Bottom) */}
      <div className="mt-4">
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemLabel="words"
          onPageChange={handlePageChange}
        />
      </div>

      {/* Shared Word Edit Modal */}
      <AdminWordEditModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        editingWord={editingWord}
        languageName={editingWord?.language?.name}
        onSuccess={handleModalSuccess}
        lessons={lessons}
        getCourseName={(cId) => getCourseName(cId)}
        wordLessons={editingWord?.lessons as WordLessonInfo[] | undefined}
      />
    </div>
  );
}
