"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
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
  AdminFileUpload,
} from "@/components/admin";
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

interface Language {
  id: string;
  name: string;
  flag: string;
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
  english: string;
  foreign_word: string;
  part_of_speech: string | null;
  notes: string | null;
  memory_trigger_text: string | null;
  memory_trigger_image_url: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  related_word_ids: string[] | null;
  sort_order: number | null;
  example_sentences: ExampleSentence[];
}

interface WordsClientProps {
  lesson: Lesson;
  words: Word[];
}

interface FormData {
  english: string;
  foreign_word: string;
  part_of_speech: string;
  notes: string;
  memory_trigger_text: string;
}

interface FormErrors {
  english?: string;
  foreign_word?: string;
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

export function WordsClient({ lesson, words }: WordsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [deletingWord, setDeletingWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    english: "",
    foreign_word: "",
    part_of_speech: "",
    notes: "",
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

  const resetForm = () => {
    setFormData({
      english: "",
      foreign_word: "",
      part_of_speech: "",
      notes: "",
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
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (word: Word) => {
    setEditingWord(word);
    setFormData({
      english: word.english,
      foreign_word: word.foreign_word,
      part_of_speech: word.part_of_speech || "",
      notes: word.notes || "",
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

    if (!formData.english.trim()) {
      newErrors.english = "English word is required";
    }
    if (!formData.foreign_word.trim()) {
      newErrors.foreign_word = "Foreign word is required";
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
        english: formData.english,
        foreign_word: formData.foreign_word,
        part_of_speech: formData.part_of_speech || null,
        notes: formData.notes || null,
        memory_trigger_text: formData.memory_trigger_text || null,
      };

      // Get the word ID (for uploads)
      let wordId = editingWord?.id;

      if (editingWord) {
        // Update word first
        const result = await updateWord(editingWord.id, wordData);
        if (!result.success) {
          setErrors({ english: result.error || "Failed to update word" });
          return;
        }
      } else {
        // Create word first
        const result = await createWord({
          lesson_id: lesson.id,
          ...wordData,
        });
        if (!result.success || !result.id) {
          setErrors({ english: result.error || "Failed to create word" });
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
              {lesson.course?.language?.flag} {lesson.course?.name} &middot;{" "}
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
                  <td className="px-6 py-4 text-gray-600">
                    {word.foreign_word}
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
                placeholder="e.g., hello"
                error={!!errors.english}
              />
            </AdminFormField>

            <AdminFormField
              label={lesson.course?.language?.name || "Foreign Word"}
              name="foreign_word"
              required
              error={errors.foreign_word}
            >
              <AdminInput
                id="foreign_word"
                name="foreign_word"
                value={formData.foreign_word}
                onChange={(e) =>
                  setFormData({ ...formData, foreign_word: e.target.value })
                }
                placeholder="e.g., ciao"
                error={!!errors.foreign_word}
              />
            </AdminFormField>
          </div>

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

          <AdminFormField label="Notes" name="notes">
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
        message={`Are you sure you want to delete "${deletingWord?.english}"? This will also delete all example sentences.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />
    </div>
  );
}
