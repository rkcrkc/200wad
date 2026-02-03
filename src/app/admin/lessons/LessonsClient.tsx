"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, EyeOff, Copy, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminSelect,
  AdminStatusBadge,
} from "@/components/admin";
import {
  createLesson,
  updateLesson,
  deleteLesson,
  publishLesson,
  unpublishLesson,
  cloneLesson,
} from "@/lib/mutations/admin/lessons";
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

interface LessonsClientProps {
  languages: Language[];
  courses: Course[];
  lessons: Lesson[];
}

interface FormData {
  course_id: string;
  number: number;
  title: string;
  emoji: string;
}

interface FormErrors {
  course_id?: string;
  number?: string;
  title?: string;
}

export function LessonsClient({
  languages,
  courses,
  lessons,
}: LessonsClientProps) {
  const router = useRouter();
  const [filterLanguageId, setFilterLanguageId] = useState<string>("");
  const [filterCourseId, setFilterCourseId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    course_id: "",
    number: 1,
    title: "",
    emoji: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Filter courses by language
  const filteredCourses = useMemo(() => {
    if (!filterLanguageId) return courses;
    return courses.filter((c) => c.language_id === filterLanguageId);
  }, [courses, filterLanguageId]);

  // Filter lessons by language and course
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
    return result;
  }, [lessons, filterLanguageId, filterCourseId]);

  // Get next lesson number for selected course
  const getNextNumber = (courseId: string) => {
    const courseLessons = lessons.filter((l) => l.course_id === courseId);
    const maxNumber = Math.max(0, ...courseLessons.map((l) => l.number));
    return maxNumber + 1;
  };

  const resetForm = () => {
    const defaultCourseId = filterCourseId || "";
    setFormData({
      course_id: defaultCourseId,
      number: defaultCourseId ? getNextNumber(defaultCourseId) : 1,
      title: "",
      emoji: "",
    });
    setErrors({});
    setEditingLesson(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      course_id: lesson.course_id || "",
      number: lesson.number,
      title: lesson.title,
      emoji: lesson.emoji || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (lesson: Lesson) => {
    setDeletingLesson(lesson);
    setIsDeleteModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.course_id) {
      newErrors.course_id = "Course is required";
    }
    if (!formData.number || formData.number < 1) {
      newErrors.number = "Lesson number must be at least 1";
    }
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (editingLesson) {
        const result = await updateLesson(editingLesson.id, {
          number: formData.number,
          title: formData.title,
          emoji: formData.emoji || null,
        });
        if (!result.success) {
          setErrors({ title: result.error || "Failed to update lesson" });
          return;
        }
      } else {
        const result = await createLesson({
          course_id: formData.course_id,
          number: formData.number,
          title: formData.title,
          emoji: formData.emoji || null,
        });
        if (!result.success) {
          setErrors({ title: result.error || "Failed to create lesson" });
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
    if (!deletingLesson) return;

    setIsLoading(true);

    try {
      const result = await deleteLesson(deletingLesson.id);
      if (!result.success) {
        alert(result.error);
        return;
      }

      setIsDeleteModalOpen(false);
      setDeletingLesson(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (lesson: Lesson) => {
    const action = lesson.is_published ? unpublishLesson : publishLesson;
    const result = await action(lesson.id);
    if (!result.success) {
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  const handleClone = async (lesson: Lesson) => {
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

  // Handle course selection in form - update next number
  const handleFormCourseChange = (courseId: string) => {
    setFormData({
      ...formData,
      course_id: courseId,
      number: courseId ? getNextNumber(courseId) : 1,
    });
  };

  const courseOptions = (filterLanguageId ? filteredCourses : courses).map(
    (c) => ({
      value: c.id,
      label: c.name,
    })
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lessons</h1>
          <p className="mt-1 text-gray-600">Manage lessons for each course.</p>
        </div>
        <Button onClick={openCreateModal} disabled={courses.length === 0}>
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

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Lesson
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
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
                <tr key={lesson.id} className="hover:bg-gray-50">
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
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {lesson.word_count ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <AdminStatusBadge isPublished={lesson.is_published ?? false} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/words/${lesson.id}`}
                        className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Manage Words"
                      >
                        <Type className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleClone(lesson)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Clone Lesson"
                        disabled={isLoading}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePublish(lesson)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={lesson.is_published ? "Unpublish" : "Publish"}
                      >
                        {lesson.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(lesson)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(lesson)}
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

      {/* Create/Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingLesson ? "Edit Lesson" : "Add Lesson"}
        description={
          editingLesson
            ? "Update the lesson details."
            : "Add a new lesson to a course."
        }
        footer={
          <>
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
              {isLoading
                ? "Saving..."
                : editingLesson
                ? "Save Changes"
                : "Add Lesson"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!editingLesson && (
            <AdminFormField
              label="Course"
              name="course_id"
              required
              error={errors.course_id}
            >
              <AdminSelect
                id="course_id"
                name="course_id"
                value={formData.course_id}
                onChange={(e) => handleFormCourseChange(e.target.value)}
                options={courseOptions}
                placeholder="Select a course"
                error={!!errors.course_id}
              />
            </AdminFormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <AdminFormField
              label="Lesson Number"
              name="number"
              required
              error={errors.number}
            >
              <AdminInput
                id="number"
                name="number"
                type="number"
                min={1}
                value={formData.number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    number: parseInt(e.target.value) || 1,
                  })
                }
                error={!!errors.number}
              />
            </AdminFormField>

            <AdminFormField label="Emoji" name="emoji">
              <AdminInput
                id="emoji"
                name="emoji"
                value={formData.emoji}
                onChange={(e) =>
                  setFormData({ ...formData, emoji: e.target.value })
                }
                placeholder="e.g., 👋"
              />
            </AdminFormField>
          </div>

          <AdminFormField
            label="Title"
            name="title"
            required
            error={errors.title}
          >
            <AdminInput
              id="title"
              name="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Greetings"
              error={!!errors.title}
            />
          </AdminFormField>
        </div>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingLesson(null);
        }}
        onConfirm={handleDelete}
        title="Delete Lesson"
        message={`Are you sure you want to delete "Lesson #${deletingLesson?.number}: ${deletingLesson?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />
    </div>
  );
}
