"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Eye, EyeOff, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
  AdminStatusBadge,
} from "@/components/admin";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  reorderCourses,
} from "@/lib/mutations/admin/courses";
import {
  publishLesson,
  unpublishLesson,
  reorderLessons,
  removeLessonFromCourse,
  setAllLessonsPublished,
} from "@/lib/mutations/admin/lessons";
import { Switch } from "@/components/ui/switch";
import { getFlagFromCode } from "@/lib/utils/flags";

interface Language {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  language_id: string | null;
  name: string;
  description: string | null;
  level: string | null;
  cefr_range: string | null;
  free_lessons: number | null;
  price_cents: number | null;
  total_lessons: number | null;
  word_count: number | null;
  sort_order: number | null;
  is_published: boolean | null;
  language: Language | null;
  lessonCount: number;
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
}

interface CoursesClientProps {
  languages: Language[];
  courses: Course[];
  lessons: Lesson[];
  initialCourseId?: string;
}

interface FormData {
  language_id: string;
  name: string;
  description: string;
  level: string;
  cefr_range: string;
  free_lessons: number;
  price_cents: number;
}

interface FormErrors {
  language_id?: string;
  name?: string;
}

interface InlineCourseForm {
  name: string;
  description: string;
  level: string;
  cefr_range: string;
}

export function CoursesClient({ languages, courses, lessons, initialCourseId }: CoursesClientProps) {
  const router = useRouter();

  // View mode state
  const [viewMode, setViewMode] = useState<"list" | "lessons">("list");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // List view state
  const [filterLanguageId, setFilterLanguageId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    language_id: "",
    name: "",
    description: "",
    level: "",
    cefr_range: "",
    free_lessons: 10,
    price_cents: 5000,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Inline editing state for lessons view
  const [isEditingCourseDetails, setIsEditingCourseDetails] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [inlineCourseForm, setInlineCourseForm] = useState<InlineCourseForm>({
    name: "",
    description: "",
    level: "",
    cefr_range: "",
  });

  // Lesson publish toggle state
  const [togglingLessonId, setTogglingLessonId] = useState<string | null>(null);

  // Lesson remove state
  const [isRemoveLessonModalOpen, setIsRemoveLessonModalOpen] = useState(false);
  const [removingLesson, setRemovingLesson] = useState<Lesson | null>(null);

  // Course publish toggle state
  const [isPublishCourseModalOpen, setIsPublishCourseModalOpen] = useState(false);
  const [courseToTogglePublish, setCourseToTogglePublish] = useState<Course | null>(null);

  // Handle lesson publish toggle
  const handleToggleLessonPublish = async (lesson: Lesson) => {
    setTogglingLessonId(lesson.id);
    const action = lesson.is_published ? unpublishLesson : publishLesson;
    const result = await action(lesson.id);
    if (!result.success) {
      alert(result.error);
    } else {
      router.refresh();
    }
    setTogglingLessonId(null);
  };

  // Handle lesson remove from course
  const handleRemoveLesson = async () => {
    if (!removingLesson) return;
    setIsLoading(true);
    try {
      const result = await removeLessonFromCourse(removingLesson.id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsRemoveLessonModalOpen(false);
      setRemovingLesson(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle master publish toggle for all lessons
  const handleToggleAllLessonsPublish = async (publish: boolean) => {
    if (!selectedCourse) return;
    setIsLoading(true);
    try {
      const result = await setAllLessonsPublished(selectedCourse.id, publish);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Filter courses by language
  const filteredCourses = useMemo(() => {
    if (!filterLanguageId) return courses;
    return courses.filter((c) => c.language_id === filterLanguageId);
  }, [courses, filterLanguageId]);

  // Handle course reordering
  const handleMoveCourse = async (courseId: string, direction: "up" | "down") => {
    if (!filterLanguageId) return; // Only allow reordering when filtered by language

    const currentIndex = filteredCourses.findIndex((c) => c.id === courseId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= filteredCourses.length) return;

    // Create new order by swapping
    const newOrder = [...filteredCourses];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    // Persist the change
    const result = await reorderCourses(filterLanguageId, newOrder.map((c) => c.id));
    if (!result.success) {
      alert(result.error || "Failed to reorder courses");
    } else {
      router.refresh();
    }
  };

  // Filter and sort lessons for selected course
  const courseLessons = useMemo(() => {
    if (!selectedCourse) return [];
    return lessons
      .filter((l) => l.course_id === selectedCourse.id)
      .sort((a, b) => (a.sort_order ?? a.number) - (b.sort_order ?? b.number));
  }, [lessons, selectedCourse]);

  // Handle lesson reordering
  const handleMoveLesson = async (lessonId: string, direction: "up" | "down") => {
    if (!selectedCourse) return;

    const currentIndex = courseLessons.findIndex((l) => l.id === lessonId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= courseLessons.length) return;

    // Create new order by swapping
    const newOrder = [...courseLessons];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    // Persist the change
    const result = await reorderLessons(selectedCourse.id, newOrder.map((l) => l.id));
    if (!result.success) {
      alert(result.error || "Failed to reorder lessons");
    } else {
      router.refresh();
    }
  };

  // Initialize from URL param
  useEffect(() => {
    if (initialCourseId && courses.length > 0 && !selectedCourse) {
      const course = courses.find((c) => c.id === initialCourseId);
      if (course) {
        selectCourse(course);
      }
    }
  }, [initialCourseId]);

  const resetForm = () => {
    setFormData({
      language_id: filterLanguageId || "",
      name: "",
      description: "",
      level: "",
      cefr_range: "",
      free_lessons: 10,
      price_cents: 5000,
    });
    setErrors({});
    setEditingCourse(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setViewMode("lessons");
    setInlineCourseForm({
      name: course.name,
      description: course.description || "",
      level: course.level || "",
      cefr_range: course.cefr_range || "",
    });
  };

  const goBackToCourses = () => {
    setViewMode("list");
    setSelectedCourse(null);
    setIsEditingCourseDetails(false);
  };

  const startEditingCourseDetails = () => {
    if (selectedCourse) {
      setInlineCourseForm({
        name: selectedCourse.name,
        description: selectedCourse.description || "",
        level: selectedCourse.level || "",
        cefr_range: selectedCourse.cefr_range || "",
      });
      setIsEditingCourseDetails(true);
    }
  };

  const cancelEditingCourseDetails = () => {
    setIsEditingCourseDetails(false);
    if (selectedCourse) {
      setInlineCourseForm({
        name: selectedCourse.name,
        description: selectedCourse.description || "",
        level: selectedCourse.level || "",
        cefr_range: selectedCourse.cefr_range || "",
      });
    }
  };

  const saveInlineCourseDetails = async () => {
    if (!selectedCourse) return;

    setIsSavingCourse(true);
    try {
      const result = await updateCourse(selectedCourse.id, {
        name: inlineCourseForm.name,
        description: inlineCourseForm.description || null,
        level: (inlineCourseForm.level as "beginner" | "intermediate" | "advanced") || null,
        cefr_range: inlineCourseForm.cefr_range || null,
      });

      if (result.success) {
        setSelectedCourse({
          ...selectedCourse,
          name: inlineCourseForm.name,
          description: inlineCourseForm.description || null,
          level: inlineCourseForm.level || null,
          cefr_range: inlineCourseForm.cefr_range || null,
        });
        setIsEditingCourseDetails(false);
        router.refresh();
      }
    } finally {
      setIsSavingCourse(false);
    }
  };

  const openPublishCourseModal = (course: Course) => {
    setCourseToTogglePublish(course);
    setIsPublishCourseModalOpen(true);
  };

  const handleConfirmTogglePublish = async () => {
    if (!courseToTogglePublish) return;
    setIsLoading(true);
    try {
      const action = courseToTogglePublish.is_published ? unpublishCourse : publishCourse;
      const result = await action(courseToTogglePublish.id);
      if (result.success) {
        // Update selectedCourse if it's the one being toggled
        if (selectedCourse && selectedCourse.id === courseToTogglePublish.id) {
          setSelectedCourse({
            ...selectedCourse,
            is_published: !courseToTogglePublish.is_published,
          });
        }
        setIsPublishCourseModalOpen(false);
        setCourseToTogglePublish(null);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInlineDelete = () => {
    if (!selectedCourse) return;
    setDeletingCourse(selectedCourse);
    setIsDeleteModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.language_id) {
      newErrors.language_id = "Language is required";
    }
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (editingCourse) {
        const result = await updateCourse(editingCourse.id, {
          name: formData.name,
          description: formData.description || null,
          level: (formData.level as "beginner" | "intermediate" | "advanced") || null,
          cefr_range: formData.cefr_range || null,
          free_lessons: formData.free_lessons,
          price_cents: formData.price_cents,
        });
        if (!result.success) {
          setErrors({ name: result.error || "Failed to update course" });
          return;
        }
      } else {
        const result = await createCourse({
          language_id: formData.language_id,
          name: formData.name,
          description: formData.description || null,
          level: (formData.level as "beginner" | "intermediate" | "advanced") || null,
          cefr_range: formData.cefr_range || null,
          free_lessons: formData.free_lessons,
          price_cents: formData.price_cents,
        });
        if (!result.success) {
          setErrors({ name: result.error || "Failed to create course" });
          return;
        }
      }

      setIsModalOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;

    setIsLoading(true);

    try {
      const result = await deleteCourse(deletingCourse.id);
      if (!result.success) {
        alert(result.error);
        return;
      }

      setIsDeleteModalOpen(false);
      setDeletingCourse(null);

      // If we deleted the selected course, go back to list
      if (selectedCourse && selectedCourse.id === deletingCourse.id) {
        goBackToCourses();
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (course: Course) => {
    const action = course.is_published ? unpublishCourse : publishCourse;
    const result = await action(course.id);
    if (!result.success) {
      alert(result.error);
    } else {
      if (editingCourse && editingCourse.id === course.id) {
        setEditingCourse({ ...editingCourse, is_published: !course.is_published });
      }
      router.refresh();
    }
  };

  const levelOptions = [
    { value: "", label: "No level" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ];

  const languageOptions = languages.map((l) => ({
    value: l.id,
    label: `${getFlagFromCode(l.code)} ${l.name}`,
  }));

  // ============================================================================
  // RENDER - Lessons View (Course Detail)
  // ============================================================================

  if (viewMode === "lessons" && selectedCourse) {
    const totalWords = courseLessons.reduce((sum, l) => sum + (l.word_count || 0), 0);

    return (
      <div>
        {/* Breadcrumb */}
        <button
          onClick={goBackToCourses}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          All Courses
        </button>

        {/* Course Details Card */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditingCourseDetails ? (
                /* Editing Mode */
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={inlineCourseForm.name}
                        onChange={(e) => setInlineCourseForm({ ...inlineCourseForm, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Course name"
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Level</label>
                      <select
                        value={inlineCourseForm.level}
                        onChange={(e) => setInlineCourseForm({ ...inlineCourseForm, level: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {levelOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-500 mb-1">CEFR</label>
                      <input
                        type="text"
                        value={inlineCourseForm.cefr_range}
                        onChange={(e) => setInlineCourseForm({ ...inlineCourseForm, cefr_range: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="A1-A2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <textarea
                      value={inlineCourseForm.description}
                      onChange={(e) => setInlineCourseForm({ ...inlineCourseForm, description: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Course description..."
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveInlineCourseDetails} disabled={isSavingCourse}>
                        {isSavingCourse ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditingCourseDetails} disabled={isSavingCourse}>
                        Cancel
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleInlineDelete}
                      disabled={isSavingCourse}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete Course
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                      {selectedCourse.name}
                    </h1>
                    <button
                      onClick={startEditingCourseDetails}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit course details"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  {selectedCourse.description && (
                    <p className="mt-1 text-sm text-gray-600">{selectedCourse.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      {getFlagFromCode(selectedCourse.language?.code)}
                      <strong>Language:</strong> {selectedCourse.language?.name || "Not assigned"}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                      <strong>Level:</strong> {selectedCourse.level ? selectedCourse.level.charAt(0).toUpperCase() + selectedCourse.level.slice(1) : "-"}
                      {selectedCourse.cefr_range && ` (${selectedCourse.cefr_range})`}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>{courseLessons.length} lesson{courseLessons.length !== 1 ? "s" : ""}</span>
                    <span className="text-gray-300">|</span>
                    <span>{totalWords} word{totalWords !== 1 ? "s" : ""}</span>
                    <span className="text-gray-300">|</span>
                    <AdminStatusBadge isPublished={selectedCourse.is_published ?? false} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isEditingCourseDetails && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPublishCourseModal(selectedCourse)}
                  disabled={isLoading}
                >
                  {selectedCourse.is_published ? (
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
              </div>
            )}
          </div>
        </div>

        {/* Lessons Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-gray-900">Lessons</h2>
            {courseLessons.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Publish all</span>
                <Switch
                  checked={courseLessons.every((l) => l.is_published)}
                  onCheckedChange={(checked) => handleToggleAllLessonsPublish(checked)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
          <Button asChild>
            <Link href={`/admin/lessons?course=${selectedCourse.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lesson
            </Link>
          </Button>
        </div>

        {/* Lessons Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-20 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order
                </th>
                <th className="w-16 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Lesson
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Words
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Published
                </th>
                <th className="w-16 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  <span className="sr-only">Delete</span>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courseLessons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No lessons yet. Add your first lesson to this course.
                  </td>
                </tr>
              ) : (
                courseLessons.map((lesson, index) => (
                  <tr
                    key={lesson.id}
                    onClick={() => router.push(`/admin/lessons?lesson=${lesson.id}&fromCourse=${selectedCourse.id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <span className="w-6 text-center text-sm text-gray-500">{index + 1}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLesson(lesson.id, "up");
                            }}
                            disabled={index === 0}
                            className={`rounded p-0.5 ${
                              index === 0
                                ? "text-gray-200 cursor-not-allowed"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            }`}
                            title="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLesson(lesson.id, "down");
                            }}
                            disabled={index === courseLessons.length - 1}
                            className={`rounded p-0.5 ${
                              index === courseLessons.length - 1
                                ? "text-gray-200 cursor-not-allowed"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            }`}
                            title="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                      {lesson.number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {lesson.emoji && <span>{lesson.emoji}</span>}
                        <span className="font-medium text-gray-900">{lesson.title}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {lesson.word_count || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={lesson.is_published ?? false}
                        onCheckedChange={() => handleToggleLessonPublish(lesson)}
                        disabled={togglingLessonId === lesson.id}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setRemovingLesson(lesson);
                          setIsRemoveLessonModalOpen(true);
                        }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove lesson"
                      >
                        <X className="h-4 w-4" />
                      </button>
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

        {/* Delete Course Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingCourse(null);
          }}
          onConfirm={handleDelete}
          title="Delete Course"
          message={`Are you sure you want to delete "${deletingCourse?.name}"? This will also delete all lessons in this course. This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          isLoading={isLoading}
        />

        {/* Remove Lesson Confirmation Modal */}
        <ConfirmModal
          isOpen={isRemoveLessonModalOpen}
          onClose={() => {
            setIsRemoveLessonModalOpen(false);
            setRemovingLesson(null);
          }}
          onConfirm={handleRemoveLesson}
          title="Remove Lesson"
          message={`Remove "Lesson #${removingLesson?.number}: ${removingLesson?.title}" from this course? The lesson will still exist and can be added to another course.`}
          confirmLabel="Remove"
          confirmVariant="destructive"
          isLoading={isLoading}
        />

        {/* Publish/Unpublish Course Confirmation Modal */}
        <ConfirmModal
          isOpen={isPublishCourseModalOpen}
          onClose={() => {
            setIsPublishCourseModalOpen(false);
            setCourseToTogglePublish(null);
          }}
          onConfirm={handleConfirmTogglePublish}
          title={courseToTogglePublish?.is_published ? "Unpublish Course" : "Publish Course"}
          message={
            courseToTogglePublish?.is_published
              ? `Are you sure you want to unpublish "${courseToTogglePublish?.name}"? It will no longer be visible to users.`
              : `Are you sure you want to publish "${courseToTogglePublish?.name}"? It will become visible to users.`
          }
          confirmLabel={courseToTogglePublish?.is_published ? "Unpublish" : "Publish"}
          confirmVariant={courseToTogglePublish?.is_published ? "destructive" : "default"}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // ============================================================================
  // RENDER - List View
  // ============================================================================

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="mt-1 text-gray-600">
            Manage courses for each language.
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={languages.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="mr-3 text-sm font-medium text-gray-700">
          Filter by language:
        </label>
        <select
          value={filterLanguageId}
          onChange={(e) => setFilterLanguageId(e.target.value)}
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

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {filterLanguageId && (
                <th className="w-20 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Lessons
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
          <tbody className="divide-y divide-gray-200">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={filterLanguageId ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                  {languages.length === 0
                    ? "Add a language first before creating courses."
                    : "No courses yet. Add your first course to get started."}
                </td>
              </tr>
            ) : (
              filteredCourses.map((course, index) => (
                <tr
                  key={course.id}
                  onClick={() => selectCourse(course)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  {filterLanguageId && (
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className="w-6 text-center text-sm text-gray-500">{index + 1}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCourse(course.id, "up");
                            }}
                            disabled={index === 0}
                            className={`rounded p-0.5 ${
                              index === 0
                                ? "text-gray-200 cursor-not-allowed"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            }`}
                            title="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCourse(course.id, "down");
                            }}
                            disabled={index === filteredCourses.length - 1}
                            className={`rounded p-0.5 ${
                              index === filteredCourses.length - 1
                                ? "text-gray-200 cursor-not-allowed"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            }`}
                            title="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{course.name}</p>
                      {course.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {getFlagFromCode(course.language?.code)} {course.language?.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600 capitalize">
                    {course.level || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {course.lessonCount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {course.word_count}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <AdminStatusBadge isPublished={course.is_published ?? false} />
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

      {/* Create Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Add Course"
        description="Add a new course to a language."
        size="lg"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : "Add Course"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <AdminFormField
            label="Language"
            name="language_id"
            required
            error={errors.language_id}
          >
            <AdminSelect
              id="language_id"
              name="language_id"
              value={formData.language_id}
              onChange={(e) =>
                setFormData({ ...formData, language_id: e.target.value })
              }
              options={languageOptions}
              placeholder="Select a language"
              error={!!errors.language_id}
            />
          </AdminFormField>

          <AdminFormField
            label="Name"
            name="name"
            required
            error={errors.name}
          >
            <AdminInput
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Learning Italian for Beginners"
              error={!!errors.name}
            />
          </AdminFormField>

          <AdminFormField label="Description" name="description">
            <AdminTextarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe this course..."
            />
          </AdminFormField>

          <div className="grid grid-cols-2 gap-4">
            <AdminFormField label="Level" name="level">
              <AdminSelect
                id="level"
                name="level"
                value={formData.level}
                onChange={(e) =>
                  setFormData({ ...formData, level: e.target.value })
                }
                options={levelOptions}
              />
            </AdminFormField>

            <AdminFormField label="CEFR Range" name="cefr_range">
              <AdminInput
                id="cefr_range"
                name="cefr_range"
                value={formData.cefr_range}
                onChange={(e) =>
                  setFormData({ ...formData, cefr_range: e.target.value })
                }
                placeholder="e.g., A1-A2"
              />
            </AdminFormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AdminFormField label="Free Lessons" name="free_lessons">
              <AdminInput
                id="free_lessons"
                name="free_lessons"
                type="number"
                min={0}
                value={formData.free_lessons}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    free_lessons: parseInt(e.target.value) || 0,
                  })
                }
              />
            </AdminFormField>

            <AdminFormField label="Price (cents)" name="price_cents">
              <AdminInput
                id="price_cents"
                name="price_cents"
                type="number"
                min={0}
                value={formData.price_cents}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_cents: parseInt(e.target.value) || 0,
                  })
                }
              />
            </AdminFormField>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingCourse(null);
        }}
        onConfirm={handleDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${deletingCourse?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />
    </div>
  );
}
