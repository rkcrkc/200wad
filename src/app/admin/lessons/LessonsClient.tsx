"use client";

import { useState, useMemo } from "react";
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
  Volume2,
  Image as ImageIcon,
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
  deleteWord,
} from "@/lib/mutations/admin/words";
import {
  createSentence,
  deleteSentence,
} from "@/lib/mutations/admin/sentences";
import { uploadFileClient } from "@/lib/supabase/storage.client";
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

interface Word {
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
  part_of_speech: string;
  gender: string;
  transitivity: string;
  is_irregular: boolean;
  grammatical_number: string;
  notes: string;
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
  { value: "phrase", label: "Phrase" },
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
  const [isDeleteWordModalOpen, setIsDeleteWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [deletingWord, setDeletingWord] = useState<Word | null>(null);
  const [wordFormData, setWordFormData] = useState<WordFormData>({
    headword: "",
    lemma: "",
    english: "",
    part_of_speech: "",
    gender: "",
    transitivity: "",
    is_irregular: false,
    grammatical_number: "sg",
    notes: "",
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

  const openEditLessonModal = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
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
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublish = async (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    const action = lesson.is_published ? unpublishLesson : publishLesson;
    const result = await action(lesson.id);
    if (!result.success) {
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  const handleClone = async (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const goBackToLessons = () => {
    setViewMode("list");
    setSelectedLesson(null);
    setWords([]);
    router.refresh(); // Refresh to update word counts
  };

  // ============================================================================
  // WORD HANDLERS
  // ============================================================================

  const resetWordForm = () => {
    setWordFormData({
      headword: "",
      lemma: "",
      english: "",
      part_of_speech: "",
      gender: "",
      transitivity: "",
      is_irregular: false,
      grammatical_number: "sg",
      notes: "",
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
      part_of_speech: word.part_of_speech || "",
      gender: word.gender || "",
      transitivity: word.transitivity || "",
      is_irregular: word.is_irregular ?? false,
      grammatical_number: word.grammatical_number || "sg",
      notes: word.notes || "",
      memory_trigger_text: word.memory_trigger_text || "",
    });
    setPreviewUrls({
      triggerImage: word.memory_trigger_image_url,
      audioEnglish: word.audio_url_english,
      audioForeign: word.audio_url_foreign,
      audioTrigger: word.audio_url_trigger,
    });
    setWordErrors({});
    setIsWordModalOpen(true);
  };

  const openDeleteWordModal = (word: Word) => {
    setDeletingWord(word);
    setIsDeleteWordModalOpen(true);
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
        part_of_speech: wordFormData.part_of_speech || null,
        gender: wordFormData.gender || null,
        transitivity: wordFormData.transitivity || null,
        is_irregular: wordFormData.is_irregular,
        grammatical_number: wordFormData.grammatical_number || null,
        notes: wordFormData.notes || null,
        memory_trigger_text: wordFormData.memory_trigger_text || null,
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

  const handleDeleteWord = async () => {
    if (!deletingWord || !selectedLesson) return;

    setIsLoading(true);
    try {
      const result = await deleteWord(deletingWord.id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsDeleteWordModalOpen(false);
      setDeletingWord(null);
      await selectLesson(selectedLesson);
    } finally {
      setIsLoading(false);
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
          All Lessons
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              {selectedLesson.emoji && <span>{selectedLesson.emoji}</span>}
              Lesson #{selectedLesson.number}: {selectedLesson.title}
            </h1>
            <p className="mt-1 text-gray-600">
              {getFlagFromCode(selectedLesson.course?.language?.code)} {selectedLesson.course?.name} &middot;{" "}
              {words.length} word{words.length !== 1 ? "s" : ""}
            </p>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Sentences
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
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
                words.map((word) => (
                  <tr key={word.id} className="hover:bg-gray-50">
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
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {word.example_sentences?.length || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditWordModal(word)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteWordModal(word)}
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
          size="xl"
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

            {/* Boolean flags */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={wordFormData.is_irregular}
                  onChange={(e) =>
                    setWordFormData({ ...wordFormData, is_irregular: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Irregular form</span>
              </label>

              {wordFormData.part_of_speech === "noun" && (
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

            <AdminFormField label="Notes" name="notes">
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
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    English Audio
                  </label>
                  <AdminFileUpload
                    type="audio"
                    value={previewUrls.audioEnglish}
                    onChange={(file, url) => {
                      setFileUploads({ ...fileUploads, audioEnglish: file });
                      setPreviewUrls({ ...previewUrls, audioEnglish: url });
                    }}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Foreign Audio
                  </label>
                  <AdminFileUpload
                    type="audio"
                    value={previewUrls.audioForeign}
                    onChange={(file, url) => {
                      setFileUploads({ ...fileUploads, audioForeign: file });
                      setPreviewUrls({ ...previewUrls, audioForeign: url });
                    }}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Trigger Audio
                  </label>
                  <AdminFileUpload
                    type="audio"
                    value={previewUrls.audioTrigger}
                    onChange={(file, url) => {
                      setFileUploads({ ...fileUploads, audioTrigger: file });
                      setPreviewUrls({ ...previewUrls, audioTrigger: url });
                    }}
                  />
                </div>
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
          </div>
        </AdminModal>

        {/* Delete Word Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteWordModalOpen}
          onClose={() => {
            setIsDeleteWordModalOpen(false);
            setDeletingWord(null);
          }}
          onConfirm={handleDeleteWord}
          title="Delete Word"
          message={`Are you sure you want to delete "${deletingWord?.headword}" (${deletingWord?.english})? This will also delete all example sentences.`}
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
                      <ChevronRight className="h-4 w-4 text-gray-400" />
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
                      <button
                        onClick={(e) => handleClone(lesson, e)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Clone Lesson"
                        disabled={isLoading}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleTogglePublish(lesson, e)}
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
                        onClick={(e) => openEditLessonModal(lesson, e)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => openDeleteLessonModal(lesson, e)}
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

      {/* Create/Edit Lesson Modal */}
      <AdminModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          resetLessonForm();
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
                setIsLessonModalOpen(false);
                resetLessonForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleLessonSubmit} disabled={isLoading}>
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
          )}

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
