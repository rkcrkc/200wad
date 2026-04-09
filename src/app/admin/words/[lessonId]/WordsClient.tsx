"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Volume2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/admin";
import { AdminWordEditModal } from "@/components/admin/AdminWordEditModal";
import type { WordWithDetails, WordLessonInfo } from "@/components/admin/AdminWordEditModal";
import { deleteWord, reorderWords } from "@/lib/mutations/admin/words";
import { uploadFileClient } from "@/lib/supabase/storage.client";
import { createClient } from "@/lib/supabase/client";
import { getFlagFromCode } from "@/lib/utils/flags";

interface Language {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  name: string;
  language: Language | null;
}

interface Lesson {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course: Course | null;
}

interface ExampleSentence {
  id: string;
  foreign_sentence: string;
  english_sentence: string;
  thumbnail_image_url: string | null;
  sort_order: number | null;
}

interface Word extends WordWithDetails {
  sort_order: number;
  example_sentences: ExampleSentence[];
}

interface LessonOption {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

interface CourseOption {
  id: string;
  name: string;
  language_id: string | null;
}

interface WordsClientProps {
  lesson: Lesson;
  words: Word[];
  positionInOrder?: number | null;
  allLessons?: LessonOption[];
  allCourses?: CourseOption[];
}

export function WordsClient({ lesson, words, positionInOrder, allLessons, allCourses }: WordsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editingWordLessons, setEditingWordLessons] = useState<WordLessonInfo[]>([]);
  const [deletingWord, setDeletingWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCourseName = (courseId: string) => {
    const course = allCourses?.find((c) => c.id === courseId);
    return course?.name || "";
  };

  const openCreateModal = () => {
    setEditingWord(null);
    setEditingWordLessons([]);
    setIsModalOpen(true);
  };

  const openEditModal = async (word: Word) => {
    setEditingWord(word);
    setIsModalOpen(true);

    // Fetch which lessons this word belongs to
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("lesson_words")
        .select("lesson_id, lessons(id, number, title, emoji, course_id)")
        .eq("word_id", word.id);

      if (data) {
        const wLessons: WordLessonInfo[] = data.map((lw: any) => ({
          id: lw.lessons.id,
          number: lw.lessons.number,
          title: lw.lessons.title,
          emoji: lw.lessons.emoji,
          course_id: lw.lessons.course_id,
        }));
        setEditingWordLessons(wLessons);
      }
    } catch {
      // Fallback: we know the word is in the current lesson
      setEditingWordLessons([{
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        emoji: lesson.emoji,
        course_id: lesson.course?.id || null,
      }]);
    }
  };

  const openDeleteModal = (word: Word) => {
    setDeletingWord(word);
    setIsDeleteModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingWord(null);
    setEditingWordLessons([]);
    router.refresh();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingWord(null);
    setEditingWordLessons([]);
  };

  const handleDelete = async () => {
    if (!deletingWord) return;

    setIsLoading(true);
    try {
      const result = await deleteWord(deletingWord.id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsDeleteModalOpen(false);
      setDeletingWord(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveWord = async (wordId: string, direction: "up" | "down") => {
    const currentIndex = words.findIndex((w) => w.id === wordId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= words.length) return;

    // Create new order by swapping
    const newOrder = [...words];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    const result = await reorderWords(lesson.id, newOrder.map((w) => w.id));
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to reorder words");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/words"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to lessons
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              {lesson.emoji && <span>{lesson.emoji}</span>}
              {lesson.title}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Lesson ID: {lesson.number}
            </p>
            <p className="mt-1 text-gray-600">
              {getFlagFromCode(lesson.course?.language?.code)}{" "}
              <strong>Course:</strong> {lesson.course?.name || "Not assigned"}
              {lesson.course && positionInOrder != null && (
                <span className="text-gray-500"> · Lesson {positionInOrder}</span>
              )}{" "}
              &middot; {words.length.toLocaleString("en-US")} word{words.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Word
          </Button>
        </div>
      </div>

      {/* Words List */}
      <div className="rounded-xl bg-white shadow-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-20 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                English
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {lesson.course?.language?.name || "Foreign"}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Media
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Sentences
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone-hover">
            {words.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No words yet. Add your first word to this lesson.
                </td>
              </tr>
            ) : (
              words.map((word, index) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveWord(word.id, "up")}
                          disabled={index === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveWord(word.id, "down")}
                          disabled={index === words.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="w-6 text-center text-sm font-medium text-gray-500">
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {word.english}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {word.headword}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 capitalize">
                    {word.part_of_speech || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      {word.memory_trigger_image_url && (
                        <span title="Has image">
                          <ImageIcon className="h-4 w-4 text-green-500" />
                        </span>
                      )}
                      {(word.audio_url_english ||
                        word.audio_url_foreign ||
                        word.audio_url_trigger) && (
                        <span title="Has audio">
                          <Volume2 className="h-4 w-4 text-blue-500" />
                        </span>
                      )}
                      {!word.memory_trigger_image_url &&
                        !word.audio_url_english &&
                        !word.audio_url_foreign &&
                        !word.audio_url_trigger && (
                          <span className="text-gray-400">-</span>
                        )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {word.example_sentences?.length || 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(word)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(word)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Shared Word Create/Edit Modal */}
      <AdminWordEditModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editingWord={editingWord}
        lessonId={lesson.id}
        languageName={lesson.course?.language?.name || undefined}
        onSuccess={handleModalSuccess}
        lessons={allLessons}
        getCourseName={getCourseName}
        wordLessons={editingWordLessons}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingWord(null);
        }}
        onConfirm={handleDelete}
        title="Delete Word"
        message={`Are you sure you want to delete "${deletingWord?.headword}" (${deletingWord?.english})? This will also delete all example sentences.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />
    </div>
  );
}
