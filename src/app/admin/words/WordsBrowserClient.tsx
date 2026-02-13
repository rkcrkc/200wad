"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Book, ChevronRight, Plus, ExternalLink, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
  AdminFileUpload,
  AdminPagination,
} from "@/components/admin";
import { AdminAudioUpload } from "@/components/admin/AdminAudioUpload";
import { updateWord, addWordToLesson } from "@/lib/mutations/admin/words";
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
  created_at: string | null;
  language: Language | null;
  lessons: LessonInfo[];
}

interface LessonOption {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

interface WordsBrowserClientProps {
  languages: Language[];
  courses: Course[];
  lessons: LessonOption[];
  words: WordWithLessons[];
  totalCount: number;
  totalWords: number;
  letterCounts: Record<string, number>;
  currentLetter: string;
  currentPage: number;
  pageSize: number;
  languageId: string;
  courseId: string;
  searchQuery: string;
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
  general?: string;
}

interface FileUploads {
  triggerImage: File | null;
  audioEnglish: File | null;
  audioForeign: File | null;
  audioTrigger: File | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

export function WordsBrowserClient({
  languages,
  courses,
  lessons,
  words,
  totalCount,
  totalWords,
  letterCounts,
  currentLetter,
  currentPage,
  pageSize,
  languageId,
  courseId,
  searchQuery,
}: WordsBrowserClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local search input state (for debouncing)
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordWithLessons | null>(null);
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

  // Add to lesson state
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [isAddingToLesson, setIsAddingToLesson] = useState(false);

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

  // Build URL with updated params
  const buildUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    return `/admin/words?${params.toString()}`;
  };

  // Navigation handlers
  const handleLetterChange = (letter: string) => {
    router.push(buildUrl({ letter, page: "1", search: undefined }));
  };

  const handlePageChange = (page: number) => {
    router.push(buildUrl({ page: page.toString() }));
  };

  const handleLanguageChange = (langId: string) => {
    router.push(buildUrl({ language: langId || undefined, course: undefined, page: "1" }));
  };

  const handleCourseChange = (crsId: string) => {
    router.push(buildUrl({ course: crsId || undefined, page: "1" }));
  };

  const handleSearch = () => {
    if (localSearch.trim()) {
      router.push(buildUrl({ search: localSearch.trim(), page: "1" }));
    } else {
      router.push(buildUrl({ search: undefined, page: "1" }));
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setLocalSearch("");
    router.push(buildUrl({ search: undefined, page: "1" }));
  };

  // Filter courses by language
  const filteredCourses = languageId
    ? courses.filter((c) => c.language_id === languageId)
    : courses;

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);

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
    setSelectedLessonId("");
    setRelatedWords([]);
    setRelationSearch("");
    setRelationSearchResults([]);
  };

  const handleAddToLesson = async () => {
    if (!editingWord || !selectedLessonId) return;

    setIsAddingToLesson(true);
    try {
      const result = await addWordToLesson(editingWord.id, selectedLessonId);
      if (result.success) {
        // Refresh to update the lesson list
        router.refresh();
        setSelectedLessonId("");
        // Update local state to show the new lesson
        const addedLesson = lessons.find((l) => l.id === selectedLessonId);
        if (addedLesson && editingWord) {
          setEditingWord({
            ...editingWord,
            lessons: [...editingWord.lessons, addedLesson],
          });
        }
      } else {
        alert(result.error || "Failed to add word to lesson");
      }
    } finally {
      setIsAddingToLesson(false);
    }
  };

  const navigateToLesson = (lessonId: string) => {
    setIsEditModalOpen(false);
    resetForm();
    router.push(`/admin/lessons?lesson=${lessonId}`);
  };

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

  const openEditModal = (word: WordWithLessons) => {
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
      const wordData: Record<string, unknown> = {
        headword: formData.headword,
        lemma: formData.lemma || formData.headword,
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

      // Update word
      const result = await updateWord(editingWord.id, wordData);
      if (!result.success) {
        setErrors({ general: result.error || "Failed to update word" });
        return;
      }

      // Handle file uploads
      const uploadPromises: Promise<unknown>[] = [];

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
          Browse all vocabulary words across courses. {totalWords} total words.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">
            Language:
          </label>
          <select
            value={languageId}
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
            value={courseId}
            onChange={(e) => handleCourseChange(e.target.value)}
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
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search words..."
              className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button size="sm" onClick={handleSearch}>
            Search
          </Button>
          {searchQuery && (
            <Button size="sm" variant="outline" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Alphabet Tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {ALPHABET.map((letter) => {
          const count = letterCounts[letter] || 0;
          const isSelected = currentLetter === letter && !searchQuery;
          return (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              disabled={count === 0}
              className={`min-w-[36px] rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-white"
                  : count === 0
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={`${count} words`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Pagination Controls (Top) */}
      <div className="mb-4">
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemLabel="words"
          onPageChange={handlePageChange}
        />
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        Showing {words.length} of {totalCount} words
        {currentLetter && !searchQuery && ` starting with "${currentLetter}"`}
        {searchQuery && ` matching "${searchQuery}"`}
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
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {words.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {totalWords === 0 ? (
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
              words.map((word) => (
                <tr
                  key={word.id}
                  onClick={() => openEditModal(word)}
                  className="cursor-pointer hover:bg-gray-50"
                >
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
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (Bottom) */}
      <div className="mt-4">
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemLabel="words"
          onPageChange={handlePageChange}
        />
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
          {/* General Error */}
          {errors.general && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {errors.general}
            </div>
          )}

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

          {/* Boolean flags - only show for words */}
          {formData.category === "word" && (
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

          {/* Lessons info */}
          {editingWord && (
            <div className="border-t pt-4">
              <h3 className="mb-3 font-medium text-gray-900">Used in Lessons</h3>

              {editingWord.lessons.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {editingWord.lessons.map((lesson) => (
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
                <p className="text-sm text-gray-500 mb-4">Not used in any lesson yet.</p>
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
                    .filter((l) => !editingWord.lessons.some((wl) => wl.id === l.id))
                    .sort((a, b) => a.number - b.number)
                    .map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        #{lesson.number}: {lesson.title} ({getCourseName(lesson.course_id)})
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
    </div>
  );
}
