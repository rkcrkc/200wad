"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Eye, EyeOff, ChevronRight, ChevronLeft, Pencil, X, ChevronDown as ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
  AdminStatusBadge,
  SortableList,
  SortableRow,
  DragHandle,
  reorderById,
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
  createLanguage,
  updateLanguage,
  deleteLanguage,
  reorderLanguages,
} from "@/lib/mutations/admin/languages";
import {
  publishLesson,
  unpublishLesson,
  reorderLessons,
  removeLessonFromCourse,
  setAllLessonsPublished,
} from "@/lib/mutations/admin/lessons";
import { Switch } from "@/components/ui/switch";
import { getFlagFromCode } from "@/lib/utils/flags";
import type { LanguageGreetings } from "@/types/database";

interface CourseLanguage {
  id: string;
  name: string;
  code: string;
}

interface Language {
  id: string;
  name: string;
  native_name: string;
  code: string;
  sort_order: number | null;
  is_visible: boolean;
  greetings: LanguageGreetings | null;
  courseCount: number;
}

interface Course {
  id: string;
  language_id: string | null;
  name: string;
  description: string | null;
  level: string | null;
  cefr_range: string | null;
  free_lessons: number | null;
  price_override_cents: number | null;
  total_lessons: number | null;
  word_count: number | null;
  sort_order: number | null;
  is_published: boolean | null;
  language: CourseLanguage | null;
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
  price_override_cents: number;
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

interface LanguageFormData {
  name: string;
  native_name: string;
  code: string;
}

interface LanguageFormErrors {
  name?: string;
  native_name?: string;
  code?: string;
}

type LanguageTab = "published" | "unpublished" | "all";

const emptyGreetings: LanguageGreetings = {
  morning: { text: "", translation: "" },
  afternoon: { text: "", translation: "" },
  evening: { text: "", translation: "" },
};

export function CoursesClient({ languages, courses, lessons, initialCourseId }: CoursesClientProps) {
  const router = useRouter();

  // Local mirrors of server-provided lists so DnD reorders can be applied
  // optimistically before router.refresh() repopulates props.
  const [orderedCourses, setOrderedCourses] = useState<Course[]>(courses);
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>(lessons);
  const [orderedLanguages, setOrderedLanguages] = useState<Language[]>(languages);
  useEffect(() => {
    setOrderedCourses(courses);
  }, [courses]);
  useEffect(() => {
    setOrderedLessons(lessons);
  }, [lessons]);
  useEffect(() => {
    setOrderedLanguages(languages);
  }, [languages]);

  // View mode state
  const [viewMode, setViewMode] = useState<"list" | "lessons">("list");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // List view state
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());
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
    price_override_cents: 0,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Language tab filter
  const [languageTab, setLanguageTab] = useState<LanguageTab>("all");

  // Language create/edit modal state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [languageForm, setLanguageForm] = useState<LanguageFormData>({
    name: "",
    native_name: "",
    code: "",
  });
  const [languageErrors, setLanguageErrors] = useState<LanguageFormErrors>({});
  const [greetingsData, setGreetingsData] = useState<LanguageGreetings>(emptyGreetings);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  // Language delete + visibility-toggle modal state
  const [isDeleteLanguageModalOpen, setIsDeleteLanguageModalOpen] = useState(false);
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [togglingLanguage, setTogglingLanguage] = useState<Language | null>(null);

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

  // Right-click quick menu state (list view)
  const [mounted, setMounted] = useState(false);
  const [menuState, setMenuState] = useState<{ x: number; y: number; course: Course } | null>(null);

  // Quick "edit details" modal state (name + description)
  const [editDetailsCourse, setEditDetailsCourse] = useState<Course | null>(null);
  const [editDetailsForm, setEditDetailsForm] = useState<{ name: string; description: string }>({
    name: "",
    description: "",
  });
  const [isSavingEditDetails, setIsSavingEditDetails] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the quick menu on outside click, Escape, scroll, or resize.
  useEffect(() => {
    if (!menuState) return;
    const close = () => setMenuState(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuState(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuState]);

  const handleRowContextMenu = (e: React.MouseEvent, course: Course) => {
    e.preventDefault();
    // Clamp so the menu stays inside the viewport (menu ~200×80, 2 items).
    const menuW = 200;
    const menuH = 80;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setMenuState({ x, y, course });
  };

  const openEditDetailsModal = (course: Course) => {
    setEditDetailsCourse(course);
    setEditDetailsForm({ name: course.name, description: course.description || "" });
  };

  const handleSaveEditDetails = async () => {
    if (!editDetailsCourse) return;
    setIsSavingEditDetails(true);
    try {
      const name = editDetailsForm.name.trim();
      const description = editDetailsForm.description.trim();
      const result = await updateCourse(editDetailsCourse.id, {
        name,
        description: description || null,
      });
      if (!result.success) {
        alert(result.error || "Failed to update course");
        return;
      }
      // Reflect the change in the local mirror immediately.
      setOrderedCourses((prev) =>
        prev.map((c) =>
          c.id === editDetailsCourse.id
            ? { ...c, name, description: description || null }
            : c
        )
      );
      if (selectedCourse && selectedCourse.id === editDetailsCourse.id) {
        setSelectedCourse({ ...selectedCourse, name, description: description || null });
      }
      setEditDetailsCourse(null);
      router.refresh();
    } finally {
      setIsSavingEditDetails(false);
    }
  };

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

  // Group courses by language. Every language is shown (even with no
  // courses) so it can be managed here; the active tab filters by visibility.
  const coursesByLanguage = useMemo(() => {
    const grouped = new Map<string, { language: Language; courses: Course[] }>();

    // Add all languages in sort order (the query already orders by sort_order).
    orderedLanguages.forEach((lang) => {
      grouped.set(lang.id, { language: lang, courses: [] });
    });

    // Then add courses to their respective language groups
    orderedCourses.forEach((course) => {
      if (course.language_id && grouped.has(course.language_id)) {
        grouped.get(course.language_id)!.courses.push(course);
      }
    });

    // Sort courses within each group by sort_order
    grouped.forEach((group) => {
      group.courses.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    return Array.from(grouped.values()).filter(({ language }) => {
      if (languageTab === "published") return language.is_visible;
      if (languageTab === "unpublished") return !language.is_visible;
      return true;
    });
  }, [orderedCourses, orderedLanguages, languageTab]);

  // Reordering languages is only enabled on the "All" tab. With a visibility
  // filter active, newIds would omit hidden languages and reorderLanguages
  // (which reindexes exactly the ids it receives) would corrupt their order.
  const canReorderLanguages = languageTab === "all";

  // Initialize all languages as expanded on first load
  useEffect(() => {
    if (expandedLanguages.size === 0 && coursesByLanguage.length > 0) {
      setExpandedLanguages(new Set(coursesByLanguage.map((g) => g.language.id)));
    }
  }, [coursesByLanguage]);

  // Toggle language accordion
  const toggleLanguage = (languageId: string) => {
    setExpandedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(languageId)) {
        next.delete(languageId);
      } else {
        next.add(languageId);
      }
      return next;
    });
  };

  // Handle course reordering (drag-and-drop)
  const handleReorderCourses = async (languageId: string, newIds: string[]) => {
    const previous = orderedCourses;
    // Assign new sort_order values so the coursesByLanguage memo (which
    // re-sorts by sort_order) reflects the new order immediately.
    const idToNewOrder = new Map(newIds.map((id, i) => [id, i]));
    setOrderedCourses(
      orderedCourses.map((c) =>
        idToNewOrder.has(c.id)
          ? { ...c, sort_order: idToNewOrder.get(c.id)! }
          : c
      )
    );
    const result = await reorderCourses(languageId, newIds);
    if (!result.success) {
      setOrderedCourses(previous);
      alert(result.error || "Failed to reorder courses");
      return;
    }
    router.refresh();
  };

  // Handle language reordering (drag-and-drop). The language loop renders in
  // raw orderedLanguages array order, so reorder the array itself (not just
  // patch sort_order) via reorderById.
  const handleReorderLanguages = async (newIds: string[]) => {
    const previous = orderedLanguages;
    setOrderedLanguages(reorderById(orderedLanguages, newIds));
    const result = await reorderLanguages(newIds);
    if (!result.success) {
      setOrderedLanguages(previous);
      alert(result.error || "Failed to reorder languages");
      return;
    }
    router.refresh();
  };

  // Filter and sort lessons for selected course
  const courseLessons = useMemo(() => {
    if (!selectedCourse) return [];
    return orderedLessons
      .filter((l) => l.course_id === selectedCourse.id)
      .sort((a, b) => (a.sort_order ?? a.number) - (b.sort_order ?? b.number));
  }, [orderedLessons, selectedCourse]);

  // Handle lesson reordering (drag-and-drop)
  const handleReorderLessons = async (newIds: string[]) => {
    if (!selectedCourse) return;
    const previous = orderedLessons;
    const idToNewOrder = new Map(newIds.map((id, i) => [id, i]));
    setOrderedLessons(
      orderedLessons.map((l) =>
        idToNewOrder.has(l.id)
          ? { ...l, sort_order: idToNewOrder.get(l.id)! }
          : l
      )
    );
    const result = await reorderLessons(selectedCourse.id, newIds);
    if (!result.success) {
      setOrderedLessons(previous);
      alert(result.error || "Failed to reorder lessons");
      return;
    }
    router.refresh();
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
      language_id: "",
      name: "",
      description: "",
      level: "",
      cefr_range: "",
      free_lessons: 10,
      price_override_cents: 0,
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
          price_override_cents: formData.price_override_cents,
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
          price_override_cents: formData.price_override_cents,
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

  // ==========================================================================
  // Language management handlers
  // ==========================================================================

  const resetLanguageForm = () => {
    setLanguageForm({ name: "", native_name: "", code: "" });
    setGreetingsData(emptyGreetings);
    setLanguageErrors({});
    setEditingLanguage(null);
  };

  const openCreateLanguageModal = () => {
    resetLanguageForm();
    setIsLanguageModalOpen(true);
  };

  const openEditLanguageModal = (language: Language) => {
    setEditingLanguage(language);
    setLanguageForm({
      name: language.name,
      native_name: language.native_name,
      code: language.code,
    });
    setGreetingsData(language.greetings ?? emptyGreetings);
    setLanguageErrors({});
    setIsLanguageModalOpen(true);
  };

  const validateLanguageForm = (): boolean => {
    const newErrors: LanguageFormErrors = {};
    if (!languageForm.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!languageForm.native_name.trim()) {
      newErrors.native_name = "Native name is required";
    }
    if (!languageForm.code.trim()) {
      newErrors.code = "Language code is required";
    } else if (!/^[a-z]{2,3}$/.test(languageForm.code.toLowerCase())) {
      newErrors.code = "Code must be 2-3 lowercase letters (ISO 639-1)";
    }
    setLanguageErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLanguageSubmit = async () => {
    if (!validateLanguageForm()) return;

    setIsSavingLanguage(true);
    try {
      const hasGreetings =
        greetingsData.morning.text ||
        greetingsData.afternoon.text ||
        greetingsData.evening.text;
      const payload = hasGreetings
        ? { ...languageForm, greetings: greetingsData }
        : languageForm;

      if (editingLanguage) {
        const result = await updateLanguage(editingLanguage.id, payload);
        if (!result.success) {
          setLanguageErrors({ name: result.error || "Failed to update language" });
          return;
        }
      } else {
        const result = await createLanguage(payload);
        if (!result.success) {
          setLanguageErrors({ name: result.error || "Failed to create language" });
          return;
        }
      }

      setIsLanguageModalOpen(false);
      resetLanguageForm();
      router.refresh();
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const openDeleteLanguageModal = (language: Language) => {
    setDeletingLanguage(language);
    setIsDeleteLanguageModalOpen(true);
  };

  const handleDeleteLanguage = async () => {
    if (!deletingLanguage) return;
    setIsSavingLanguage(true);
    try {
      const result = await deleteLanguage(deletingLanguage.id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsDeleteLanguageModalOpen(false);
      // Also close the edit modal if the delete was triggered from within it.
      setIsLanguageModalOpen(false);
      setDeletingLanguage(null);
      resetLanguageForm();
      router.refresh();
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const openVisibilityModal = (language: Language) => {
    setTogglingLanguage(language);
    setIsVisibilityModalOpen(true);
  };

  const handleToggleVisibility = async () => {
    if (!togglingLanguage) return;
    setIsSavingLanguage(true);
    try {
      const result = await updateLanguage(togglingLanguage.id, {
        is_visible: !togglingLanguage.is_visible,
      });
      if (!result.success) {
        alert(result.error);
        return;
      }
      // Reflect immediately in the local mirror.
      setOrderedLanguages((prev) =>
        prev.map((l) =>
          l.id === togglingLanguage.id
            ? { ...l, is_visible: !togglingLanguage.is_visible }
            : l
        )
      );
      setIsVisibilityModalOpen(false);
      setTogglingLanguage(null);
      router.refresh();
    } finally {
      setIsSavingLanguage(false);
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
        <div className="mb-6 rounded-xl bg-white p-6 shadow-card">
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
                    <span>{courseLessons.length.toLocaleString("en-US")} lesson{courseLessons.length !== 1 ? "s" : ""}</span>
                    <span className="text-gray-300">|</span>
                    <span>{totalWords.toLocaleString("en-US")} word{totalWords !== 1 ? "s" : ""}</span>
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
        <div className="rounded-xl bg-white shadow-card">
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
            <tbody className="divide-y divide-bone-hover">
              {courseLessons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No lessons yet. Add your first lesson to this course.
                  </td>
                </tr>
              ) : (
                <SortableList
                  ids={courseLessons.map((l) => l.id)}
                  onReorder={handleReorderLessons}
                >
                  {courseLessons.map((lesson, index) => (
                    <SortableRow key={lesson.id} id={lesson.id}>
                      {({ setNodeRef, style, dragHandleProps, isDragging }) => (
                        <tr
                          ref={setNodeRef as (node: HTMLTableRowElement | null) => void}
                          style={style}
                          onClick={() => router.push(`/admin/lessons?lesson=${lesson.id}&fromCourse=${selectedCourse.id}`)}
                          className={`cursor-pointer ${isDragging ? "bg-white shadow-lg" : "hover:bg-gray-50"}`}
                        >
                          <td className="whitespace-nowrap px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <DragHandle {...dragHandleProps} />
                              <span className="w-6 text-center text-sm text-gray-500">{index + 1}</span>
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
                      )}
                    </SortableRow>
                  ))}
                </SortableList>
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
            Manage languages and their courses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCreateLanguageModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Language
          </Button>
          <Button onClick={openCreateModal} disabled={languages.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Visibility tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {(
          [
            { key: "all", label: "All" },
            { key: "published", label: "Published" },
            { key: "unpublished", label: "Unpublished" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setLanguageTab(tab.key)}
            className={`relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors ${
              languageTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Courses grouped by language */}
      {coursesByLanguage.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center text-gray-500 shadow-card">
          {languages.length === 0
            ? "No languages yet. Add your first language to get started."
            : languageTab === "published"
            ? "No published languages."
            : languageTab === "unpublished"
            ? "No unpublished languages."
            : "No languages yet. Add your first language to get started."}
        </div>
      ) : (
        <div className="space-y-4">
          <SortableList
            ids={coursesByLanguage.map((g) => g.language.id)}
            onReorder={handleReorderLanguages}
          >
          {coursesByLanguage.map(({ language, courses: languageCourses }) => {
            const isExpanded = expandedLanguages.has(language.id);
            const totalLessons = languageCourses.reduce((sum, c) => sum + c.lessonCount, 0);
            const totalWords = languageCourses.reduce((sum, c) => sum + (c.word_count ?? 0), 0);

            return (
              <SortableRow key={language.id} id={language.id}>
                {({ setNodeRef, style, dragHandleProps, isDragging }) => (
              <div
                ref={setNodeRef as (node: HTMLDivElement | null) => void}
                style={style}
                className={`rounded-xl bg-white overflow-hidden shadow-card ${isDragging ? "shadow-lg" : ""}`}
              >
                {/* Accordion Header */}
                <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  {canReorderLanguages && (
                    <DragHandle {...dragHandleProps} className="mr-1 shrink-0" />
                  )}
                  <button
                    onClick={() => toggleLanguage(language.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-2xl">{getFlagFromCode(language.code)}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{language.name}</h2>
                      <p className="text-sm text-gray-500">
                        {languageCourses.length} course{languageCourses.length !== 1 ? "s" : ""} · {totalLessons.toLocaleString("en-US")} lessons · {totalWords.toLocaleString("en-US")} words
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={language.is_visible}
                      onCheckedChange={() => openVisibilityModal(language)}
                      aria-label={language.is_visible ? "Hide language" : "Show language"}
                    />
                    <button
                      onClick={() => openEditLanguageModal(language)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit language"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleLanguage(language.id)}
                      className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      <ChevronDownIcon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="w-20 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Course
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
                      <tbody className="divide-y divide-bone-hover">
                        {languageCourses.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                              No courses yet. Use “Add Course” to create one for {language.name}.
                            </td>
                          </tr>
                        )}
                        <SortableList
                          ids={languageCourses.map((c) => c.id)}
                          onReorder={(newIds) => handleReorderCourses(language.id, newIds)}
                        >
                          {languageCourses.map((course, index) => (
                            <SortableRow key={course.id} id={course.id}>
                              {({ setNodeRef, style, dragHandleProps, isDragging }) => (
                                <tr
                                  ref={setNodeRef as (node: HTMLTableRowElement | null) => void}
                                  style={style}
                                  onClick={() => selectCourse(course)}
                                  onContextMenu={(e) => handleRowContextMenu(e, course)}
                                  className={`cursor-pointer ${isDragging ? "bg-white shadow-lg" : "hover:bg-gray-50"}`}
                                >
                                  <td className="whitespace-nowrap px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                      <DragHandle {...dragHandleProps} />
                                      <span className="w-6 text-center text-sm text-gray-500">{index + 1}</span>
                                    </div>
                                  </td>
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
                                  <td className="whitespace-nowrap px-6 py-4 text-gray-600 capitalize">
                                    {course.level || "-"}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                                    {course.lessonCount}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                                    {course.word_count ?? 0}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <AdminStatusBadge isPublished={course.is_published ?? false} />
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 text-right">
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                  </td>
                                </tr>
                              )}
                            </SortableRow>
                          ))}
                        </SortableList>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
                )}
              </SortableRow>
            );
          })}
          </SortableList>
        </div>
      )}

      {/* Right-click quick menu (portal so the table doesn't clip it) */}
      {mounted && menuState
        ? createPortal(
            <div
              role="menu"
              style={{ position: "fixed", top: menuState.y, left: menuState.x }}
              className="z-[60] min-w-[200px] overflow-hidden rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/5"
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const course = menuState.course;
                  setMenuState(null);
                  handleTogglePublish(course);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {menuState.course.is_published ? (
                  <>
                    <EyeOff className="h-4 w-4 text-gray-400" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 text-gray-400" />
                    Publish
                  </>
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const course = menuState.course;
                  setMenuState(null);
                  openEditDetailsModal(course);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4 text-gray-400" />
                Edit details
              </button>
            </div>,
            document.body
          )
        : null}

      {/* Quick edit details modal (name + description) */}
      <AdminModal
        isOpen={editDetailsCourse !== null}
        onClose={() => setEditDetailsCourse(null)}
        title="Edit course details"
        description="Update the course name and description."
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDetailsCourse(null)}
              disabled={isSavingEditDetails}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditDetails}
              disabled={isSavingEditDetails || editDetailsForm.name.trim() === ""}
            >
              {isSavingEditDetails ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <AdminFormField label="Name" name="edit-details-name" required>
            <AdminInput
              value={editDetailsForm.name}
              onChange={(e) =>
                setEditDetailsForm({ ...editDetailsForm, name: e.target.value })
              }
              placeholder="Course name"
            />
          </AdminFormField>
          <AdminFormField label="Description" name="edit-details-description">
            <AdminTextarea
              value={editDetailsForm.description}
              onChange={(e) =>
                setEditDetailsForm({ ...editDetailsForm, description: e.target.value })
              }
              placeholder="Course description"
            />
          </AdminFormField>
        </div>
      </AdminModal>

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

            <AdminFormField label="Price Override (cents)" name="price_override_cents">
              <AdminInput
                id="price_override_cents"
                name="price_override_cents"
                type="number"
                min={0}
                value={formData.price_override_cents}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_override_cents: parseInt(e.target.value) || 0,
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

      {/* Language Create/Edit Modal */}
      <AdminModal
        isOpen={isLanguageModalOpen}
        onClose={() => {
          setIsLanguageModalOpen(false);
          resetLanguageForm();
        }}
        size="lg"
        title={editingLanguage ? "Edit Language" : "Add Language"}
        description={
          editingLanguage
            ? "Update the language details."
            : "Add a new language for courses."
        }
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              {editingLanguage && (
                <Button
                  variant="destructive"
                  onClick={() => openDeleteLanguageModal(editingLanguage)}
                  disabled={isSavingLanguage}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLanguageModalOpen(false);
                  resetLanguageForm();
                }}
                disabled={isSavingLanguage}
              >
                Cancel
              </Button>
              <Button onClick={handleLanguageSubmit} disabled={isSavingLanguage}>
                {isSavingLanguage
                  ? "Saving..."
                  : editingLanguage
                  ? "Save Changes"
                  : "Add Language"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <AdminFormField label="Name" name="lang-name" required error={languageErrors.name}>
            <AdminInput
              id="lang-name"
              name="lang-name"
              value={languageForm.name}
              onChange={(e) =>
                setLanguageForm({ ...languageForm, name: e.target.value })
              }
              placeholder="e.g., Italian"
              error={!!languageErrors.name}
            />
          </AdminFormField>

          <AdminFormField
            label="Native Name"
            name="lang-native-name"
            required
            error={languageErrors.native_name}
          >
            <AdminInput
              id="lang-native-name"
              name="lang-native-name"
              value={languageForm.native_name}
              onChange={(e) =>
                setLanguageForm({ ...languageForm, native_name: e.target.value })
              }
              placeholder="e.g., Italiano"
              error={!!languageErrors.native_name}
            />
          </AdminFormField>

          <AdminFormField
            label="Language Code (ISO 639-1)"
            name="lang-code"
            required
            error={languageErrors.code}
            hint="2-3 letter code like 'it', 'es', 'fr', 'de', 'zh'"
          >
            <div className="flex items-center gap-3">
              <AdminInput
                id="lang-code"
                name="lang-code"
                value={languageForm.code}
                onChange={(e) =>
                  setLanguageForm({ ...languageForm, code: e.target.value.toLowerCase() })
                }
                placeholder="e.g., it"
                error={!!languageErrors.code}
                className="w-24"
              />
              {languageForm.code && (
                <span className="text-2xl" title="Flag preview">
                  {getFlagFromCode(languageForm.code)}
                </span>
              )}
            </div>
          </AdminFormField>

          {/* Greetings section */}
          <div className="border-t border-gray-200 pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Schedule Page Greetings
            </p>
            <div className="space-y-3">
              {(["morning", "afternoon", "evening"] as const).map((time) => (
                <div key={time} className="grid grid-cols-[100px_1fr_1fr] items-center gap-2">
                  <span className="text-xs font-medium capitalize text-gray-500">
                    {time}
                  </span>
                  <AdminInput
                    id={`greeting-${time}`}
                    name={`greeting-${time}`}
                    value={greetingsData[time].text}
                    onChange={(e) =>
                      setGreetingsData({
                        ...greetingsData,
                        [time]: { ...greetingsData[time], text: e.target.value },
                      })
                    }
                    placeholder={`e.g., ${time === "morning" ? "Buongiorno" : time === "afternoon" ? "Buon pomeriggio" : "Buonasera"}`}
                  />
                  <AdminInput
                    id={`translation-${time}`}
                    name={`translation-${time}`}
                    value={greetingsData[time].translation}
                    onChange={(e) =>
                      setGreetingsData({
                        ...greetingsData,
                        [time]: { ...greetingsData[time], translation: e.target.value },
                      })
                    }
                    placeholder={`English: Good ${time}`}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">
                Left: greeting in target language. Right: English translation (shown on hover).
              </p>
            </div>
          </div>
        </div>
      </AdminModal>

      {/* Delete Language Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteLanguageModalOpen}
        onClose={() => {
          setIsDeleteLanguageModalOpen(false);
          setDeletingLanguage(null);
        }}
        onConfirm={handleDeleteLanguage}
        title="Delete Language"
        message={`Are you sure you want to delete "${deletingLanguage?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isSavingLanguage}
      />

      {/* Language Visibility Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={isVisibilityModalOpen}
        onClose={() => {
          setIsVisibilityModalOpen(false);
          setTogglingLanguage(null);
        }}
        onConfirm={handleToggleVisibility}
        title={togglingLanguage?.is_visible ? "Hide Language" : "Show Language"}
        message={
          togglingLanguage?.is_visible
            ? `Are you sure you want to hide "${togglingLanguage?.name}"? It will no longer be visible to users.`
            : `Are you sure you want to show "${togglingLanguage?.name}"? It will become visible to users.`
        }
        confirmLabel={togglingLanguage?.is_visible ? "Hide" : "Show"}
        confirmVariant={togglingLanguage?.is_visible ? "destructive" : "default"}
        isLoading={isSavingLanguage}
      />
    </div>
  );
}
