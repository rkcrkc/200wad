"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Book, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
  AdminFileUpload,
} from "@/components/admin";
import { updateWord } from "@/lib/mutations/admin/words";
import { uploadFileClient } from "@/lib/supabase/storage.client";
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

interface LessonInfo {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

interface WordWithLessons {
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
  created_at: string | null;
  language: Language | null;
  lessons: LessonInfo[];
}

interface WordsBrowserClientProps {
  languages: Language[];
  courses: Course[];
  words: WordWithLessons[];
}

interface FormData {
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

export function WordsBrowserClient({
  languages,
  courses,
  words,
}: WordsBrowserClientProps) {
  const router = useRouter();
  const [filterLanguageId, setFilterLanguageId] = useState<string>("");
  const [filterCourseId, setFilterCourseId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordWithLessons | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
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

  // Filter courses by language
  const filteredCourses = useMemo(() => {
    if (!filterLanguageId) return courses;
    return courses.filter((c) => c.language_id === filterLanguageId);
  }, [courses, filterLanguageId]);

  // Filter and search words
  const filteredWords = useMemo(() => {
    let result = words;

    // Filter by language
    if (filterLanguageId) {
      result = result.filter((w) => w.language_id === filterLanguageId);
    }

    // Filter by course (words that are in at least one lesson of the selected course)
    if (filterCourseId) {
      result = result.filter((w) =>
        w.lessons.some((l) => l.course_id === filterCourseId)
      );
    }

    // Search by headword or english
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.headword.toLowerCase().includes(query) ||
          w.english.toLowerCase().includes(query) ||
          w.lemma.toLowerCase().includes(query)
      );
    }

    return result;
  }, [words, filterLanguageId, filterCourseId, searchQuery]);

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

  // Get course name for a lesson
  const getCourseName = (courseId: string | null) => {
    if (!courseId) return "";
    const course = courses.find((c) => c.id === courseId);
    return course?.name || "";
  };

  const resetForm = () => {
    setFormData({
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
  };

  const openEditModal = (word: WordWithLessons) => {
    setEditingWord(word);
    setFormData({
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
    setErrors({});
    setIsEditModalOpen(true);
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
    if (!validateForm() || !editingWord) return;

    setIsLoading(true);

    try {
      // Prepare base data
      const wordData: any = {
        headword: formData.headword,
        lemma: formData.lemma || formData.headword,
        english: formData.english,
        part_of_speech: formData.part_of_speech || null,
        gender: formData.gender || null,
        transitivity: formData.transitivity || null,
        is_irregular: formData.is_irregular,
        grammatical_number: formData.grammatical_number || null,
        notes: formData.notes || null,
        memory_trigger_text: formData.memory_trigger_text || null,
      };

      // Update word
      const result = await updateWord(editingWord.id, wordData);
      if (!result.success) {
        setErrors({ headword: result.error || "Failed to update word" });
        return;
      }

      // Handle file uploads
      const uploadPromises: Promise<any>[] = [];

      if (fileUploads.triggerImage) {
        uploadPromises.push(
          uploadFileClient("images", fileUploads.triggerImage, "words", editingWord.id, "trigger")
            .then((res) => {
              if (res.url) {
                return updateWord(editingWord.id, { memory_trigger_image_url: res.url });
              }
            })
        );
      }

      if (fileUploads.audioEnglish) {
        uploadPromises.push(
          uploadFileClient("audio", fileUploads.audioEnglish, "words", editingWord.id, "english")
            .then((res) => {
              if (res.url) {
                return updateWord(editingWord.id, { audio_url_english: res.url });
              }
            })
        );
      }

      if (fileUploads.audioForeign) {
        uploadPromises.push(
          uploadFileClient("audio", fileUploads.audioForeign, "words", editingWord.id, "foreign")
            .then((res) => {
              if (res.url) {
                return updateWord(editingWord.id, { audio_url_foreign: res.url });
              }
            })
        );
      }

      if (fileUploads.audioTrigger) {
        uploadPromises.push(
          uploadFileClient("audio", fileUploads.audioTrigger, "words", editingWord.id, "trigger")
            .then((res) => {
              if (res.url) {
                return updateWord(editingWord.id, { audio_url_trigger: res.url });
              }
            })
        );
      }

      await Promise.all(uploadPromises);

      setIsEditModalOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Words</h1>
        <p className="mt-1 text-gray-600">
          Browse all vocabulary words across courses. {words.length} total words.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Search:</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words..."
              className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        Showing {filteredWords.length} of {words.length} words
      </p>

      {/* Words Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Headword
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                English
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Lessons
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredWords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {words.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <Book className="h-8 w-8 text-gray-300" />
                      <p>No words yet. Add words through the Lessons page.</p>
                    </div>
                  ) : (
                    "No words match the current filters."
                  )}
                </td>
              </tr>
            ) : (
              filteredWords.map((word) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{word.headword}</div>
                    {word.lemma !== word.headword && (
                      <div className="text-xs text-gray-400">lemma: {word.lemma}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{word.english}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      {getFlagFromCode(word.language?.code)}
                      {word.language?.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-col gap-0.5">
                      <span className="capitalize">{word.part_of_speech || "-"}</span>
                      {word.gender && (
                        <span className="text-xs text-gray-400">
                          {word.gender === "m" ? "masc" : word.gender === "f" ? "fem" : word.gender === "n" ? "neut" : "m/f"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {word.lessons.length === 0 ? (
                      <span className="text-sm text-gray-400">Not in any lesson</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {word.lessons.map((lesson) => (
                          <span
                            key={lesson.id}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                            title={`${getCourseName(lesson.course_id)} - Lesson #${lesson.number}: ${lesson.title}`}
                          >
                            {lesson.emoji && <span>{lesson.emoji}</span>}
                            #{lesson.number}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(word)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Word"
        description="Update the word details and media."
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <AdminFormField
              label={`Headword (${editingWord?.language?.name || "Foreign"})`}
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

          {/* Boolean flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.is_irregular}
                onChange={(e) =>
                  setFormData({ ...formData, is_irregular: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Irregular form</span>
            </label>

            {formData.part_of_speech === "noun" && (
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

          {/* Lessons info */}
          {editingWord && editingWord.lessons.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-3 font-medium text-gray-900">Used in Lessons</h3>
              <div className="flex flex-wrap gap-2">
                {editingWord.lessons.map((lesson) => (
                  <span
                    key={lesson.id}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {lesson.emoji && <span>{lesson.emoji}</span>}
                    #{lesson.number}: {lesson.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminModal>
    </div>
  );
}
