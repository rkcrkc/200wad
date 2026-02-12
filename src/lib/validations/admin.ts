/**
 * Validation schemas for admin content management
 * Uses Zod for type-safe validation
 */

import { z } from "zod";

// ============================================================================
// LANGUAGE SCHEMAS
// ============================================================================

export const createLanguageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  native_name: z.string().min(1, "Native name is required").max(100),
  code: z.string().min(2, "Code is required").max(3).regex(/^[a-z]{2,3}$/, "Code must be 2-3 lowercase letters"),
  sort_order: z.number().int().min(0).optional().default(0),
});

export const updateLanguageSchema = createLanguageSchema.partial();

export type CreateLanguageInput = z.input<typeof createLanguageSchema>;
export type UpdateLanguageInput = z.input<typeof updateLanguageSchema>;

// ============================================================================
// COURSE SCHEMAS
// ============================================================================

export const createCourseSchema = z.object({
  language_id: z.string().uuid("Invalid language ID"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional().nullable(),
  cefr_range: z.string().max(20).optional().nullable(),
  free_lessons: z.number().int().min(0).optional().default(10),
  price_cents: z.number().int().min(0).optional().default(5000),
  sort_order: z.number().int().min(0).optional().default(0),
  is_published: z.boolean().optional().default(false),
});

export const updateCourseSchema = createCourseSchema.partial().omit({ language_id: true });

export type CreateCourseInput = z.input<typeof createCourseSchema>;
export type UpdateCourseInput = z.input<typeof updateCourseSchema>;

// ============================================================================
// LESSON SCHEMAS
// ============================================================================

export const createLessonSchema = z.object({
  course_id: z.string().uuid("Invalid course ID"),
  number: z.number().int().min(1, "Lesson number must be at least 1"),
  title: z.string().min(1, "Title is required").max(200),
  emoji: z.string().max(10).optional().nullable(),
  sort_order: z.number().int().min(0).optional().default(0),
  is_published: z.boolean().optional().default(false),
});

export const updateLessonSchema = createLessonSchema.partial().omit({ course_id: true });

export type CreateLessonInput = z.input<typeof createLessonSchema>;
export type UpdateLessonInput = z.input<typeof updateLessonSchema>;

// ============================================================================
// WORD SCHEMAS
// ============================================================================

export const createWordSchema = z.object({
  lesson_id: z.string().uuid("Invalid lesson ID"),
  headword: z.string().min(1, "Headword is required").max(200),
  lemma: z.string().max(200).optional().nullable(), // Defaults to headword if not provided
  english: z.string().min(1, "English translation is required").max(200),
  category: z.enum(["word", "phrase", "sentence", "fact", "information"]).optional().nullable(),
  part_of_speech: z.string().max(50).optional().nullable(),
  gender: z.enum(["m", "f", "n", "mf"]).optional().nullable(),
  transitivity: z.enum(["vt", "vi", "vt_vi"]).optional().nullable(),
  is_irregular: z.boolean().optional().default(false),
  grammatical_number: z.enum(["sg", "pl"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  memory_trigger_text: z.string().max(2000).optional().nullable(),
  memory_trigger_image_url: z.string().url().optional().nullable(),
  audio_url_english: z.string().url().optional().nullable(),
  audio_url_foreign: z.string().url().optional().nullable(),
  audio_url_trigger: z.string().url().optional().nullable(),
  related_word_ids: z.array(z.string().uuid()).optional().default([]),
  sort_order: z.number().int().min(0).optional().default(0),
});

export const updateWordSchema = createWordSchema.partial().omit({ lesson_id: true });

export type CreateWordInput = z.input<typeof createWordSchema>;
export type UpdateWordInput = z.input<typeof updateWordSchema>;

// ============================================================================
// EXAMPLE SENTENCE SCHEMAS
// ============================================================================

export const createSentenceSchema = z.object({
  word_id: z.string().uuid("Invalid word ID"),
  foreign_sentence: z.string().min(1, "Foreign sentence is required").max(500),
  english_sentence: z.string().min(1, "English sentence is required").max(500),
  thumbnail_image_url: z.string().url().optional().nullable(),
  sort_order: z.number().int().min(0).optional().default(0),
});

export const updateSentenceSchema = createSentenceSchema.partial().omit({ word_id: true });

export type CreateSentenceInput = z.input<typeof createSentenceSchema>;
export type UpdateSentenceInput = z.input<typeof updateSentenceSchema>;

// ============================================================================
// REORDER SCHEMA
// ============================================================================

export const reorderSchema = z.object({
  parentId: z.string().uuid("Invalid parent ID"),
  orderedIds: z.array(z.string().uuid()).min(1, "At least one ID required"),
});

export type ReorderInput = z.infer<typeof reorderSchema>;

// ============================================================================
// PUBLISH SCHEMA
// ============================================================================

export const publishSchema = z.object({
  id: z.string().uuid("Invalid ID"),
  is_published: z.boolean(),
});

export type PublishInput = z.infer<typeof publishSchema>;
