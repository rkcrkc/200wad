"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Volume2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminSelect,
  AdminStatusBadge,
  SortableList,
  SortableRow,
  DragHandle,
  reorderById,
} from "@/components/admin";
import { AdminWordEditModal } from "@/components/admin/AdminWordEditModal";
import type { WordWithDetails, WordLessonInfo } from "@/components/admin/AdminWordEditModal";
import {
  createLesson,
  updateLesson,
  deleteLesson,
  publishLesson,
  unpublishLesson,
  cloneLesson,
} from "@/lib/mutations/admin/lessons";
import {
  removeWordFromLesson,
  reorderWords,
} from "@/lib/mutations/admin/words";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/client";

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

interface Lesson {
  id: string;
  course_id: string | null;
  number: number;
  title: string;
  emoji: string | null;
  word_count: number | null;
  sort_order: number | null;
  is_published: boolean | null;
  course: {
    id: string;
    name: string;
    language: Language | null;
  } | null;
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

interface LessonsClientProps {
  languages: Language[];
  courses: Course[];
  lessons: Lesson[];
  initialLessonId?: string;
  fromCourseId?: string;
}

interface LessonFormData {
  course_id: string;
  number: number;
  title: string;
  emoji: string;
}

interface LessonFormErrors {
  course_id?: string;
  number?: string;
  title?: string;
}

export function LessonsClient({
  languages,
  courses,
  lessons,
  initialLessonId,
  fromCourseId,
}: LessonsClientProps) {
  const router = useRouter();

  // View state - "list" shows lessons, "words" shows words for selected lesson
  const [viewMode, setViewMode] = useState<"list" | "words">("list");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);

  // Lesson list state
  const [filterLanguageId, setFilterLanguageId] = useState<string>("");
  const [filterCourseId, setFilterCourseId] = useState<string>("");
  const [sortField, setSortField] = useState<"number" | "title">("number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isDeleteLessonModalOpen, setIsDeleteLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<LessonFormData>({
    course_id: "",
    number: 1,
    title: "",
    emoji: "",
  });
  const [lessonErrors, setLessonErrors] = useState<LessonFormErrors>({});

  // Word modal state (using shared AdminWordEditModal)
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [isRemoveWordModalOpen, setIsRemoveWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editingWordLessons, setEditingWordLessons] = useState<WordLessonInfo[]>([]);
  const [removingWord, setRemovingWord] = useState<Word | null>(null);

  // Inline lesson editing state (for words view)
  const [isEditingLessonDetails, setIsEditingLessonDetails] = useState(false);
  const [inlineLessonForm, setInlineLessonForm] = useState({
    number: 0,
    title: "",
    emoji: "",
  });
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  // Filter courses by language
  const filteredCourses = useMemo(() => {
    if (!filterLanguageId) return courses;
    return courses.filter((c) => c.language_id === filterLanguageId);
  }, [courses, filterLanguageId]);

  // Filter and sort lessons by language and course
  const filteredLessons = useMemo(() => {
    let result = lessons;
    if (filterLanguageId) {
      result = result.filter(
        (l) => l.course?.language?.id === filterLanguageId
      );
    }
    if (filterCourseId) {
      result = result.filter((l) => l.course_id === filterCourseId);
    }
    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortField === "number") {
        comparison = a.number - b.number;
      } else if (sortField === "title") {
        comparison = a.title.localeCompare(b.title);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return result;
  }, [lessons, filterLanguageId, filterCourseId, sortField, sortDirection]);

  // Handle sort toggle
  const handleSort = (field: "number" | "title") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: "number" | "title" }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300">&#8597;</span>;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  // Get next lesson number for selected course
  const getNextNumber = (courseId: string) => {
    const courseLessons = lessons.filter((l) => l.course_id === courseId);
    const maxNumber = Math.max(0, ...courseLessons.map((l) => l.number));
    return maxNumber + 1;
  };

  // ============================================================================
  // LESSON HANDLERS
  // ============================================================================

  const resetLessonForm = () => {
    const defaultCourseId = filterCourseId || "";
    setLessonFormData({
      course_id: defaultCourseId,
      number: defaultCourseId ? getNextNumber(defaultCourseId) : 1,
      title: "",
      emoji: "",
    });
    setLessonErrors({});
    setEditingLesson(null);
  };

  const openCreateLessonModal = () => {
    resetLessonForm();
    setIsLessonModalOpen(true);
  };

  const openEditLessonModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonFormData({
      course_id: lesson.course_id || "",
      number: lesson.number,
      title: lesson.title,
      emoji: lesson.emoji || "",
    });
    setLessonErrors({});
    setIsLessonModalOpen(true);
  };

  const openDeleteLessonModal = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setDeletingLesson(lesson);
    setIsDeleteLessonModalOpen(true);
  };

  const validateLessonForm = (): boolean => {
    const newErrors: LessonFormErrors = {};
    if (!lessonFormData.course_id) {
      newErrors.course_id = "Course is required";
    }
    if (!lessonFormData.number || lessonFormData.number < 1) {
      newErrors.number = "Lesson number must be at least 1";
    }
    if (!lessonFormData.title.trim()) {
      newErrors.title = "Title is required";
    }
    setLessonErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLessonSubmit = async () => {
    if (!validateLessonForm()) return;

    setIsLoading(true);
    try {
      if (editingLesson) {
        const result = await updateLesson(editingLesson.id, {
          number: lessonFormData.number,
          title: lessonFormData.title,
          emoji: lessonFormData.emoji || null,
        });
        if (!result.success) {
          setLessonErrors({ title: result.error || "Failed to update lesson" });
          return;
        }
      } else {
        const result = await createLesson({
          course_id: lessonFormData.course_id,
          number: lessonFormData.number,
          title: lessonFormData.title,
          emoji: lessonFormData.emoji || null,
        });
        if (!result.success) {
          setLessonErrors({ title: result.error || "Failed to create lesson" });
          return;
        }
      }

      setIsLessonModalOpen(false);
      resetLessonForm();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!deletingLesson) return;

    setIsLoading(true);
    try {
      const result = await deleteLesson(deletingLesson.id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsDeleteLessonModalOpen(false);
      setDeletingLesson(null);
      // If we were viewing this lesson's words, go back to the list
      if (selectedLesson && selectedLesson.id === deletingLesson.id) {
        setViewMode("list");
        setSelectedLesson(null);
        setWords([]);
      }
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (lesson: Lesson, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const action = lesson.is_published ? unpublishLesson : publishLesson;
    const result = await action(lesson.id);
    if (!result.success) {
      alert(result.error);
    } else {
      // Update editingLesson state if we're in the modal
      if (editingLesson && editingLesson.id === lesson.id) {
        setEditingLesson({ ...editingLesson, is_published: !lesson.is_published });
      }
      router.refresh();
    }
  };

  const handleCloneFromModal = async () => {
    if (!editingLesson) return;
    const confirmed = window.confirm(
      `Clone "${editingLesson.title}" with all its words and sentences?`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await cloneLesson(editingLesson.id);
      if (!result.success) {
        alert(result.error);
      } else {
        setIsLessonModalOpen(false);
        resetLessonForm();
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFromModal = () => {
    if (!editingLesson) return;
    setIsLessonModalOpen(false);
    setDeletingLesson(editingLesson);
    setIsDeleteLessonModalOpen(true);
  };

  const handleViewWordsFromModal = () => {
    if (!editingLesson) return;
    setIsLessonModalOpen(false);
    resetLessonForm();
    selectLesson(editingLesson);
  };

  const handleClone = async (lesson: Lesson, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const confirmed = window.confirm(
      `Clone "${lesson.title}" with all its words and sentences?`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await cloneLesson(lesson.id);
      if (!result.success) {
        alert(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleFormCourseChange = (courseId: string) => {
    setLessonFormData({
      ...lessonFormData,
      course_id: courseId,
      number: courseId ? getNextNumber(courseId) : 1,
    });
  };

  // ============================================================================
  // LESSON SELECTION - Switch to Words View
  // ============================================================================

  const selectLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setViewMode("words");
    setIsLoadingWords(true);
    setIsEditingLessonDetails(false);
    setInlineLessonForm({
      number: lesson.number,
      title: lesson.title,
      emoji: lesson.emoji || "",
    });

    try {
      const supabase = createClient();
      const { data: lessonWords, error } = await supabase
        .from("lesson_words")
        .select(`
          sort_order,
          words(*, example_sentences(*))
        `)
        .eq("lesson_id", lesson.id)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching words:", error);
        setWords([]);
      } else {
        const wordsData = (lessonWords || []).map((lw) => ({
          ...(lw.words as any),
          sort_order: lw.sort_order,
        }));
        setWords(wordsData);
      }
    } catch (error) {
      console.error("Error fetching words:", error);
      setWords([]);
    } finally {
      setIsLoadingWords(false);
    }
  };

  // Find the course we came from (if any)
  const fromCourse = fromCourseId ? courses.find(c => c.id === fromCourseId) : null;

  const goBackToLessons = () => {
    if (fromCourseId) {
      // Navigate back to the course detail page
      router.push(`/admin/courses?course=${fromCourseId}`);
      return;
    }
    setViewMode("list");
    setSelectedLesson(null);
    setWords([]);
    setIsEditingLessonDetails(false);
    router.refresh(); // Refresh to update word counts
  };

  const startEditingLessonDetails = () => {
    if (selectedLesson) {
      setInlineLessonForm({
        number: selectedLesson.number,
        title: selectedLesson.title,
        emoji: selectedLesson.emoji || "",
      });
      setIsEditingLessonDetails(true);
    }
  };

  const cancelEditingLessonDetails = () => {
    if (selectedLesson) {
      setInlineLessonForm({
        number: selectedLesson.number,
        title: selectedLesson.title,
        emoji: selectedLesson.emoji || "",
      });
    }
    setIsEditingLessonDetails(false);
  };

  const saveInlineLessonDetails = async () => {
    if (!selectedLesson) return;
    if (!inlineLessonForm.title.trim()) {
      alert("Title is required");
      return;
    }

    setIsSavingLesson(true);
    try {
      const result = await updateLesson(selectedLesson.id, {
        number: inlineLessonForm.number,
        title: inlineLessonForm.title,
        emoji: inlineLessonForm.emoji || null,
      });
      if (!result.success) {
        alert(result.error || "Failed to update lesson");
        return;
      }
      // Update local state
      setSelectedLesson({
        ...selectedLesson,
        number: inlineLessonForm.number,
        title: inlineLessonForm.title,
        emoji: inlineLessonForm.emoji || null,
      });
      setIsEditingLessonDetails(false);
      router.refresh();
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleInlineTogglePublish = async () => {
    if (!selectedLesson) return;
    const action = selectedLesson.is_published ? unpublishLesson : publishLesson;
    const result = await action(selectedLesson.id);
    if (!result.success) {
      alert(result.error);
    } else {
      setSelectedLesson({
        ...selectedLesson,
        is_published: !selectedLesson.is_published,
      });
      router.refresh();
    }
  };

  const handleInlineClone = async () => {
    if (!selectedLesson) return;
    const confirmed = window.confirm(
      `Clone "${selectedLesson.title}" with all its words and sentences?`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await cloneLesson(selectedLesson.id);
      if (!result.success) {
        alert(result.error);
      } else {
        goBackToLessons();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlineDelete = () => {
    if (!selectedLesson) return;
    setDeletingLesson(selectedLesson);
    setIsDeleteLessonModalOpen(true);
  };

  // Auto-select lesson from URL param
  useEffect(() => {
    if (initialLessonId && lessons.length > 0 && !selectedLesson) {
      const lesson = lessons.find((l) => l.id === initialLessonId);
      if (lesson) {
        selectLesson(lesson);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLessonId]);

  // ============================================================================
  // WORD HANDLERS
  // ============================================================================

  // Get course name for a given courseId
  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.name || "";
  };

  // Build lesson options for the Lessons tab (same shape as WordsBrowserClient)
  const allLessonOptions = lessons.map((l) => ({
    id: l.id,
    number: l.number,
    title: l.title,
    emoji: l.emoji,
    course_id: l.course_id,
  }));

  const openCreateWordModal = () => {
    setEditingWord(null);
    setEditingWordLessons([]);
    setIsWordModalOpen(true);
  };

  const openEditWordModal = async (word: Word) => {
    setEditingWord(word);
    setIsWordModalOpen(true);

    // Fetch which lessons this word belongs to
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("lesson_words")
        .select("lesson_id, lessons(id, number, title, emoji, course_id)")
        .eq("word_id", word.id);

      if (data) {
        const wordLessons: WordLessonInfo[] = data.map((lw: any) => ({
          id: lw.lessons.id,
          number: lw.lessons.number,
          title: lw.lessons.title,
          emoji: lw.lessons.emoji,
          course_id: lw.lessons.course_id,
        }));
        setEditingWordLessons(wordLessons);
      }
    } catch {
      // Fallback: at minimum we know the word is in the selected lesson
      if (selectedLesson) {
        setEditingWordLessons([{
          id: selectedLesson.id,
          number: selectedLesson.number,
          title: selectedLesson.title,
          emoji: selectedLesson.emoji,
          course_id: selectedLesson.course_id,
        }]);
      }
    }
  };

  const openRemoveWordModal = (word: Word) => {
    setRemovingWord(word);
    setIsRemoveWordModalOpen(true);
  };

  const handleWordModalSuccess = async () => {
    setIsWordModalOpen(false);
    setEditingWord(null);
    setEditingWordLessons([]);
    // Refresh words list
    if (selectedLesson) {
      await selectLesson(selectedLesson);
    }
  };

  const handleWordModalClose = () => {
    setIsWordModalOpen(false);
    setEditingWord(null);
    setEditingWordLessons([]);
  };

  const handleRemoveWord = async () => {
    if (!removingWord || !selectedLesson) return;

    setIsLoading(true);
    try {
      const result = await removeWordFromLesson(removingWord.id, selectedLesson.id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsRemoveWordModalOpen(false);
      setRemovingWord(null);
      await selectLesson(selectedLesson);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderWords = async (newIds: string[]) => {
    if (!selectedLesson) return;
    const previous = words;
    setWords(reorderById(previous, newIds));
    const result = await reorderWords(selectedLesson.id, newIds);
    if (!result.success) {
      setWords(previous);
      alert(result.error || "Failed to reorder words");
    }
  };

  const courseOptions = (filterLanguageId ? filteredCourses : courses).map(
    (c) => ({
      value: c.id,
      label: c.name,
    })
  );

  // ============================================================================
  // RENDER - Words View
  // ============================================================================

  if (viewMode === "words" && selectedLesson) {
    return (
      <div>
        {/* Breadcrumb */}
        <button
          onClick={goBackToLessons}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          {fromCourse ? fromCourse.name : "All Lessons"}
        </button>

        {/* Lesson Details Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditingLessonDetails ? (
                /* Editing Mode */
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Number</label>
                      <input
                        type="number"
                        value={inlineLessonForm.number}
                        onChange={(e) => setInlineLessonForm({ ...inlineLessonForm, number: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        min={1}
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Emoji</label>
                      <input
                        type="text"
                        value={inlineLessonForm.emoji}
                        onChange={(e) => setInlineLessonForm({ ...inlineLessonForm, emoji: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="&#128075;"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={inlineLessonForm.title}
                        onChange={(e) => setInlineLessonForm({ ...inlineLessonForm, title: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Lesson title"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveInlineLessonDetails} disabled={isSavingLesson}>
                        {isSavingLesson ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditingLessonDetails} disabled={isSavingLesson}>
                        Cancel
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleInlineDelete}
                      disabled={isSavingLesson}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete Lesson
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                      {selectedLesson.emoji && <span>{selectedLesson.emoji}</span>}
                      {selectedLesson.title}
                    </h1>
                    <button
                      onClick={startEditingLessonDetails}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit lesson details"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Lesson ID: {selectedLesson.number}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      {getFlagFromCode(selectedLesson.course?.language?.code)}
                      <strong>Course:</strong> {selectedLesson.course?.name || "Not assigned"}
                      {selectedLesson.course && (() => {
                        const pos = filteredLessons.findIndex((l) => l.id === selectedLesson.id) + 1;
                        return pos > 0 ? (
                          <span className="text-gray-500"> · Lesson {pos}</span>
                        ) : null;
                      })()}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>{words.length.toLocaleString("en-US")} word{words.length !== 1 ? "s" : ""}</span>
                    <span className="text-gray-300">|</span>
                    <AdminStatusBadge isPublished={selectedLesson.is_published ?? false} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isEditingLessonDetails && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInlineTogglePublish}
                  disabled={isLoading}
                >
                  {selectedLesson.is_published ? (
                    <>
                      <EyeOff className="mr-1 h-4 w-4" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-4 w-4" />
                      Publish
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInlineClone}
                  disabled={isLoading}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Clone
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Words Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Words</h2>
          <Button onClick={openCreateWordModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Word
          </Button>
        </div>

        {/* Words Table */}
        <div className="rounded-xl bg-white shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-20 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  English
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {selectedLesson.course?.language?.name || "Foreign"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Media
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone-hover">
              {isLoadingWords ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading words...
                  </td>
                </tr>
              ) : words.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No words yet. Add your first word to this lesson.
                  </td>
                </tr>
              ) : (
                <SortableList
                  ids={words.map((w) => w.id)}
                  onReorder={handleReorderWords}
                >
                  {words.map((word, index) => (
                    <SortableRow key={word.id} id={word.id}>
                      {({ setNodeRef, style, dragHandleProps, isDragging }) => (
                        <tr
                          ref={setNodeRef as (node: HTMLTableRowElement | null) => void}
                          style={style}
                          onClick={() => openEditWordModal(word)}
                          className={`cursor-pointer ${isDragging ? "bg-white shadow-lg" : "hover:bg-gray-50"}`}
                        >
                          <td className="whitespace-nowrap px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <DragHandle {...dragHandleProps} />
                              <span className="w-6 text-center text-sm text-gray-500">{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {word.english}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{word.headword}</td>
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
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRemoveWordModal(word);
                              }}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove from lesson"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )}
                    </SortableRow>
                  ))}
                </SortableList>
              )}
            </tbody>
          </table>
        </div>

        {/* Shared Word Create/Edit Modal */}
        <AdminWordEditModal
          isOpen={isWordModalOpen}
          onClose={handleWordModalClose}
          editingWord={editingWord}
          lessonId={selectedLesson.id}
          languageName={selectedLesson.course?.language?.name || undefined}
          onSuccess={handleWordModalSuccess}
          lessons={allLessonOptions}
          getCourseName={getCourseName}
          wordLessons={editingWordLessons}
        />

        {/* Remove Word from Lesson Confirmation Modal */}
        <ConfirmModal
          isOpen={isRemoveWordModalOpen}
          onClose={() => {
            setIsRemoveWordModalOpen(false);
            setRemovingWord(null);
          }}
          onConfirm={handleRemoveWord}
          title="Remove Word from Lesson"
          message={`Remove "${removingWord?.headword}" (${removingWord?.english}) from this lesson? The word will still exist in the database.`}
          confirmLabel="Remove"
          confirmVariant="destructive"
          isLoading={isLoading}
        />

        {/* Delete Lesson Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteLessonModalOpen}
          onClose={() => {
            setIsDeleteLessonModalOpen(false);
            setDeletingLesson(null);
          }}
          onConfirm={handleDeleteLesson}
          title="Delete Lesson"
          message={`Are you sure you want to delete "Lesson #${deletingLesson?.number}: ${deletingLesson?.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          isLoading={isLoading}
        />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Lessons List View
  // ============================================================================

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lessons</h1>
          <p className="mt-1 text-gray-600">Manage lessons for each course.</p>
        </div>
        <Button onClick={openCreateLessonModal} disabled={courses.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lesson
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
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
      </div>

      {/* Lessons Table */}
      <div className="rounded-xl bg-white shadow-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("number")}
              >
                #
                <SortIndicator field="number" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                onClick={() => handleSort("title")}
              >
                Lesson
                <SortIndicator field="title" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Words
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone-hover">
            {filteredLessons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {courses.length === 0
                    ? "Add a course first before creating lessons."
                    : "No lessons yet. Add your first lesson to get started."}
                </td>
              </tr>
            ) : (
              filteredLessons.map((lesson) => (
                <tr
                  key={lesson.id}
                  onClick={() => selectLesson(lesson)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {lesson.number}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {lesson.emoji && (
                        <span className="text-xl">{lesson.emoji}</span>
                      )}
                      <span className="font-medium text-gray-900">
                        {lesson.title}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {getFlagFromCode(lesson.course?.language?.code)} {lesson.course?.name}
                    {lesson.course && (
                      <span className="text-gray-500"> · Lesson #{lesson.number}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {lesson.word_count ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <AdminStatusBadge isPublished={lesson.is_published ?? false} />
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

      {/* Create/Edit Lesson Modal */}
      <AdminModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          resetLessonForm();
        }}
        title="Add Lesson"
        description="Add a new lesson to a course."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsLessonModalOpen(false);
                resetLessonForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleLessonSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : "Add Lesson"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AdminFormField
            label="Course"
            name="course_id"
            required
            error={lessonErrors.course_id}
          >
            <AdminSelect
              id="course_id"
              name="course_id"
              value={lessonFormData.course_id}
              onChange={(e) => handleFormCourseChange(e.target.value)}
              options={courseOptions}
              placeholder="Select a course"
              error={!!lessonErrors.course_id}
            />
          </AdminFormField>

          <div className="grid grid-cols-2 gap-4">
            <AdminFormField
              label="Lesson Number"
              name="number"
              required
              error={lessonErrors.number}
            >
              <AdminInput
                id="number"
                name="number"
                type="number"
                min={1}
                value={lessonFormData.number}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    number: parseInt(e.target.value) || 1,
                  })
                }
                error={!!lessonErrors.number}
              />
            </AdminFormField>

            <AdminFormField label="Emoji" name="emoji">
              <AdminInput
                id="emoji"
                name="emoji"
                value={lessonFormData.emoji}
                onChange={(e) =>
                  setLessonFormData({ ...lessonFormData, emoji: e.target.value })
                }
                placeholder="e.g., &#128075;"
              />
            </AdminFormField>
          </div>

          <AdminFormField
            label="Title"
            name="title"
            required
            error={lessonErrors.title}
          >
            <AdminInput
              id="title"
              name="title"
              value={lessonFormData.title}
              onChange={(e) =>
                setLessonFormData({ ...lessonFormData, title: e.target.value })
              }
              placeholder="e.g., Greetings"
              error={!!lessonErrors.title}
            />
          </AdminFormField>
        </div>
      </AdminModal>

      {/* Delete Lesson Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteLessonModalOpen}
        onClose={() => {
          setIsDeleteLessonModalOpen(false);
          setDeletingLesson(null);
        }}
        onConfirm={handleDeleteLesson}
        title="Delete Lesson"
        message={`Are you sure you want to delete "Lesson #${deletingLesson?.number}: ${deletingLesson?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />
    </div>
  );
}
