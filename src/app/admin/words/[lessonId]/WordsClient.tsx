"use client";

import { useState, useEffect } from "react";
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
  AdminFileUpload,
} from "@/components/admin";
import { AdminAudioUpload } from "@/components/admin/AdminAudioUpload";
import {
  createWord,
  updateWord,
  deleteWord,
  reorderWords,
} from "@/lib/mutations/admin/words";
import {
  createSentence,
  deleteSentence,
} from "@/lib/mutations/admin/sentences";
import { uploadFileClient } from "@/lib/supabase/storage.client";
import { getFlagFromCode } from "@/lib/utils/flags";
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

interface WordsClientProps {
  lesson: Lesson;
  words: Word[];
}

interface FormData {
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

interface FormErrors {
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

export function WordsClient({ lesson, words }: WordsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [deletingWord, setDeletingWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
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
  const [errors, setErrors] = useState<FormErrors>({});
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

  // New sentence form
  const [showSentenceForm, setShowSentenceForm] = useState(false);
  const [newSentence, setNewSentence] = useState({
    foreign_sentence: "",
    english_sentence: "",
  });

  // Related words state
  const [relatedWords, setRelatedWords] = useState<RelatedWord[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [relationSearch, setRelationSearch] = useState("");
  const [relationSearchResults, setRelationSearchResults] = useState<{ id: string; headword: string; english: string }[]>([]);
  const [isSearchingRelations, setIsSearchingRelations] = useState(false);
  const [newRelationType, setNewRelationType] = useState("compound");

  // Fetch related words when editing word changes
  useEffect(() => {
    if (editingWord) {
      setIsLoadingRelations(true);
      getWordRelationships(editingWord.id)
        .then((result) => {
          if (!result.error) {
            setRelatedWords(result.relatedWords);
          }
        })
        .finally(() => setIsLoadingRelations(false));
    } else {
      setRelatedWords([]);
    }
  }, [editingWord?.id]);

  // Search for words to add as related
  useEffect(() => {
    if (!relationSearch.trim() || !editingWord) {
      setRelationSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRelations(true);
      const result = await searchWordsForRelationship(relationSearch, editingWord.id);
      if (!result.error) {
        // Filter out words already in relationships
        const existingIds = relatedWords.map(r => r.id);
        setRelationSearchResults(result.words.filter(w => !existingIds.includes(w.id)));
      }
      setIsSearchingRelations(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [relationSearch, editingWord?.id, relatedWords]);

  const handleAddRelation = async (relatedWordId: string) => {
    if (!editingWord) return;
    const result = await addWordRelationship(editingWord.id, relatedWordId, newRelationType);
    if (result.success) {
      // Refresh relationships
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
      setRelatedWords(relatedWords.filter(r => r.relationship_id !== relationshipId));
    } else {
      alert(result.error || "Failed to remove relationship");
    }
  };

  const resetForm = () => {
    setFormData({
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
    setErrors({});
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
    setRelatedWords([]);
    setRelationSearch("");
    setRelationSearchResults([]);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (word: Word) => {
    setEditingWord(word);
    setFormData({
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
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (word: Word) => {
    setDeletingWord(word);
    setIsDeleteModalOpen(true);
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

    setIsLoading(true);

    try {
      // Prepare base data
      const wordData: any = {
        headword: formData.headword,
        lemma: formData.lemma || formData.headword, // Default lemma to headword
        english: formData.english,
        category: formData.category || null,
        part_of_speech: formData.category === "word" ? (formData.part_of_speech || null) : null,
        gender: formData.gender || null,
        transitivity: formData.transitivity || null,
        is_irregular: formData.is_irregular,
        grammatical_number: formData.grammatical_number || null,
        notes: formData.notes || null,
        admin_notes: formData.admin_notes || null,
        memory_trigger_text: formData.memory_trigger_text || null,
      };

      // Get the word ID (for uploads)
      let wordId = editingWord?.id;

      if (editingWord) {
        // Update word first
        const result = await updateWord(editingWord.id, wordData, lesson.id);
        if (!result.success) {
          setErrors({ headword: result.error || "Failed to update word" });
          return;
        }
      } else {
        // Create word first
        const result = await createWord({
          lesson_id: lesson.id,
          ...wordData,
        });
        if (!result.success || !result.id) {
          setErrors({ headword: result.error || "Failed to create word" });
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

      setIsModalOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
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

      if (result.success) {
        setNewSentence({ foreign_sentence: "", english_sentence: "" });
        setShowSentenceForm(false);
        router.refresh();
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
      router.refresh();
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
              Lesson #{lesson.number}: {lesson.title}
            </h1>
            <p className="mt-1 text-gray-600">
              {getFlagFromCode(lesson.course?.language?.code)} {lesson.course?.name} &middot;{" "}
              {words.length} word{words.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Word
          </Button>
        </div>
      </div>

      {/* Words List */}
      <div className="rounded-xl border border-gray-200 bg-white">
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
          <tbody className="divide-y divide-gray-200">
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

      {/* Create/Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
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
              label={`Headword (${lesson.course?.language?.name || "Foreign"})`}
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

          <div className="grid grid-cols-2 gap-4">
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

            {formData.category === "word" && (
              <AdminFormField label="Part of Speech" name="part_of_speech">
                <AdminSelect
                  id="part_of_speech"
                  name="part_of_speech"
                  value={formData.part_of_speech}
                  onChange={(e) =>
                    setFormData({ ...formData, part_of_speech: e.target.value })
                  }
                  options={partOfSpeechOptions}
                />
              </AdminFormField>
            )}
          </div>

          {/* Lexical Metadata - shown conditionally based on POS */}
          <div className="grid grid-cols-2 gap-4">
            {(formData.part_of_speech === "noun" || formData.part_of_speech === "adjective") && (
              <AdminFormField 
                label="Gender" 
                name="gender"
                hint="For nouns and adjectives"
              >
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

            {formData.part_of_speech === "verb" && (
              <AdminFormField 
                label="Transitivity" 
                name="transitivity"
                hint="For verbs only"
              >
                <AdminSelect
                  id="transitivity"
                  name="transitivity"
                  value={formData.transitivity}
                  onChange={(e) =>
                    setFormData({ ...formData, transitivity: e.target.value })
                  }
                  options={transitivityOptions}
                />
              </AdminFormField>
            )}
          </div>

          {/* Boolean flags - only show for specific word types */}
          {formData.category === "word" && (formData.part_of_speech === "verb" || ["noun", "article", "adjective_noun"].includes(formData.part_of_speech)) && (
            <div className="flex gap-6">
              {formData.part_of_speech === "verb" && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.is_irregular}
                    onChange={(e) =>
                      setFormData({ ...formData, is_irregular: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Irregular verb</span>
                </label>
              )}

              {["noun", "article", "adjective_noun"].includes(formData.part_of_speech) && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.grammatical_number === "pl"}
                    onChange={(e) =>
                      setFormData({ ...formData, grammatical_number: e.target.checked ? "pl" : "sg" })
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
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
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
                value={formData.memory_trigger_text}
                onChange={(e) =>
                  setFormData({ ...formData, memory_trigger_text: e.target.value })
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

              {/* Existing sentences */}
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

              {/* New sentence form */}
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

          {/* Related Words */}
          {editingWord && (
            <div className="border-t pt-4">
              <h3 className="mb-3 font-medium text-gray-900 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Related Words
              </h3>

              {isLoadingRelations ? (
                <p className="text-sm text-gray-500">Loading relationships...</p>
              ) : relatedWords.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {/* Group by relationship type */}
                  {["compound", "grammar", "sentence"].map((type) => {
                    const typeWords = relatedWords.filter(r => r.relationship_type === type);
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
                                onClick={() => handleRemoveRelation(rel.relationship_id)}
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
                <p className="text-sm text-gray-500 mb-4">No related words.</p>
              )}

              {/* Add new relationship */}
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
                value={formData.admin_notes}
                onChange={(e) =>
                  setFormData({ ...formData, admin_notes: e.target.value })
                }
                placeholder="Private notes for administrators only..."
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
