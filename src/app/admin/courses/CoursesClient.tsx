"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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
} from "@/lib/mutations/admin/courses";

interface Language {
  id: string;
  name: string;
  flag: string;
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

interface CoursesClientProps {
  languages: Language[];
  courses: Course[];
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

export function CoursesClient({ languages, courses }: CoursesClientProps) {
  const router = useRouter();
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

  // Filter courses by language
  const filteredCourses = useMemo(() => {
    if (!filterLanguageId) return courses;
    return courses.filter((c) => c.language_id === filterLanguageId);
  }, [courses, filterLanguageId]);

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

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      language_id: course.language_id || "",
      name: course.name,
      description: course.description || "",
      level: course.level || "",
      cefr_range: course.cefr_range || "",
      free_lessons: course.free_lessons ?? 10,
      price_cents: course.price_cents ?? 5000,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (course: Course) => {
    setDeletingCourse(course);
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
    label: `${l.flag} ${l.name}`,
  }));

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
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {languages.length === 0
                    ? "Add a language first before creating courses."
                    : "No courses yet. Add your first course to get started."}
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
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
                    {course.language?.flag} {course.language?.name}
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTogglePublish(course)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={course.is_published ? "Unpublish" : "Publish"}
                      >
                        {course.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(course)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(course)}
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
        title={editingCourse ? "Edit Course" : "Add Course"}
        description={
          editingCourse
            ? "Update the course details."
            : "Add a new course to a language."
        }
        size="lg"
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
                : editingCourse
                ? "Save Changes"
                : "Add Course"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!editingCourse && (
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
          )}

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
