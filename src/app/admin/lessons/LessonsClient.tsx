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
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
  AdminStatusBadge,
  AdminFileUpload,
} from "@/components/admin";
import { AdminAudioUpload } from "@/components/admin/AdminAudioUpload";
import {
  createLesson,
  updateLesson,
  deleteLesson,
  publishLesson,
  unpublishLesson,
  cloneLesson,
} from "@/lib/mutations/admin/lessons";
import {
  createWord,
  updateWord,
  removeWordFromLesson,
  reorderWords,
} from "@/lib/mutations/admin/words";
import {
  createSentence,
  deleteSentence,
} from "@/lib/mutations/admin/sentences";
import { uploadFileClient } from "@/lib/supabase/storage.client";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/client";
import {
  getWordRelationships,
  searchWordsForRelationship,
  addWordRelationship,
  removeWordRelationship,
  type RelatedWord,
} from "@/lib/queries/wordRelationships.client";

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

interface Word {
  id: string;
  headword: string;
  lemma: string;
  english: string;
  language_id: string;
  category: string | null;
  part_of_speech: string | null;
  gender: string | null;
  transitivity: string | null;
  is_irregular: boolean | null;
  grammatical_number: string | null;
  notes: string | null;
  admin_notes: string | null;
  memory_trigger_text: string | null;
  memory_trigger_image_url: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  related_word_ids: string[] | null;
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

interface WordFormData {
  headword: string;
  lemma: string;
  english: string;
  category: string;
  part_of_speech: string;
  gender: string;
  transitivity: string;
  is_irregular: boolean;
  grammatical_number: string;
  notes: string;
  admin_notes: string;
  memory_trigger_text: string;
}

interface WordFormErrors {
  headword?: string;
  english?: string;
}

interface FileUploads {
  triggerImage: File | null;
  audioEnglish: File | null;
  audioForeign: File | null;
  audioTrigger: File | null;
}

const categoryOptions = [
  { value: "", label: "Select..." },
  { value: "word", label: "Word" },
  { value: "phrase", label: "Phrase" },
  { value: "sentence", label: "Sentence" },
  { value: "fact", label: "Fact" },
  { value: "information", label: "Information" },
];

const partOfSpeechOptions = [
  { value: "", label: "Select..." },
  { value: "noun", label: "Noun" },
  { value: "verb", label: "Verb" },
  { value: "adjective", label: "Adjective" },
  { value: "adverb", label: "Adverb" },
  { value: "pronoun", label: "Pronoun" },
  { value: "preposition", label: "Preposition" },
  { value: "conjunction", label: "Conjunction" },
  { value: "interjection", label: "Interjection" },
  { value: "article", label: "Article" },
  { value: "number", label: "Number" },
];

const genderOptions = [
  { value: "", label: "Select..." },
  { value: "m", label: "Masculine (m)" },
  { value: "f", label: "Feminine (f)" },
  { value: "n", label: "Neuter (n)" },
  { value: "mf", label: "Both (m/f)" },
];

const transitivityOptions = [
  { value: "", label: "Select..." },
  { value: "vt", label: "Transitive (vt)" },
  { value: "vi", label: "Intransitive (vi)" },
  { value: "vt_vi", label: "Both (vt/vi)" },
];

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

  // Word form state
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [isRemoveWordModalOpen, setIsRemoveWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [removingWord, setRemovingWord] = useState<Word | null>(null);
  const [wordFormData, setWordFormData] = useState<WordFormData>({
    headword: "",
    lemma: "",
    english: "",
    category: "",
    part_of_speech: "",
    gender: "",
    transitivity: "",
    is_irregular: false,
    grammatical_number: "sg",
    notes: "",
    admin_notes: "",
    memory_trigger_text: "",
  });
  const [wordErrors, setWordErrors] = useState<WordFormErrors>({});
  const [fileUploads, setFileUploads] = useState<FileUploads>({
    triggerImage: null,
    audioEnglish: null,
    audioForeign: null,
    audioTrigger: null,
  });
  const [previewUrls, setPreviewUrls] = useState<{
    triggerImage: string | null;
    audioEnglish: string | null;
    audioForeign: string | null;
    audioTrigger: string | null;
  }>({
    triggerImage: null,
    audioEnglish: null,
    audioForeign: null,
    audioTrigger: null,
  });
  const [showSentenceForm, setShowSentenceForm] = useState(false);
  const [newSentence, setNewSentence] = useState({
    foreign_sentence: "",
    english_sentence: "",
  });

  // Related words state (for related_word_ids array on word)
  const [relatedWordIds, setRelatedWordIds] = useState<string[]>([]);
  const [relatedWordSearch, setRelatedWordSearch] = useState("");
  const [relatedWordSearchResults, setRelatedWordSearchResults] = useState<Word[]>([]);
  const [isSearchingRelatedWords, setIsSearchingRelatedWords] = useState(false);

  // Word relationships state (for word_relationships table - compound, grammar, sentence types)
  const [typedRelations, setTypedRelations] = useState<RelatedWord[]>([]);
  const [isLoadingTypedRelations, setIsLoadingTypedRelations] = useState(false);
  const [typedRelationSearch, setTypedRelationSearch] = useState("");
  const [typedRelationSearchResults, setTypedRelationSearchResults] = useState<{ id: string; headword: string; english: string }[]>([]);
  const [isSearchingTypedRelations, setIsSearchingTypedRelations] = useState(false);
  const [newTypedRelationType, setNewTypedRelationType] = useState("compound");

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
      return <span className="ml-1 text-gray-300">↕</span>;
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

  // Fetch typed word relationships when editing word changes
  useEffect(() => {
    if (editingWord) {
      setIsLoadingTypedRelations(true);
      getWordRelationships(editingWord.id)
        .then((result) => {
          if (!result.error) {
            setTypedRelations(result.relatedWords);
          }
        })
        .finally(() => setIsLoadingTypedRelations(false));
    } else {
      setTypedRelations([]);
    }
  }, [editingWord?.id]);

  // Search for words to add as typed relations
  useEffect(() => {
    if (!typedRelationSearch.trim() || !editingWord) {
      setTypedRelationSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTypedRelations(true);
      const result = await searchWordsForRelationship(typedRelationSearch, editingWord.id);
      if (!result.error) {
        // Filter out words already in relationships
        const existingIds = typedRelations.map(r => r.id);
        setTypedRelationSearchResults(result.words.filter(w => !existingIds.includes(w.id)));
      }
      setIsSearchingTypedRelations(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [typedRelationSearch, editingWord?.id, typedRelations]);

  // ============================================================================
  // WORD HANDLERS
  // ============================================================================

  const resetWordForm = () => {
    setWordFormData({
      headword: "",
      lemma: "",
      english: "",
      category: "",
      part_of_speech: "",
      gender: "",
      transitivity: "",
      is_irregular: false,
      grammatical_number: "sg",
      notes: "",
      admin_notes: "",
      memory_trigger_text: "",
    });
    setWordErrors({});
    setFileUploads({
      triggerImage: null,
      audioEnglish: null,
      audioForeign: null,
      audioTrigger: null,
    });
    setPreviewUrls({
      triggerImage: null,
      audioEnglish: null,
      audioForeign: null,
      audioTrigger: null,
    });
    setEditingWord(null);
    setShowSentenceForm(false);
    setNewSentence({ foreign_sentence: "", english_sentence: "" });
    setRelatedWordIds([]);
    setRelatedWordSearch("");
    setRelatedWordSearchResults([]);
    setTypedRelations([]);
    setTypedRelationSearch("");
    setTypedRelationSearchResults([]);
  };

  const openCreateWordModal = () => {
    resetWordForm();
    setIsWordModalOpen(true);
  };

  const openEditWordModal = (word: Word) => {
    setEditingWord(word);
    setWordFormData({
      headword: word.headword,
      lemma: word.lemma,
      english: word.english,
      category: word.category || "",
      part_of_speech: word.part_of_speech || "",
      gender: word.gender || "",
      transitivity: word.transitivity || "",
      is_irregular: word.is_irregular ?? false,
      grammatical_number: word.grammatical_number || "sg",
      notes: word.notes || "",
      admin_notes: word.admin_notes || "",
      memory_trigger_text: word.memory_trigger_text || "",
    });
    setPreviewUrls({
      triggerImage: word.memory_trigger_image_url,
      audioEnglish: word.audio_url_english,
      audioForeign: word.audio_url_foreign,
      audioTrigger: word.audio_url_trigger,
    });
    setWordErrors({});
    setRelatedWordIds(word.related_word_ids || []);
    setRelatedWordSearch("");
    setRelatedWordSearchResults([]);
    setIsWordModalOpen(true);
  };

  const openRemoveWordModal = (word: Word) => {
    setRemovingWord(word);
    setIsRemoveWordModalOpen(true);
  };

  const validateWordForm = (): boolean => {
    const newErrors: WordFormErrors = {};
    if (!wordFormData.headword.trim()) {
      newErrors.headword = "Headword is required";
    }
    if (!wordFormData.english.trim()) {
      newErrors.english = "English translation is required";
    }
    setWordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleWordSubmit = async () => {
    if (!validateWordForm() || !selectedLesson) return;

    setIsLoading(true);
    try {
      const wordData: any = {
        headword: wordFormData.headword,
        lemma: wordFormData.lemma || wordFormData.headword,
        english: wordFormData.english,
        category: wordFormData.category || null,
        part_of_speech: wordFormData.category === "word" ? (wordFormData.part_of_speech || null) : null,
        gender: wordFormData.gender || null,
        transitivity: wordFormData.transitivity || null,
        is_irregular: wordFormData.is_irregular,
        grammatical_number: wordFormData.grammatical_number || null,
        notes: wordFormData.notes || null,
        admin_notes: wordFormData.admin_notes || null,
        memory_trigger_text: wordFormData.memory_trigger_text || null,
        related_word_ids: relatedWordIds,
      };

      let wordId = editingWord?.id;

      if (editingWord) {
        const result = await updateWord(editingWord.id, wordData, selectedLesson.id);
        if (!result.success) {
          setWordErrors({ headword: result.error || "Failed to update word" });
          return;
        }
      } else {
        const result = await createWord({
          lesson_id: selectedLesson.id,
          ...wordData,
        });
        if (!result.success || !result.id) {
          setWordErrors({ headword: result.error || "Failed to create word" });
          return;
        }
        wordId = result.id;
      }

      // Handle file uploads
      if (wordId) {
        const uploadPromises: Promise<any>[] = [];

        if (fileUploads.triggerImage) {
          uploadPromises.push(
            uploadFileClient("images", fileUploads.triggerImage, "words", wordId, "trigger")
              .then((res) => {
                if (res.url) {
                  return updateWord(wordId!, { memory_trigger_image_url: res.url });
                }
              })
          );
        }

        if (fileUploads.audioEnglish) {
          uploadPromises.push(
            uploadFileClient("audio", fileUploads.audioEnglish, "words", wordId, "english")
              .then((res) => {
                if (res.url) {
                  return updateWord(wordId!, { audio_url_english: res.url });
                }
              })
          );
        }

        if (fileUploads.audioForeign) {
          uploadPromises.push(
            uploadFileClient("audio", fileUploads.audioForeign, "words", wordId, "foreign")
              .then((res) => {
                if (res.url) {
                  return updateWord(wordId!, { audio_url_foreign: res.url });
                }
              })
          );
        }

        if (fileUploads.audioTrigger) {
          uploadPromises.push(
            uploadFileClient("audio", fileUploads.audioTrigger, "words", wordId, "trigger")
              .then((res) => {
                if (res.url) {
                  return updateWord(wordId!, { audio_url_trigger: res.url });
                }
              })
          );
        }

        await Promise.all(uploadPromises);
      }

      setIsWordModalOpen(false);
      resetWordForm();
      // Refresh words list
      await selectLesson(selectedLesson);
    } finally {
      setIsLoading(false);
    }
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

  const handleMoveWord = async (wordId: string, direction: "up" | "down") => {
    if (!selectedLesson) return;
    const currentIndex = words.findIndex((w) => w.id === wordId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= words.length) return;

    // Swap the words
    const newOrder = [...words];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    // Optimistically update the UI
    setWords(newOrder);

    // Persist the change
    const result = await reorderWords(selectedLesson.id, newOrder.map((w) => w.id));
    if (!result.success) {
      // Revert on failure
      setWords(words);
      alert(result.error || "Failed to reorder words");
    }
  };

  const handleAddSentence = async () => {
    if (!editingWord || !newSentence.foreign_sentence || !newSentence.english_sentence) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await createSentence({
        word_id: editingWord.id,
        foreign_sentence: newSentence.foreign_sentence,
        english_sentence: newSentence.english_sentence,
      });

      if (result.success && selectedLesson) {
        setNewSentence({ foreign_sentence: "", english_sentence: "" });
        setShowSentenceForm(false);
        await selectLesson(selectedLesson);
      } else {
        alert(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSentence = async (sentenceId: string) => {
    const confirmed = window.confirm("Delete this example sentence?");
    if (!confirmed) return;

    const result = await deleteSentence(sentenceId);
    if (!result.success) {
      alert(result.error);
    } else if (selectedLesson) {
      await selectLesson(selectedLesson);
    }
  };

  // Search for related words
  const searchRelatedWords = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setRelatedWordSearchResults([]);
      return;
    }

    setIsSearchingRelatedWords(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("words")
        .select("id, headword, english, language_id")
        .or(`headword.ilike.%${query}%,english.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error("Error searching words:", error);
        setRelatedWordSearchResults([]);
      } else {
        // Filter out the current word and already related words
        const filtered = (data || []).filter(
          (w) => w.id !== editingWord?.id && !relatedWordIds.includes(w.id)
        ) as Word[];
        setRelatedWordSearchResults(filtered);
      }
    } finally {
      setIsSearchingRelatedWords(false);
    }
  };

  const addRelatedWord = (wordId: string) => {
    if (!relatedWordIds.includes(wordId)) {
      setRelatedWordIds([...relatedWordIds, wordId]);
    }
    setRelatedWordSearch("");
    setRelatedWordSearchResults([]);
  };

  const removeRelatedWord = (wordId: string) => {
    setRelatedWordIds(relatedWordIds.filter((id) => id !== wordId));
  };

  const handleAddTypedRelation = async (relatedWordId: string) => {
    if (!editingWord) return;
    const result = await addWordRelationship(editingWord.id, relatedWordId, newTypedRelationType);
    if (result.success) {
      // Refresh relationships
      const refreshResult = await getWordRelationships(editingWord.id);
      if (!refreshResult.error) {
        setTypedRelations(refreshResult.relatedWords);
      }
      setTypedRelationSearch("");
      setTypedRelationSearchResults([]);
    } else {
      alert(result.error || "Failed to add relationship");
    }
  };

  const handleRemoveTypedRelation = async (relationshipId: string) => {
    const result = await removeWordRelationship(relationshipId);
    if (result.success) {
      setTypedRelations(typedRelations.filter(r => r.relationship_id !== relationshipId));
    } else {
      alert(result.error || "Failed to remove relationship");
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
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
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
                        placeholder="👋"
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
                    <span>{words.length} word{words.length !== 1 ? "s" : ""}</span>
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
        <div className="rounded-xl border border-gray-200 bg-white">
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
            <tbody className="divide-y divide-gray-200">
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
                words.map((word, index) => (
                  <tr
                    key={word.id}
                    onClick={() => openEditWordModal(word)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className="w-6 text-center text-sm text-gray-500">{index + 1}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveWord(word.id, "up");
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
                              handleMoveWord(word.id, "down");
                            }}
                            disabled={index === words.length - 1}
                            className={`rounded p-0.5 ${
                              index === words.length - 1
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Word Create/Edit Modal */}
        <AdminModal
          isOpen={isWordModalOpen}
          onClose={() => {
            setIsWordModalOpen(false);
            resetWordForm();
          }}
          title={editingWord ? "Edit Word" : "Add Word"}
          description={
            editingWord
              ? "Update the word details, media, and example sentences."
              : "Add a new vocabulary word to this lesson."
          }
          size="2xl"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsWordModalOpen(false);
                  resetWordForm();
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleWordSubmit} disabled={isLoading}>
                {isLoading
                  ? "Saving..."
                  : editingWord
                  ? "Save Changes"
                  : "Add Word"}
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField
                label={`Headword (${selectedLesson.course?.language?.name || "Foreign"})`}
                name="headword"
                required
                error={wordErrors.headword}
              >
                <AdminInput
                  id="headword"
                  name="headword"
                  value={wordFormData.headword}
                  onChange={(e) =>
                    setWordFormData({ ...wordFormData, headword: e.target.value })
                  }
                  placeholder="e.g., l'avventura"
                  error={!!wordErrors.headword}
                />
              </AdminFormField>

              <AdminFormField
                label="English"
                name="english"
                required
                error={wordErrors.english}
              >
                <AdminInput
                  id="english"
                  name="english"
                  value={wordFormData.english}
                  onChange={(e) =>
                    setWordFormData({ ...wordFormData, english: e.target.value })
                  }
                  placeholder="e.g., the adventure"
                  error={!!wordErrors.english}
                />
              </AdminFormField>
            </div>

            <AdminFormField
              label="Lemma (base form)"
              name="lemma"
              hint="Optional. Used for search/grouping. Defaults to headword if empty."
            >
              <AdminInput
                id="lemma"
                name="lemma"
                value={wordFormData.lemma}
                onChange={(e) =>
                  setWordFormData({ ...wordFormData, lemma: e.target.value })
                }
                placeholder="e.g., avventura"
              />
            </AdminFormField>

            <div className="grid grid-cols-2 gap-4">
              <AdminFormField label="Category" name="category">
                <AdminSelect
                  id="category"
                  name="category"
                  value={wordFormData.category}
                  onChange={(e) =>
                    setWordFormData({ ...wordFormData, category: e.target.value })
                  }
                  options={categoryOptions}
                />
              </AdminFormField>

              {wordFormData.category === "word" && (
                <AdminFormField label="Part of Speech" name="part_of_speech">
                  <AdminSelect
                    id="part_of_speech"
                    name="part_of_speech"
                    value={wordFormData.part_of_speech}
                    onChange={(e) =>
                      setWordFormData({ ...wordFormData, part_of_speech: e.target.value })
                    }
                    options={partOfSpeechOptions}
                  />
                </AdminFormField>
              )}
            </div>

            {/* Lexical Metadata */}
            <div className="grid grid-cols-2 gap-4">
              {(wordFormData.part_of_speech === "noun" || wordFormData.part_of_speech === "adjective") && (
                <AdminFormField label="Gender" name="gender" hint="For nouns and adjectives">
                  <AdminSelect
                    id="gender"
                    name="gender"
                    value={wordFormData.gender}
                    onChange={(e) =>
                      setWordFormData({ ...wordFormData, gender: e.target.value })
                    }
                    options={genderOptions}
                  />
                </AdminFormField>
              )}

              {wordFormData.part_of_speech === "verb" && (
                <AdminFormField label="Transitivity" name="transitivity" hint="For verbs only">
                  <AdminSelect
                    id="transitivity"
                    name="transitivity"
                    value={wordFormData.transitivity}
                    onChange={(e) =>
                      setWordFormData({ ...wordFormData, transitivity: e.target.value })
                    }
                    options={transitivityOptions}
                  />
                </AdminFormField>
              )}
            </div>

            {/* Boolean flags - only show for specific word types */}
            {wordFormData.category === "word" && (wordFormData.part_of_speech === "verb" || ["noun", "article", "adjective_noun"].includes(wordFormData.part_of_speech)) && (
              <div className="flex gap-6">
                {wordFormData.part_of_speech === "verb" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={wordFormData.is_irregular}
                      onChange={(e) =>
                        setWordFormData({ ...wordFormData, is_irregular: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Irregular verb</span>
                  </label>
                )}

                {["noun", "article", "adjective_noun"].includes(wordFormData.part_of_speech) && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={wordFormData.grammatical_number === "pl"}
                      onChange={(e) =>
                        setWordFormData({ ...wordFormData, grammatical_number: e.target.checked ? "pl" : "sg" })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Plural</span>
                  </label>
                )}
              </div>
            )}

            <AdminFormField label="Study Notes" name="notes" hint="The student will see these">
              <AdminTextarea
                id="notes"
                name="notes"
                value={wordFormData.notes}
                onChange={(e) =>
                  setWordFormData({ ...wordFormData, notes: e.target.value })
                }
                placeholder="Grammar notes, usage tips, etc."
              />
            </AdminFormField>

            {/* Memory Trigger */}
            <div className="border-t pt-4">
              <h3 className="mb-3 font-medium text-gray-900">Memory Trigger</h3>
              
              <AdminFormField label="Trigger Text" name="memory_trigger_text">
                <AdminTextarea
                  id="memory_trigger_text"
                  name="memory_trigger_text"
                  value={wordFormData.memory_trigger_text}
                  onChange={(e) =>
                    setWordFormData({ ...wordFormData, memory_trigger_text: e.target.value })
                  }
                  placeholder="Mnemonic or memory aid..."
                />
              </AdminFormField>

              <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Trigger Image
                </label>
                <AdminFileUpload
                  type="image"
                  value={previewUrls.triggerImage}
                  onChange={(file, url) => {
                    setFileUploads({ ...fileUploads, triggerImage: file });
                    setPreviewUrls({ ...previewUrls, triggerImage: url });
                  }}
                />
              </div>
            </div>

            {/* Audio Files */}
            <div className="border-t pt-4">
              <h3 className="mb-3 font-medium text-gray-900">Audio Files</h3>

              <div className="grid grid-cols-3 gap-4">
                <AdminAudioUpload
                  label="English Audio"
                  value={previewUrls.audioEnglish}
                  onChange={(file, url) => {
                    setFileUploads({ ...fileUploads, audioEnglish: file });
                    setPreviewUrls({ ...previewUrls, audioEnglish: url });
                  }}
                />
                <AdminAudioUpload
                  label="Foreign Audio"
                  value={previewUrls.audioForeign}
                  onChange={(file, url) => {
                    setFileUploads({ ...fileUploads, audioForeign: file });
                    setPreviewUrls({ ...previewUrls, audioForeign: url });
                  }}
                />
                <AdminAudioUpload
                  label="Trigger Audio"
                  value={previewUrls.audioTrigger}
                  onChange={(file, url) => {
                    setFileUploads({ ...fileUploads, audioTrigger: file });
                    setPreviewUrls({ ...previewUrls, audioTrigger: url });
                  }}
                />
              </div>
            </div>

            {/* Example Sentences (only when editing) */}
            {editingWord && (
              <div className="border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Example Sentences</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSentenceForm(true)}
                    disabled={showSentenceForm}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Sentence
                  </Button>
                </div>

                <div className="space-y-2">
                  {editingWord.example_sentences?.map((sentence) => (
                    <div
                      key={sentence.id}
                      className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {sentence.foreign_sentence}
                        </p>
                        <p className="text-sm text-gray-600">
                          {sentence.english_sentence}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSentence(sentence.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {showSentenceForm && (
                  <div className="mt-3 rounded-lg border border-primary/50 bg-primary/5 p-4">
                    <div className="space-y-3">
                      <AdminFormField label="Foreign Sentence" name="new_foreign">
                        <AdminInput
                          id="new_foreign"
                          value={newSentence.foreign_sentence}
                          onChange={(e) =>
                            setNewSentence({
                              ...newSentence,
                              foreign_sentence: e.target.value,
                            })
                          }
                          placeholder="e.g., Ciao, come stai?"
                        />
                      </AdminFormField>
                      <AdminFormField label="English Translation" name="new_english">
                        <AdminInput
                          id="new_english"
                          value={newSentence.english_sentence}
                          onChange={(e) =>
                            setNewSentence({
                              ...newSentence,
                              english_sentence: e.target.value,
                            })
                          }
                          placeholder="e.g., Hello, how are you?"
                        />
                      </AdminFormField>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowSentenceForm(false);
                            setNewSentence({ foreign_sentence: "", english_sentence: "" });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddSentence}
                          disabled={
                            isLoading ||
                            !newSentence.foreign_sentence ||
                            !newSentence.english_sentence
                          }
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Related Words (only when editing) */}
            {editingWord && (
              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium text-gray-900">Related Words</h3>

                {/* Current related words */}
                {relatedWordIds.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {relatedWordIds.map((wordId) => {
                      // Find the word in our current words list if available
                      const relatedWord = words.find((w) => w.id === wordId);
                      return (
                        <span
                          key={wordId}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                        >
                          {relatedWord ? `${relatedWord.headword} (${relatedWord.english})` : wordId.slice(0, 8)}
                          <button
                            onClick={() => removeRelatedWord(wordId)}
                            className="ml-1 rounded-full p-0.5 hover:bg-blue-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search to add related words */}
                <div className="relative">
                  <input
                    type="text"
                    value={relatedWordSearch}
                    onChange={(e) => {
                      setRelatedWordSearch(e.target.value);
                      searchRelatedWords(e.target.value);
                    }}
                    placeholder="Search for words to add..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {isSearchingRelatedWords && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      Searching...
                    </div>
                  )}

                  {/* Search results dropdown */}
                  {relatedWordSearchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                      {relatedWordSearchResults.map((word) => (
                        <button
                          key={word.id}
                          onClick={() => addRelatedWord(word.id)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <span className="font-medium">{word.headword}</span>
                          <span className="text-gray-500"> - {word.english}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {relatedWordIds.length === 0 && !relatedWordSearch && (
                  <p className="mt-2 text-sm text-gray-500">
                    No related words yet. Search above to add words.
                  </p>
                )}
              </div>
            )}

            {/* Word Relationships (compound, grammar, sentence - only when editing) */}
            {editingWord && (
              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium text-gray-900 flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Word Relationships
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Compound parts, grammar links, and example sentences from the database.
                </p>

                {isLoadingTypedRelations ? (
                  <p className="text-sm text-gray-500">Loading relationships...</p>
                ) : typedRelations.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {/* Group by relationship type */}
                    {["compound", "grammar", "sentence"].map((type) => {
                      const typeWords = typedRelations.filter(r => r.relationship_type === type);
                      if (typeWords.length === 0) return null;
                      return (
                        <div key={type}>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">{type}</p>
                          <div className="flex flex-wrap gap-2">
                            {typeWords.map((rel) => (
                              <span
                                key={rel.relationship_id}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700"
                              >
                                <span className="font-medium">{rel.headword}</span>
                                <span className="text-blue-400">({rel.english})</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTypedRelation(rel.relationship_id)}
                                  className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                                  title="Remove relationship"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">No word relationships.</p>
                )}

                {/* Add new typed relationship */}
                <div className="flex items-center gap-2">
                  <select
                    value={newTypedRelationType}
                    onChange={(e) => setNewTypedRelationType(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="compound">Compound</option>
                    <option value="grammar">Grammar</option>
                    <option value="sentence">Sentence</option>
                  </select>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={typedRelationSearch}
                      onChange={(e) => setTypedRelationSearch(e.target.value)}
                      placeholder="Search words to link..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {isSearchingTypedRelations && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        Searching...
                      </span>
                    )}
                    {typedRelationSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {typedRelationSearchResults.map((word) => (
                          <button
                            key={word.id}
                            type="button"
                            onClick={() => handleAddTypedRelation(word.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex justify-between items-center"
                          >
                            <span className="font-medium">{word.headword}</span>
                            <span className="text-gray-400">{word.english}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div className="border-t pt-4">
              <AdminFormField label="Admin Notes" name="admin_notes" hint="The student will NOT see these">
                <AdminTextarea
                  id="admin_notes"
                  name="admin_notes"
                  value={wordFormData.admin_notes}
                  onChange={(e) =>
                    setWordFormData({ ...wordFormData, admin_notes: e.target.value })
                  }
                  placeholder="Private notes for administrators only..."
                />
              </AdminFormField>
            </div>
          </div>
        </AdminModal>

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
      <div className="rounded-xl border border-gray-200 bg-white">
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
                placeholder="e.g., 👋"
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
