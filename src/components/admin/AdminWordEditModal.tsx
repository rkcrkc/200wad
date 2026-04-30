"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Link2, ExternalLink, Trash2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
  AdminFileUpload,
} from "@/components/admin";
import { AdminAudioUpload } from "@/components/admin/AdminAudioUpload";
import { BodyTextSyntaxHelp } from "@/components/admin/BodyTextSyntaxHelp";
import { BodyTextEditor } from "@/components/admin/BodyTextEditor";
import {
  createWord,
  updateWord,
  addWordToLesson,
  deleteWord,
} from "@/lib/mutations/admin/words";
import {
  createSentence,
  deleteSentence,
} from "@/lib/mutations/admin/sentences";
import { uploadFileClient } from "@/lib/supabase/storage.client";
import { createClient as createClientSupabase } from "@/lib/supabase/client";
import {
  getWordRelationships,
  searchWordsForRelationship,
  addWordRelationship,
  removeWordRelationship,
  type RelatedWord,
} from "@/lib/queries/wordRelationships.client";

// ============================================================================
// TYPES
// ============================================================================

export interface ExampleSentence {
  id: string;
  foreign_sentence: string;
  english_sentence: string;
  thumbnail_image_url: string | null;
  sort_order: number | null;
}

/** Minimal word shape needed by the modal. All three views satisfy this. */
export interface WordWithDetails {
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
  developer_notes: string | null;
  alternate_answers: string[] | null;
  alternate_english_answers: string[] | null;
  memory_trigger_text: string | null;
  memory_trigger_image_url: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  example_sentences?: ExampleSentence[];
}

/** For the optional Lessons tab — list of lessons a word belongs to */
export interface WordLessonInfo {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

export interface LessonOption {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

export interface AdminWordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = create mode */
  editingWord: WordWithDetails | null;
  /** Context lesson (for create/update revalidation) */
  lessonId?: string;
  /** For "Headword (Italian)" label */
  languageName?: string;
  /** Callback after save — parent refreshes data */
  onSuccess: () => void;
  /** If provided, show Lessons tab */
  lessons?: LessonOption[];
  /** Get course name for a given course_id */
  getCourseName?: (courseId: string) => string;
  /** Word's current lesson assignments (for Lessons tab display) */
  wordLessons?: WordLessonInfo[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface FormData {
  headword: string;
  lemma: string;
  english: string;
  alternate_answers: string[];
  alternate_english_answers: string[];
  category: string;
  part_of_speech: string;
  gender: string;
  transitivity: string;
  is_irregular: boolean;
  grammatical_number: string;
  notes: string;
  developer_notes: string;
  memory_trigger_text: string;
}

interface FormErrors {
  headword?: string;
  english?: string;
  general?: string;
}

interface FileUploads {
  triggerImage: File | null;
  audioEnglish: File | null;
  audioForeign: File | null;
  audioTrigger: File | null;
}

type TabId = "word" | "trigger" | "audio" | "lessons";

const INITIAL_FORM_DATA: FormData = {
  headword: "",
  lemma: "",
  english: "",
  alternate_answers: [],
  alternate_english_answers: [],
  category: "",
  part_of_speech: "",
  gender: "",
  transitivity: "",
  is_irregular: false,
  grammatical_number: "sg",
  notes: "",
  developer_notes: "",
  memory_trigger_text: "",
};

const INITIAL_FILE_UPLOADS: FileUploads = {
  triggerImage: null,
  audioEnglish: null,
  audioForeign: null,
  audioTrigger: null,
};

const INITIAL_PREVIEW_URLS = {
  triggerImage: null as string | null,
  audioEnglish: null as string | null,
  audioForeign: null as string | null,
  audioTrigger: null as string | null,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminWordEditModal({
  isOpen,
  onClose,
  editingWord,
  lessonId,
  languageName,
  onSuccess,
  lessons,
  getCourseName,
  wordLessons: wordLessonsProp,
}: AdminWordEditModalProps) {
  const router = useRouter();
  const isCreateMode = !editingWord;

  // ---- Form state ----
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [newAlternateAnswer, setNewAlternateAnswer] = useState("");
  const [newAlternateEnglishAnswer, setNewAlternateEnglishAnswer] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [fileUploads, setFileUploads] = useState<FileUploads>(INITIAL_FILE_UPLOADS);
  const [previewUrls, setPreviewUrls] = useState(INITIAL_PREVIEW_URLS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("word");

  // ---- Delete modal ----
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---- Example sentences ----
  const [showSentenceForm, setShowSentenceForm] = useState(false);
  const [newSentence, setNewSentence] = useState({
    foreign_sentence: "",
    english_sentence: "",
  });

  // ---- Linked tips (read-only display) ----
  const [linkedTips, setLinkedTips] = useState<{ id: string; title: string | null; body: string }[]>([]);

  // ---- Related words (typed relationships) ----
  const [relatedWords, setRelatedWords] = useState<RelatedWord[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [relationSearch, setRelationSearch] = useState("");
  const [relationSearchResults, setRelationSearchResults] = useState<
    { id: string; headword: string; english: string }[]
  >([]);
  const [isSearchingRelations, setIsSearchingRelations] = useState(false);
  const [newRelationType, setNewRelationType] = useState("compound");

  // ---- Lessons tab state ----
  const [wordLessons, setWordLessons] = useState<WordLessonInfo[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [isAddingToLesson, setIsAddingToLesson] = useState(false);

  // ---- Populate form when editingWord changes ----
  useEffect(() => {
    if (!isOpen) return;

    if (editingWord) {
      setFormData({
        headword: editingWord.headword,
        lemma: editingWord.lemma,
        english: editingWord.english,
        alternate_answers: editingWord.alternate_answers || [],
        alternate_english_answers: editingWord.alternate_english_answers || [],
        category: editingWord.category || "",
        part_of_speech: editingWord.part_of_speech || "",
        gender: editingWord.gender || "",
        transitivity: editingWord.transitivity || "",
        is_irregular: editingWord.is_irregular ?? false,
        grammatical_number: editingWord.grammatical_number || "sg",
        notes: editingWord.notes || "",
        developer_notes: editingWord.developer_notes || "",
        memory_trigger_text: editingWord.memory_trigger_text || "",
      });
      setPreviewUrls({
        triggerImage: editingWord.memory_trigger_image_url,
        audioEnglish: editingWord.audio_url_english,
        audioForeign: editingWord.audio_url_foreign,
        audioTrigger: editingWord.audio_url_trigger,
      });
      setWordLessons(wordLessonsProp || []);
    } else {
      setFormData(INITIAL_FORM_DATA);
      setPreviewUrls(INITIAL_PREVIEW_URLS);
      setWordLessons([]);
    }
    setErrors({});
    setFileUploads(INITIAL_FILE_UPLOADS);
    setNewAlternateAnswer("");
    setNewAlternateEnglishAnswer("");
    setActiveTab("word");
    setShowSentenceForm(false);
    setNewSentence({ foreign_sentence: "", english_sentence: "" });
    setSelectedLessonId("");
    setRelationSearch("");
    setRelationSearchResults([]);
  }, [isOpen, editingWord?.id]);

  // ---- Fetch related words when editing word changes ----
  useEffect(() => {
    if (isOpen && editingWord) {
      setIsLoadingRelations(true);
      getWordRelationships(editingWord.id)
        .then((result) => {
          if (!result.error) {
            setRelatedWords(result.relatedWords);
          }
        })
        .finally(() => setIsLoadingRelations(false));

      // Fetch linked tips (client-side)
      const supabase = createClientSupabase();
      supabase
        .from("tip_words")
        .select("tips(id, title, body)")
        .eq("word_id", editingWord.id)
        .then(({ data }) => {
          const tips = (data || [])
            .map((tw) => tw.tips as unknown as { id: string; title: string | null; body: string } | null)
            .filter((t): t is NonNullable<typeof t> => t !== null);
          setLinkedTips(tips);
        });
    } else {
      setRelatedWords([]);
      setLinkedTips([]);
    }
  }, [isOpen, editingWord?.id]);

  // ---- Search for relation words with debounce ----
  useEffect(() => {
    if (!relationSearch.trim() || !editingWord) {
      setRelationSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRelations(true);
      const result = await searchWordsForRelationship(
        relationSearch,
        editingWord.id
      );
      if (!result.error) {
        const existingIds = relatedWords.map((r) => r.id);
        setRelationSearchResults(
          result.words.filter((w) => !existingIds.includes(w.id))
        );
      }
      setIsSearchingRelations(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [relationSearch, editingWord?.id, relatedWords]);

  // ---- Handlers ----

  const handleClose = () => {
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.headword.trim()) {
      newErrors.headword = "Headword is required";
    }
    if (!formData.english.trim()) {
      newErrors.english = "English translation is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    await performSubmit(formData);
  };

  const performSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const wordData: Record<string, unknown> = {
        headword: data.headword,
        lemma: data.lemma || data.headword,
        english: data.english,
        alternate_answers:
          data.alternate_answers.length > 0
            ? data.alternate_answers
            : null,
        alternate_english_answers:
          data.alternate_english_answers.length > 0
            ? data.alternate_english_answers
            : null,
        category: data.category || null,
        part_of_speech:
          data.category === "word"
            ? data.part_of_speech || null
            : null,
        gender: data.gender || null,
        transitivity: data.transitivity || null,
        is_irregular: data.is_irregular,
        grammatical_number: data.grammatical_number || null,
        notes: data.notes || null,
        developer_notes: data.developer_notes || null,
        memory_trigger_text: data.memory_trigger_text || null,
      };

      let wordId = editingWord?.id;

      if (editingWord) {
        // Update
        const result = await updateWord(editingWord.id, wordData, lessonId);
        if (!result.success) {
          setErrors({ general: result.error || "Failed to update word" });
          return;
        }
      } else {
        // Create — need a lessonId
        if (!lessonId) {
          setErrors({ general: "No lesson context for creating word" });
          return;
        }
        const result = await createWord({
          lesson_id: lessonId,
          headword: data.headword,
          english: data.english,
          ...wordData,
        });
        if (!result.success || !result.id) {
          setErrors({ general: result.error || "Failed to create word" });
          return;
        }
        wordId = result.id;
      }

      // Handle file uploads
      if (wordId) {
        const uploadPromises: Promise<unknown>[] = [];

        if (fileUploads.triggerImage) {
          uploadPromises.push(
            uploadFileClient(
              "word-images",
              fileUploads.triggerImage,
              "words",
              wordId,
              "trigger"
            ).then((res) => {
              if (res.url) {
                return updateWord(wordId!, {
                  memory_trigger_image_url: res.url,
                });
              }
            })
          );
        }

        if (fileUploads.audioEnglish) {
          uploadPromises.push(
            uploadFileClient(
              "audio",
              fileUploads.audioEnglish,
              "words",
              wordId,
              "english"
            ).then((res) => {
              if (res.url) {
                return updateWord(wordId!, { audio_url_english: res.url });
              }
            })
          );
        }

        if (fileUploads.audioForeign) {
          uploadPromises.push(
            uploadFileClient(
              "audio",
              fileUploads.audioForeign,
              "words",
              wordId,
              "foreign"
            ).then((res) => {
              if (res.url) {
                return updateWord(wordId!, { audio_url_foreign: res.url });
              }
            })
          );
        }

        if (fileUploads.audioTrigger) {
          uploadPromises.push(
            uploadFileClient(
              "audio",
              fileUploads.audioTrigger,
              "words",
              wordId,
              "trigger"
            ).then((res) => {
              if (res.url) {
                return updateWord(wordId!, { audio_url_trigger: res.url });
              }
            })
          );
        }

        await Promise.all(uploadPromises);
      }

      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingWord) return;
    setIsDeleting(true);
    try {
      const result = await deleteWord(editingWord.id, lessonId);
      if (result.success) {
        setIsDeleteModalOpen(false);
        onSuccess();
      } else {
        setErrors({ general: result.error || "Failed to delete word" });
        setIsDeleteModalOpen(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddToLesson = async () => {
    if (!editingWord || !selectedLessonId) return;
    setIsAddingToLesson(true);
    try {
      const result = await addWordToLesson(editingWord.id, selectedLessonId);
      if (result.success) {
        router.refresh();
        setSelectedLessonId("");
        const addedLesson = lessons?.find((l) => l.id === selectedLessonId);
        if (addedLesson) {
          setWordLessons([...wordLessons, addedLesson]);
        }
      } else {
        alert(result.error || "Failed to add word to lesson");
      }
    } finally {
      setIsAddingToLesson(false);
    }
  };

  const navigateToLesson = (navLessonId: string) => {
    onClose();
    router.push(`/admin/lessons?lesson=${navLessonId}`);
  };

  const handleAddRelation = async (relatedWordId: string) => {
    if (!editingWord) return;
    const result = await addWordRelationship(
      editingWord.id,
      relatedWordId,
      newRelationType
    );
    if (result.success) {
      const refreshResult = await getWordRelationships(editingWord.id);
      if (!refreshResult.error) {
        setRelatedWords(refreshResult.relatedWords);
      }
      setRelationSearch("");
      setRelationSearchResults([]);
    } else {
      alert(result.error || "Failed to add relationship");
    }
  };

  const handleRemoveRelation = async (relationshipId: string) => {
    const result = await removeWordRelationship(relationshipId);
    if (result.success) {
      setRelatedWords(
        relatedWords.filter((r) => r.relationship_id !== relationshipId)
      );
    } else {
      alert(result.error || "Failed to remove relationship");
    }
  };

  const handleAddSentence = async () => {
    if (
      !editingWord ||
      !newSentence.foreign_sentence ||
      !newSentence.english_sentence
    ) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await createSentence({
        word_id: editingWord.id,
        foreign_sentence: newSentence.foreign_sentence,
        english_sentence: newSentence.english_sentence,
      });
      if (result.success) {
        setNewSentence({ foreign_sentence: "", english_sentence: "" });
        setShowSentenceForm(false);
        // Refresh parent so the word's example_sentences update
        onSuccess();
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
    } else {
      onSuccess();
    }
  };

  const isInformation = formData.category === "information";

  // ---- Build tab list ----
  const tabs: { id: TabId; label: string }[] = [
    { id: "word", label: isInformation ? "Information" : "Word" },
  ];
  if (!isInformation) {
    tabs.push({
      id: "trigger",
      label: formData.category === "word" ? "Memory Trigger" : "Body",
    });
  }
  tabs.push({ id: "audio", label: "Audio Files" });
  if (lessons) {
    tabs.push({ id: "lessons", label: "Lessons" });
  }

  // If switching to information while on trigger tab, reset to word tab
  useEffect(() => {
    if (isInformation && activeTab === "trigger") {
      setActiveTab("word");
    }
  }, [isInformation, activeTab]);

  // ---- Render ----
  return (
    <>
      <AdminModal
        isOpen={isOpen}
        onClose={handleClose}
        title={isCreateMode ? "Add Word" : "Edit Word"}
        description={
          isCreateMode
            ? "Add a new vocabulary word to this lesson."
            : "Update the word details and media."
        }
        size="xl"
        fullHeight
        footer={
          <div className="flex w-full items-center justify-between">
            {editingWord ? (
              <Button
                variant="destructive"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isLoading}
              >
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading
                  ? "Saving..."
                  : isCreateMode
                  ? "Add Word"
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        }
      >
        <div>
          {/* General Error */}
          {errors.general && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {errors.general}
            </div>
          )}

          {/* Tab Bar */}
          <div className="mb-4 flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ============================================================ */}
          {/* Tab: Word                                                     */}
          {/* ============================================================ */}
          {activeTab === "word" && (
            <div className="space-y-6">
              {/* Category selector - always at top */}
              <AdminFormField label="Category" name="category">
                <AdminSelect
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  options={categoryOptions}
                />
              </AdminFormField>

              {/* ---- Information category: simplified form ---- */}
              {isInformation ? (
                <div className="space-y-6">
                  <AdminFormField label="Title" name="english" required error={errors.english}>
                    <AdminInput
                      id="english"
                      name="english"
                      value={formData.english}
                      onChange={(e) =>
                        setFormData({ ...formData, english: e.target.value })
                      }
                      placeholder="e.g., Italian Greetings"
                      error={!!errors.english}
                    />
                  </AdminFormField>

                  <AdminFormField label="Subheading" name="headword" required error={errors.headword}>
                    <AdminInput
                      id="headword"
                      name="headword"
                      value={formData.headword}
                      onChange={(e) =>
                        setFormData({ ...formData, headword: e.target.value })
                      }
                      placeholder="e.g., Saluti italiani"
                      error={!!errors.headword}
                    />
                  </AdminFormField>

                  <AdminFormField label="Body" name="memory_trigger_text">
                    <BodyTextSyntaxHelp defaultOpen={false} variant="multi" />
                    <BodyTextEditor
                      id="memory_trigger_text"
                      name="memory_trigger_text"
                      value={formData.memory_trigger_text}
                      onChange={(v) =>
                        setFormData({ ...formData, memory_trigger_text: v })
                      }
                      placeholder="Write the information page content..."
                      rows={10}
                      variant="multi"
                    />
                  </AdminFormField>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Image
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

                  <AdminFormField label="Developer Notes" name="developer_notes" hint="The student will NOT see these">
                    <AdminTextarea
                      id="developer_notes"
                      name="developer_notes"
                      value={formData.developer_notes}
                      onChange={(e) =>
                        setFormData({ ...formData, developer_notes: e.target.value })
                      }
                      placeholder="Private notes for administrators only..."
                    />
                  </AdminFormField>
                </div>
              ) : (
              <>
              {/* ---- Standard word form ---- */}
              {/* Foreign Word subgroup */}
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-500">
                  Foreign Word
                </h4>
                <AdminFormField
                  label={`Headword (${languageName || "Foreign"})`}
                  name="headword"
                  required
                  error={errors.headword}
                >
                  <AdminInput
                    id="headword"
                    name="headword"
                    value={formData.headword}
                    onChange={(e) =>
                      setFormData({ ...formData, headword: e.target.value })
                    }
                    placeholder="e.g., l'avventura"
                    error={!!errors.headword}
                  />
                </AdminFormField>

                {/* Alternate Foreign Answers */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Alternate Answers
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      (other spellings accepted in tests)
                    </span>
                  </label>
                  {formData.alternate_answers.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {formData.alternate_answers.map((answer, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700"
                        >
                          {answer}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                alternate_answers:
                                  formData.alternate_answers.filter(
                                    (_, i) => i !== index
                                  ),
                              })
                            }
                            className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAlternateAnswer}
                      onChange={(e) => setNewAlternateAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newAlternateAnswer.trim()) {
                          e.preventDefault();
                          if (
                            !formData.alternate_answers.includes(
                              newAlternateAnswer.trim()
                            )
                          ) {
                            setFormData({
                              ...formData,
                              alternate_answers: [
                                ...formData.alternate_answers,
                                newAlternateAnswer.trim(),
                              ],
                            });
                          }
                          setNewAlternateAnswer("");
                        }
                      }}
                      placeholder="Type and press Enter to add"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          newAlternateAnswer.trim() &&
                          !formData.alternate_answers.includes(
                            newAlternateAnswer.trim()
                          )
                        ) {
                          setFormData({
                            ...formData,
                            alternate_answers: [
                              ...formData.alternate_answers,
                              newAlternateAnswer.trim(),
                            ],
                          });
                          setNewAlternateAnswer("");
                        }
                      }}
                      disabled={!newAlternateAnswer.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                <AdminFormField
                  label="Lemma (base form)"
                  name="lemma"
                  hint="Optional. Used for search/grouping. Defaults to headword if empty."
                >
                  <AdminInput
                    id="lemma"
                    name="lemma"
                    value={formData.lemma}
                    onChange={(e) =>
                      setFormData({ ...formData, lemma: e.target.value })
                    }
                    placeholder="e.g., avventura"
                  />
                </AdminFormField>
              </div>

              {/* English Word subgroup */}
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-500">
                  English Word
                </h4>
                <AdminFormField
                  label="English"
                  name="english"
                  required
                  error={errors.english}
                >
                  <AdminInput
                    id="english"
                    name="english"
                    value={formData.english}
                    onChange={(e) =>
                      setFormData({ ...formData, english: e.target.value })
                    }
                    placeholder="e.g., the adventure"
                    error={!!errors.english}
                  />
                </AdminFormField>

                {/* Alternate English Answers */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Alternate English Answers
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      (other English translations accepted in tests)
                    </span>
                  </label>
                  {formData.alternate_english_answers.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {formData.alternate_english_answers.map(
                        (answer, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-sm text-green-700"
                          >
                            {answer}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  alternate_english_answers:
                                    formData.alternate_english_answers.filter(
                                      (_, i) => i !== index
                                    ),
                                })
                              }
                              className="ml-1 text-green-400 hover:text-red-500 transition-colors"
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAlternateEnglishAnswer}
                      onChange={(e) =>
                        setNewAlternateEnglishAnswer(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          newAlternateEnglishAnswer.trim()
                        ) {
                          e.preventDefault();
                          if (
                            !formData.alternate_english_answers.includes(
                              newAlternateEnglishAnswer.trim()
                            )
                          ) {
                            setFormData({
                              ...formData,
                              alternate_english_answers: [
                                ...formData.alternate_english_answers,
                                newAlternateEnglishAnswer.trim(),
                              ],
                            });
                          }
                          setNewAlternateEnglishAnswer("");
                        }
                      }}
                      placeholder="Type and press Enter to add"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          newAlternateEnglishAnswer.trim() &&
                          !formData.alternate_english_answers.includes(
                            newAlternateEnglishAnswer.trim()
                          )
                        ) {
                          setFormData({
                            ...formData,
                            alternate_english_answers: [
                              ...formData.alternate_english_answers,
                              newAlternateEnglishAnswer.trim(),
                            ],
                          });
                          setNewAlternateEnglishAnswer("");
                        }
                      }}
                      disabled={!newAlternateEnglishAnswer.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Grammar fields (conditional on category/part of speech) */}
              {formData.category === "word" && (
                <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <AdminFormField
                    label="Part of Speech"
                    name="part_of_speech"
                  >
                    <AdminSelect
                      id="part_of_speech"
                      name="part_of_speech"
                      value={formData.part_of_speech}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          part_of_speech: e.target.value,
                        })
                      }
                      options={partOfSpeechOptions}
                    />
                  </AdminFormField>

                  {(formData.part_of_speech === "noun" ||
                    formData.part_of_speech === "adjective") && (
                    <AdminFormField label="Gender" name="gender">
                      <AdminSelect
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={(e) =>
                          setFormData({ ...formData, gender: e.target.value })
                        }
                        options={genderOptions}
                      />
                    </AdminFormField>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {formData.part_of_speech === "verb" && (
                      <AdminFormField
                        label="Transitivity"
                        name="transitivity"
                      >
                        <AdminSelect
                          id="transitivity"
                          name="transitivity"
                          value={formData.transitivity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              transitivity: e.target.value,
                            })
                          }
                          options={transitivityOptions}
                        />
                      </AdminFormField>
                    )}

                    {formData.part_of_speech === "verb" && (
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.is_irregular}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                is_irregular: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">Irregular verb</span>
                        </label>
                      </div>
                    )}

                    {["noun", "article", "adjective_noun"].includes(
                      formData.part_of_speech
                    ) && (
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.grammatical_number === "pl"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                grammatical_number: e.target.checked
                                  ? "pl"
                                  : "sg",
                              })
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">Plural</span>
                        </label>
                      </div>
                    )}
                </div>
                </>
              )}

              {/* Notes subgroup */}
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <AdminFormField
                  label="Study Notes"
                  name="notes"
                  hint="The student will see these"
                >
                  <BodyTextSyntaxHelp defaultOpen={false} variant="multi" />
                  <BodyTextEditor
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={(v) =>
                      setFormData({ ...formData, notes: v })
                    }
                    placeholder="Grammar notes, usage tips, etc."
                    rows={6}
                    variant="multi"
                  />
                </AdminFormField>
                <AdminFormField
                  label="Developer Notes"
                  name="developer_notes"
                  hint="The student will NOT see these"
                >
                  <AdminTextarea
                    id="developer_notes"
                    name="developer_notes"
                    value={formData.developer_notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        developer_notes: e.target.value,
                      })
                    }
                    placeholder="Private notes for administrators only..."
                  />
                </AdminFormField>
              </div>

              {/* Example Sentences (only when editing) */}
              {editingWord && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-500">
                      Example Sentences
                    </h4>
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
                        <AdminFormField
                          label="Foreign Sentence"
                          name="new_foreign"
                        >
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
                        <AdminFormField
                          label="English Translation"
                          name="new_english"
                        >
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
                              setNewSentence({
                                foreign_sentence: "",
                                english_sentence: "",
                              });
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

              {/* Linked Tips */}
              {editingWord && (
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Linked Tips
                  </h4>
                  {linkedTips.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {linkedTips.map((tip) => (
                        <a
                          key={tip.id}
                          href="/admin/tips"
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-700 transition-colors hover:bg-amber-100"
                        >
                          <span className="font-medium">{tip.title || "Untitled tip"}</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">No linked tips. Manage tips from the Tips page.</p>
                  )}
                </div>
              )}

              {/* Related Words */}
              {editingWord && (
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Related Words
                  </h4>

                  {isLoadingRelations ? (
                    <p className="text-sm text-gray-500">
                      Loading relationships...
                    </p>
                  ) : relatedWords.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {["compound", "grammar", "sentence"].map((type) => {
                        const typeWords = relatedWords.filter(
                          (r) => r.relationship_type === type
                        );
                        if (typeWords.length === 0) return null;
                        return (
                          <div key={type}>
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                              {type}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {typeWords.map((rel) => (
                                <span
                                  key={rel.relationship_id}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700"
                                >
                                  <span className="font-medium">
                                    {rel.headword}
                                  </span>
                                  <span className="text-blue-400">
                                    ({rel.english})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveRelation(rel.relationship_id)
                                    }
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
                    <p className="text-sm text-gray-500 mb-4">
                      No related words.
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <select
                      value={newRelationType}
                      onChange={(e) => setNewRelationType(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="compound">Compound</option>
                      <option value="grammar">Grammar</option>
                      <option value="sentence">Sentence</option>
                    </select>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={relationSearch}
                        onChange={(e) => setRelationSearch(e.target.value)}
                        placeholder="Search words to link..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {isSearchingRelations && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          Searching...
                        </span>
                      )}
                      {relationSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                          {relationSearchResults.map((word) => (
                            <button
                              key={word.id}
                              type="button"
                              onClick={() => handleAddRelation(word.id)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex justify-between items-center"
                            >
                              <span className="font-medium">
                                {word.headword}
                              </span>
                              <span className="text-gray-400">
                                {word.english}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* Tab: Memory Trigger                                           */}
          {/* ============================================================ */}
          {activeTab === "trigger" && (
            <div className="space-y-6">
              <AdminFormField
                label={formData.category === "fact" ? "Body" : "Trigger Text"}
                name="memory_trigger_text"
              >
                <BodyTextSyntaxHelp
                  defaultOpen={false}
                  variant={formData.category === "word" ? "word" : "multi"}
                />
                <BodyTextEditor
                  id="memory_trigger_text"
                  name="memory_trigger_text"
                  value={formData.memory_trigger_text}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      memory_trigger_text: v,
                    })
                  }
                  placeholder={
                    formData.category === "fact"
                      ? "Write the fact body content..."
                      : "Mnemonic or memory aid..."
                  }
                  rows={formData.category === "fact" ? 10 : 6}
                  variant={formData.category === "word" ? "word" : "multi"}
                />
              </AdminFormField>

              <div>
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
          )}

          {/* ============================================================ */}
          {/* Tab: Audio Files                                              */}
          {/* ============================================================ */}
          {activeTab === "audio" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          )}

          {/* ============================================================ */}
          {/* Tab: Lessons (optional)                                       */}
          {/* ============================================================ */}
          {activeTab === "lessons" && lessons && editingWord && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">
                Used in Lessons
              </h4>

              {wordLessons.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {wordLessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => navigateToLesson(lesson.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      title="Click to open in Lessons page"
                    >
                      {lesson.emoji && <span>{lesson.emoji}</span>}
                      #{lesson.number}: {lesson.title}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Not used in any lesson yet.
                </p>
              )}

              {/* Add to lesson */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select a lesson to add...</option>
                  {lessons
                    .filter(
                      (l) => !wordLessons.some((wl) => wl.id === l.id)
                    )
                    .sort((a, b) => a.number - b.number)
                    .map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        #{lesson.number}: {lesson.title}
                        {getCourseName && lesson.course_id
                          ? ` (${getCourseName(lesson.course_id)})`
                          : ""}
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  onClick={handleAddToLesson}
                  disabled={!selectedLessonId || isAddingToLesson}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isAddingToLesson ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "lessons" && lessons && !editingWord && (
            <p className="text-sm text-gray-500">
              Save the word first to manage lesson assignments.
            </p>
          )}
        </div>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Word"
        message={`Are you sure you want to delete "${editingWord?.headword}"? This will remove the word, its progress data, and all associated files. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isDeleting}
      />

    </>
  );
}
