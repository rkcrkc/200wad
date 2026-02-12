#!/usr/bin/env npx tsx
/**
 * Import legacy DaneL (DL) database into NormanLaw (NL) Supabase database
 *
 * Usage:
 *   npx tsx scripts/import-legacy-database.ts --language italian --data-dir /path/to/csv/files
 *
 * Required CSV files in data-dir:
 *   - Products.csv (courses)
 *   - Sections.csv (lessons)
 *   - General.csv (words)
 *   - Gender.csv (word attribute codes)
 *   - 200w_lexical_code_mapping.csv (gender code to NL column mapping)
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

// Load env vars from .env.local if running locally
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

// Parse CLI arguments
function getArg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const languageNameArg = getArg("language");
const dataDirArg = getArg("data-dir");
const skipWords = hasFlag("skip-words");
const skipRelationships = hasFlag("skip-relationships");
const dryRun = hasFlag("dry-run");

if (!languageNameArg || !dataDirArg) {
  console.error("Usage: npx tsx scripts/import-legacy-database.ts --language <name> --data-dir <path>");
  console.error("");
  console.error("Options:");
  console.error("  --language <name>    Language name (e.g., 'italian')");
  console.error("  --data-dir <path>    Directory containing CSV files");
  console.error("  --skip-words         Skip word import (only update courses/lessons)");
  console.error("  --skip-relationships Skip relationship resolution");
  console.error("  --dry-run            Parse and validate without writing to database");
  console.error("");
  console.error("Example:");
  console.error("  npx tsx scripts/import-legacy-database.ts --language italian --data-dir './DB IMPORT'");
  process.exit(1);
}

const languageName: string = languageNameArg;
const dataDir: string = dataDirArg;

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

// ============================================================================
// Types
// ============================================================================

interface Product {
  Ref: string;
  Product: string;
}

interface Section {
  Course: string;
  Lesson: string;
  Section: string;
  Pointer: string;
}

interface GenderCodeMapping {
  Code: string;
  language: string;
  category: string;
  part_of_speech: string;
  gender: string;
  grammatical_number: string;
  transitivity: string;
  is_irregular: string;
  phrase_type: string;
  tags: string;
}

interface GeneralRow {
  // New NL columns (pre-mapped in CSV)
  english: string;
  headword: string;
  notes: string;
  memory_trigger_text: string;
  memory_trigger_image: string;
  audio_url_english: string;
  audio_url_foreign: string;
  audio_url_trigger: string;
  lemma: string;
  lesson_id: string;
  old_gender: string;
  // Legacy DL columns
  Course: string;
  Lesson: string;
  RefN: string;
  Gender: string;
  FgnDictionary: string;
  FileFgnPic: string;
  FilePSuffix: string;
  FileEngSouRTF: string;
  FileFgnSouRTF: string;
  FileFgnTrigger: string;
  FlagFalseFriends: string;
  CompoundRef1N: string;
  CompoundRef2N: string;
  LinkN: string;
  MiniLinkN: string;
  English: string;
  ForeignRTF: string;
  Notes: string;
  Trigger: string;
  Queries: string;
}

interface WordInsert {
  language_id: string;
  english: string;
  headword: string;
  lemma: string;
  notes: string | null;
  memory_trigger_text: string | null;
  memory_trigger_image_url: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  part_of_speech: string | null;
  gender: string | null;
  grammatical_number: string | null;
  transitivity: string | null;
  is_irregular: boolean | null;
  category: string;
  phrase_type: string | null;
  tags: string[] | null;
  is_false_friend: boolean;
  legacy_refn: number;
  legacy_gender_code: string | null;
  legacy_image_suffix: string | null;
}

interface RelationshipStaging {
  word_legacy_refn: number;
  related_legacy_refn: number;
  relationship_type: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function readCsv<T>(filePath: string): T[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as T[];
}

/**
 * Clean lemma value by removing grammar markers like ",m.", ",f.", etc.
 * Examples:
 *   "segno,m." -> "segno"
 *   "casa,f." -> "casa"
 *   "bello,adj." -> "bello"
 */
function cleanLemma(rawLemma: string): string {
  if (!rawLemma) return "";

  // Remove common grammar suffixes
  let cleaned = rawLemma
    .replace(/,\s*(m\.|f\.|n\.|adj\.|adv\.|v\.|prep\.|conj\.|art\.|prn\.|num\.|exc\.|phr\.).*$/i, "")
    .replace(/\s*\(m\.\)|\s*\(f\.\)|\s*\(n\.\)|\s*\(pl\.\)/gi, "")
    .trim();

  // If still has trailing comma and abbreviation, try more aggressive cleanup
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts.length > 1 && parts[parts.length - 1].trim().length <= 5) {
      cleaned = parts.slice(0, -1).join(",").trim();
    }
  }

  return cleaned;
}

/**
 * Parse tags string into array
 * "tag1, tag2" -> ["tag1", "tag2"]
 */
function parseTags(tagsStr: string): string[] {
  if (!tagsStr) return [];
  return tagsStr.split(",").map(t => t.trim()).filter(t => t.length > 0);
}

/**
 * Safely parse integer, return null if invalid
 */
function safeParseInt(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extract clean filename from legacy file reference
 */
function cleanFilename(filename: string): string | null {
  if (!filename || filename.trim() === "") return null;
  // Remove any path components, keep just the filename
  return filename.trim().replace(/^.*[\\\/]/, "");
}

// ============================================================================
// Main Import Logic
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Legacy Database Import");
  console.log("=".repeat(60));
  console.log(`Language: ${languageName}`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Dry run: ${dryRun}`);
  console.log("");

  // -------------------------------------------------------------------------
  // Step 1: Find the language in NL database
  // -------------------------------------------------------------------------
  console.log("Step 1: Finding language...");

  const { data: language, error: langError } = await supabase
    .from("languages")
    .select("id, name")
    .ilike("name", languageName)
    .single();

  if (langError || !language) {
    console.error(`Language '${languageName}' not found in database`);
    process.exit(1);
  }

  console.log(`  Found: ${language.name} (${language.id})`);

  // -------------------------------------------------------------------------
  // Step 2: Load and parse CSV files
  // -------------------------------------------------------------------------
  console.log("\nStep 2: Loading CSV files...");

  const productsPath = path.join(dataDir, "Products.csv");
  const sectionsPath = path.join(dataDir, "Sections.csv");
  const generalPath = path.join(dataDir, "General.csv");
  const mappingPath = path.join(dataDir, "200w_lexical_code_mapping.csv");

  const products = readCsv<Product>(productsPath);
  console.log(`  Products.csv: ${products.length} courses`);

  const sections = readCsv<Section>(sectionsPath);
  console.log(`  Sections.csv: ${sections.length} lessons`);

  const genderMapping = readCsv<GenderCodeMapping>(mappingPath);
  console.log(`  200w_lexical_code_mapping.csv: ${genderMapping.length} codes`);

  // Build gender code lookup map
  const genderCodeMap = new Map<string, GenderCodeMapping>();
  for (const mapping of genderMapping) {
    genderCodeMap.set(mapping.Code, mapping);
  }

  // Build valid course refs set from Products
  const validCourseRefs = new Set(products.map(p => parseInt(p.Ref, 10)));
  console.log(`  Valid course refs: ${Array.from(validCourseRefs).join(", ")}`);

  // Helper function to derive correct course from lesson ID
  // Lesson IDs encode course: 1-999 = Course 1, 21xxx = Course 21, 41xxxxx = Course 41, etc.
  function deriveCourseFromLesson(lessonId: number): number | null {
    if (lessonId <= 0) return null;
    if (lessonId < 1000) return 1; // Lessons 1-999 belong to Course 1

    // Try to extract course from first 2 digits
    const str = lessonId.toString();
    if (str.length >= 2) {
      const prefix2 = parseInt(str.substring(0, 2), 10);
      if (validCourseRefs.has(prefix2)) return prefix2;
    }

    // Try first digit for single-digit courses
    if (str.length >= 1) {
      const prefix1 = parseInt(str.substring(0, 1), 10);
      if (validCourseRefs.has(prefix1)) return prefix1;
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Step 3: Create/Update courses with legacy_ref
  // -------------------------------------------------------------------------
  console.log("\nStep 3: Creating/Updating courses...");

  // Get existing courses for this language
  const { data: existingCourses, error: coursesError } = await supabase
    .from("courses")
    .select("id, name, legacy_ref")
    .eq("language_id", language.id);

  if (coursesError) {
    console.error("Error fetching courses:", coursesError);
    process.exit(1);
  }

  // Match or create courses
  let coursesUpdated = 0;
  let coursesCreated = 0;
  for (const product of products) {
    const legacyRef = parseInt(product.Ref, 10);
    const productName = product.Product.trim();

    // Find matching course by name (case-insensitive partial match) or by legacy_ref
    const matchingCourse = existingCourses?.find(c =>
      c.legacy_ref === legacyRef ||
      c.name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (matchingCourse) {
      if (!dryRun) {
        const { error } = await supabase
          .from("courses")
          .update({ legacy_ref: legacyRef })
          .eq("id", matchingCourse.id);

        if (error) {
          console.error(`  Error updating course ${matchingCourse.name}:`, error);
        } else {
          coursesUpdated++;
          console.log(`  Updated: ${matchingCourse.name} -> legacy_ref=${legacyRef}`);
        }
      } else {
        console.log(`  [DRY RUN] Would update: ${matchingCourse.name} -> legacy_ref=${legacyRef}`);
        coursesUpdated++;
      }
    } else {
      // Create new course
      if (!dryRun) {
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert({
            name: productName,
            language_id: language.id,
            legacy_ref: legacyRef,
            is_published: true,
            sort_order: legacyRef,
          })
          .select("id, name")
          .single();

        if (error) {
          console.error(`  Error creating course "${productName}":`, error);
        } else {
          coursesCreated++;
          console.log(`  Created: ${newCourse.name} (legacy_ref=${legacyRef})`);
          // Add to existing courses array for later reference
          existingCourses?.push({ id: newCourse.id, name: newCourse.name, legacy_ref: legacyRef });
        }
      } else {
        console.log(`  [DRY RUN] Would create: ${productName} (legacy_ref=${legacyRef})`);
        coursesCreated++;
      }
    }
  }
  console.log(`  Courses updated: ${coursesUpdated}`);
  console.log(`  Courses created: ${coursesCreated}`);

  // Build course ref -> UUID map
  const { data: coursesWithLegacy } = await supabase
    .from("courses")
    .select("id, legacy_ref")
    .eq("language_id", language.id)
    .not("legacy_ref", "is", null);

  const courseRefToId = new Map<number, string>();
  for (const course of coursesWithLegacy || []) {
    if (course.legacy_ref !== null) {
      courseRefToId.set(course.legacy_ref, course.id);
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Create/Update lessons with legacy_lesson_id
  // -------------------------------------------------------------------------
  console.log("\nStep 4: Creating/Updating lessons...");

  // Get all lessons for courses in this language
  const courseIds = Array.from(courseRefToId.values());
  const { data: existingLessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, course_id, legacy_lesson_id, number")
    .in("course_id", courseIds);

  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError);
    process.exit(1);
  }

  // Build lesson lookup by course_id and legacy_lesson_id, and by title
  const lessonByLegacyId = new Map<string, typeof existingLessons[0]>();
  const lessonByTitle = new Map<string, typeof existingLessons[0]>();
  for (const lesson of existingLessons || []) {
    if (lesson.legacy_lesson_id !== null) {
      const key = `${lesson.course_id}:${lesson.legacy_lesson_id}`;
      lessonByLegacyId.set(key, lesson);
    }
    const titleKey = `${lesson.course_id}:${lesson.title.toLowerCase().trim()}`;
    lessonByTitle.set(titleKey, lesson);
  }

  // Track highest lesson number per course for new lessons
  const maxLessonNumber = new Map<string, number>();
  for (const lesson of existingLessons || []) {
    if (lesson.course_id) {
      const current = maxLessonNumber.get(lesson.course_id) || 0;
      maxLessonNumber.set(lesson.course_id, Math.max(current, lesson.number));
    }
  }

  let lessonsUpdated = 0;
  let lessonsCreated = 0;
  let lessonsSkipped = 0;

  // Batch lessons to create
  const lessonsToCreate: { course_id: string; title: string; legacy_lesson_id: number; number: number; sort_order: number }[] = [];

  for (const section of sections) {
    const lessonLegacyId = parseInt(section.Lesson, 10);
    const pointer = parseInt(section.Pointer, 10);

    // Skip if Pointer = -1
    if (pointer === -1) {
      lessonsSkipped++;
      continue;
    }

    // Derive correct course from lesson ID (not from CSV Course column which may be wrong)
    const derivedCourseRef = deriveCourseFromLesson(lessonLegacyId);
    if (!derivedCourseRef || !validCourseRefs.has(derivedCourseRef)) {
      lessonsSkipped++;
      continue;
    }

    const courseUuid = courseRefToId.get(derivedCourseRef);
    if (!courseUuid) {
      lessonsSkipped++;
      continue;
    }

    // Check if lesson already exists by legacy_lesson_id
    const legacyKey = `${courseUuid}:${lessonLegacyId}`;
    const existingByLegacy = lessonByLegacyId.get(legacyKey);
    if (existingByLegacy) {
      // Already imported
      continue;
    }

    // Check if lesson exists by title
    const sectionTitle = section.Section.trim();
    const titleKey = `${courseUuid}:${sectionTitle.toLowerCase()}`;
    const matchingLesson = lessonByTitle.get(titleKey);

    if (matchingLesson) {
      // Update existing lesson with legacy_lesson_id
      if (!dryRun) {
        const { error } = await supabase
          .from("lessons")
          .update({ legacy_lesson_id: lessonLegacyId })
          .eq("id", matchingLesson.id);

        if (error) {
          console.error(`  Error updating lesson ${matchingLesson.title}:`, error);
        } else {
          lessonsUpdated++;
          // Update lookup map
          lessonByLegacyId.set(legacyKey, matchingLesson);
        }
      } else {
        lessonsUpdated++;
      }
    } else {
      // Need to create new lesson
      const currentMax = maxLessonNumber.get(courseUuid) || 0;
      const newNumber = currentMax + 1;
      maxLessonNumber.set(courseUuid, newNumber);

      lessonsToCreate.push({
        course_id: courseUuid,
        title: sectionTitle,
        legacy_lesson_id: lessonLegacyId,
        number: newNumber,
        sort_order: lessonLegacyId, // Use legacy ID as sort order
      });
    }
  }

  // Insert new lessons in batches
  if (lessonsToCreate.length > 0 && !dryRun) {
    console.log(`  Creating ${lessonsToCreate.length} new lessons...`);
    const batchSize = 100;
    for (let i = 0; i < lessonsToCreate.length; i += batchSize) {
      const batch = lessonsToCreate.slice(i, i + batchSize);
      const { data: created, error } = await supabase
        .from("lessons")
        .insert(batch.map(l => ({
          course_id: l.course_id,
          title: l.title,
          legacy_lesson_id: l.legacy_lesson_id,
          number: l.number,
          sort_order: l.sort_order,
          is_published: true,
        })))
        .select("id, course_id, legacy_lesson_id");

      if (error) {
        console.error(`  Error creating lessons batch:`, error);
      } else {
        lessonsCreated += created?.length || 0;
        // Update lookup maps
        for (const lesson of created || []) {
          const key = `${lesson.course_id}:${lesson.legacy_lesson_id}`;
          lessonByLegacyId.set(key, lesson as typeof existingLessons[0]);
        }
      }
    }
  } else if (dryRun) {
    lessonsCreated = lessonsToCreate.length;
    console.log(`  [DRY RUN] Would create ${lessonsToCreate.length} lessons`);
  }

  console.log(`  Lessons updated: ${lessonsUpdated}`);
  console.log(`  Lessons created: ${lessonsCreated}`);
  console.log(`  Lessons skipped: ${lessonsSkipped}`);

  // Build lesson legacy_id -> UUID map
  const { data: lessonsWithLegacy } = await supabase
    .from("lessons")
    .select("id, legacy_lesson_id, course_id")
    .in("course_id", courseIds)
    .not("legacy_lesson_id", "is", null);

  const lessonLegacyToId = new Map<string, string>();
  for (const lesson of lessonsWithLegacy || []) {
    if (lesson.legacy_lesson_id !== null) {
      // Key includes course_id because lesson IDs might not be unique across courses
      const key = `${lesson.course_id}:${lesson.legacy_lesson_id}`;
      lessonLegacyToId.set(key, lesson.id);
    }
  }

  if (skipWords) {
    console.log("\nSkipping word import (--skip-words flag)");
    console.log("\nDone!");
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Step 5: Load General.csv and prepare word data
  // -------------------------------------------------------------------------
  console.log("\nStep 5: Loading and parsing General.csv...");

  const generalRows = readCsv<GeneralRow>(generalPath);
  console.log(`  Total rows: ${generalRows.length}`);

  // Filter and prepare words
  const wordsToInsert: WordInsert[] = [];
  const relationshipsToStage: RelationshipStaging[] = [];
  const lessonWordAssignments: { wordRefN: number; lessonLegacyId: number; courseRef: number }[] = [];

  let skippedCourseZero = 0;
  let skippedNoRefN = 0;
  let wordsWithoutLesson = 0;

  for (const row of generalRows) {
    const courseRef = safeParseInt(row.Course);
    const lessonLegacyId = safeParseInt(row.Lesson);
    const refN = safeParseInt(row.RefN);

    // Skip Course = 0 (UI content)
    if (courseRef === 0) {
      skippedCourseZero++;
      continue;
    }

    // Skip if no RefN
    if (refN === null) {
      skippedNoRefN++;
      continue;
    }

    // Skip if course not in valid courses
    if (courseRef !== null && !validCourseRefs.has(courseRef)) {
      continue;
    }

    // Get gender code mapping
    const genderCode = row.Gender || row.old_gender || "";
    const mapping = genderCodeMap.get(genderCode);

    // Determine values from mapping or defaults
    const category = mapping?.category || "word";
    const partOfSpeech = mapping?.part_of_speech || null;
    const gender = mapping?.gender || null;
    const grammaticalNumber = mapping?.grammatical_number || null;
    const transitivity = mapping?.transitivity || null;
    const isIrregular = mapping?.is_irregular === "TRUE" ? true : null;
    const phraseType = mapping?.phrase_type || null;
    const tags = parseTags(mapping?.tags || "");

    // Clean lemma - use FgnDictionary if available, otherwise extract from headword
    let lemma = cleanLemma(row.FgnDictionary || row.lemma || "");
    if (!lemma && row.headword) {
      lemma = row.headword;
    }
    if (!lemma && row.ForeignRTF) {
      lemma = row.ForeignRTF;
    }

    // Get headword
    const headword = row.headword || row.ForeignRTF || "";

    // Get english
    const english = row.english || row.English || "";

    // Skip if no english or headword
    if (!english.trim() || !headword.trim()) {
      continue;
    }

    // Build word insert object
    const wordInsert: WordInsert = {
      language_id: language.id,
      english: english.trim(),
      headword: headword.trim(),
      lemma: lemma.trim() || headword.trim(),
      notes: row.notes || row.Notes || null,
      memory_trigger_text: row.memory_trigger_text || row.Trigger || null,
      memory_trigger_image_url: cleanFilename(row.memory_trigger_image || row.FileFgnPic),
      audio_url_english: cleanFilename(row.audio_url_english || row.FileEngSouRTF),
      audio_url_foreign: cleanFilename(row.audio_url_foreign || row.FileFgnSouRTF),
      audio_url_trigger: cleanFilename(row.audio_url_trigger || row.FileFgnTrigger),
      part_of_speech: partOfSpeech,
      gender: gender,
      grammatical_number: grammaticalNumber,
      transitivity: transitivity,
      is_irregular: isIrregular,
      category: category,
      phrase_type: phraseType,
      tags: tags.length > 0 ? tags : null,
      is_false_friend: row.FlagFalseFriends === "1" || row.FlagFalseFriends === "-1",
      legacy_refn: refN,
      legacy_gender_code: genderCode || null,
      legacy_image_suffix: row.FilePSuffix || null,
    };

    wordsToInsert.push(wordInsert);

    // Track lesson assignment (only if Lesson > 0)
    // Derive course from lesson ID, not from CSV Course column
    if (lessonLegacyId !== null && lessonLegacyId > 0) {
      const derivedCourse = deriveCourseFromLesson(lessonLegacyId);
      if (derivedCourse !== null) {
        lessonWordAssignments.push({
          wordRefN: refN,
          lessonLegacyId: lessonLegacyId,
          courseRef: derivedCourse,
        });
      } else {
        wordsWithoutLesson++;
      }
    } else {
      wordsWithoutLesson++;
    }

    // Collect relationships
    const compoundRef1 = safeParseInt(row.CompoundRef1N);
    const compoundRef2 = safeParseInt(row.CompoundRef2N);
    const linkN = safeParseInt(row.LinkN);
    const miniLinkN = safeParseInt(row.MiniLinkN);

    if (compoundRef1 !== null && compoundRef1 > 0) {
      relationshipsToStage.push({
        word_legacy_refn: refN,
        related_legacy_refn: compoundRef1,
        relationship_type: "compound",
      });
    }
    if (compoundRef2 !== null && compoundRef2 > 0) {
      relationshipsToStage.push({
        word_legacy_refn: refN,
        related_legacy_refn: compoundRef2,
        relationship_type: "compound",
      });
    }
    if (linkN !== null && linkN > 0) {
      relationshipsToStage.push({
        word_legacy_refn: refN,
        related_legacy_refn: linkN,
        relationship_type: "sentence",
      });
    }
    if (miniLinkN !== null && miniLinkN > 0) {
      relationshipsToStage.push({
        word_legacy_refn: refN,
        related_legacy_refn: miniLinkN,
        relationship_type: "grammar",
      });
    }
  }

  console.log(`  Words to import: ${wordsToInsert.length}`);
  console.log(`  Skipped (Course=0): ${skippedCourseZero}`);
  console.log(`  Skipped (no RefN): ${skippedNoRefN}`);
  console.log(`  Words without lesson: ${wordsWithoutLesson}`);
  console.log(`  Relationships to create: ${relationshipsToStage.length}`);

  // -------------------------------------------------------------------------
  // Step 5b: Create missing lessons referenced in General.csv
  // -------------------------------------------------------------------------
  console.log("\nStep 5b: Creating missing lessons from word references...");

  // Build a lookup of lesson titles from Sections.csv (by legacy lesson ID)
  const sectionTitlesByLessonId = new Map<number, string>();
  for (const section of sections) {
    const lessonId = parseInt(section.Lesson, 10);
    const pointer = parseInt(section.Pointer, 10);
    if (!isNaN(lessonId) && lessonId > 0 && pointer !== -1 && section.Section.trim()) {
      sectionTitlesByLessonId.set(lessonId, section.Section.trim());
    }
  }

  // Find all unique course+lesson combinations referenced in words
  const referencedLessons = new Set<string>();
  for (const assignment of lessonWordAssignments) {
    const courseUuid = courseRefToId.get(assignment.courseRef);
    if (courseUuid) {
      const key = `${courseUuid}:${assignment.lessonLegacyId}`;
      referencedLessons.add(key);
    }
  }

  // Find which ones don't exist yet
  const missingLessonKeys: string[] = [];
  for (const key of referencedLessons) {
    if (!lessonLegacyToId.has(key)) {
      missingLessonKeys.push(key);
    }
  }

  console.log(`  Lessons referenced by words: ${referencedLessons.size}`);
  console.log(`  Missing lessons to create: ${missingLessonKeys.length}`);

  if (missingLessonKeys.length > 0 && !dryRun) {
    // Group by course and create lessons
    const lessonsByCourse = new Map<string, number[]>();
    for (const key of missingLessonKeys) {
      const [courseUuid, lessonIdStr] = key.split(":");
      const lessonId = parseInt(lessonIdStr, 10);
      if (!lessonsByCourse.has(courseUuid)) {
        lessonsByCourse.set(courseUuid, []);
      }
      lessonsByCourse.get(courseUuid)!.push(lessonId);
    }

    let missingLessonsCreated = 0;
    for (const [courseUuid, lessonIds] of lessonsByCourse) {
      // Get current max lesson number for this course
      const { data: maxLesson } = await supabase
        .from("lessons")
        .select("number")
        .eq("course_id", courseUuid)
        .order("number", { ascending: false })
        .limit(1)
        .single();

      let nextNumber = (maxLesson?.number || 0) + 1;

      // Create lessons in batches - use title from Sections.csv if available
      const lessonsToAdd = lessonIds.map((legacyId) => ({
        course_id: courseUuid,
        title: sectionTitlesByLessonId.get(legacyId) || `Lesson ${legacyId}`,
        legacy_lesson_id: legacyId,
        number: nextNumber++,
        sort_order: legacyId,
        is_published: true,
      }));

      const batchSize = 100;
      for (let i = 0; i < lessonsToAdd.length; i += batchSize) {
        const batch = lessonsToAdd.slice(i, i + batchSize);
        const { data: created, error } = await supabase
          .from("lessons")
          .insert(batch)
          .select("id, course_id, legacy_lesson_id");

        if (error) {
          console.error(`  Error creating missing lessons:`, error);
        } else {
          missingLessonsCreated += created?.length || 0;
          // Update lookup map
          for (const lesson of created || []) {
            const key = `${lesson.course_id}:${lesson.legacy_lesson_id}`;
            lessonLegacyToId.set(key, lesson.id);
          }
        }
      }
    }
    console.log(`  Missing lessons created: ${missingLessonsCreated}`);
  } else if (dryRun && missingLessonKeys.length > 0) {
    console.log(`  [DRY RUN] Would create ${missingLessonKeys.length} missing lessons`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] Would insert words and create relationships");
    console.log("\nDone!");
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Step 6: Delete existing words for this language
  // -------------------------------------------------------------------------
  console.log("\nStep 6: Deleting existing words...");

  // First delete lesson_words entries
  const { data: existingWords } = await supabase
    .from("words")
    .select("id")
    .eq("language_id", language.id);

  if (existingWords && existingWords.length > 0) {
    const wordIds = existingWords.map(w => w.id);

    // Delete in batches
    const batchSize = 500;
    for (let i = 0; i < wordIds.length; i += batchSize) {
      const batch = wordIds.slice(i, i + batchSize);
      await supabase.from("lesson_words").delete().in("word_id", batch);
      await supabase.from("word_relationships").delete().in("word_id", batch);
    }

    // Now delete words
    const { error: deleteError } = await supabase
      .from("words")
      .delete()
      .eq("language_id", language.id);

    if (deleteError) {
      console.error("Error deleting existing words:", deleteError);
      process.exit(1);
    }
    console.log(`  Deleted ${existingWords.length} existing words`);
  } else {
    console.log("  No existing words to delete");
  }

  // -------------------------------------------------------------------------
  // Step 7: Insert words in batches
  // -------------------------------------------------------------------------
  console.log("\nStep 7: Inserting words...");

  const insertBatchSize = 500;
  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < wordsToInsert.length; i += insertBatchSize) {
    const batch = wordsToInsert.slice(i, i + insertBatchSize);

    const { error } = await supabase.from("words").insert(batch);

    if (error) {
      console.error(`  Error inserting batch ${i / insertBatchSize + 1}:`, error);
      errorCount += batch.length;
    } else {
      insertedCount += batch.length;
    }

    // Progress indicator
    if ((i + insertBatchSize) % 5000 === 0 || i + insertBatchSize >= wordsToInsert.length) {
      console.log(`  Progress: ${Math.min(i + insertBatchSize, wordsToInsert.length)} / ${wordsToInsert.length}`);
    }
  }

  console.log(`  Inserted: ${insertedCount} words`);
  console.log(`  Errors: ${errorCount} words`);

  // -------------------------------------------------------------------------
  // Step 8: Build RefN -> UUID map and create lesson_words
  // -------------------------------------------------------------------------
  console.log("\nStep 8: Creating lesson-word assignments...");

  // Fetch all words with their legacy_refn (paginate to get all)
  const refnToWordId = new Map<number, string>();
  let wordOffset = 0;
  const wordPageSize = 1000;
  while (true) {
    const { data: insertedWords } = await supabase
      .from("words")
      .select("id, legacy_refn")
      .eq("language_id", language.id)
      .not("legacy_refn", "is", null)
      .range(wordOffset, wordOffset + wordPageSize - 1);

    if (!insertedWords || insertedWords.length === 0) break;

    for (const word of insertedWords) {
      if (word.legacy_refn !== null) {
        refnToWordId.set(word.legacy_refn, word.id);
      }
    }

    wordOffset += wordPageSize;
    if (insertedWords.length < wordPageSize) break;
  }

  // Create lesson_words entries
  const lessonWordsToInsert: { lesson_id: string; word_id: string; sort_order: number }[] = [];
  const lessonSortOrders = new Map<string, number>();

  // Debug: track why assignments fail
  let noCourseUuid = 0;
  let noLessonUuid = 0;
  let noWordUuid = 0;
  const missingLessons = new Set<string>();

  console.log(`  Total assignments to process: ${lessonWordAssignments.length}`);
  console.log(`  courseRefToId size: ${courseRefToId.size}`);
  console.log(`  lessonLegacyToId size: ${lessonLegacyToId.size}`);
  console.log(`  refnToWordId size: ${refnToWordId.size}`);

  for (const assignment of lessonWordAssignments) {
    const courseUuid = courseRefToId.get(assignment.courseRef);
    if (!courseUuid) {
      noCourseUuid++;
      continue;
    }

    const lessonKey = `${courseUuid}:${assignment.lessonLegacyId}`;
    const lessonUuid = lessonLegacyToId.get(lessonKey);
    if (!lessonUuid) {
      noLessonUuid++;
      if (missingLessons.size < 10) {
        missingLessons.add(`course=${assignment.courseRef} lesson=${assignment.lessonLegacyId}`);
      }
      continue;
    }

    const wordUuid = refnToWordId.get(assignment.wordRefN);
    if (!wordUuid) {
      noWordUuid++;
      continue;
    }

    // Get next sort order for this lesson
    const currentOrder = lessonSortOrders.get(lessonUuid) || 0;
    lessonSortOrders.set(lessonUuid, currentOrder + 1);

    lessonWordsToInsert.push({
      lesson_id: lessonUuid,
      word_id: wordUuid,
      sort_order: currentOrder + 1,
    });
  }

  console.log(`  Lesson-word assignments to create: ${lessonWordsToInsert.length}`);
  console.log(`  Failed - no course UUID: ${noCourseUuid}`);
  console.log(`  Failed - no lesson UUID: ${noLessonUuid}`);
  console.log(`  Failed - no word UUID: ${noWordUuid}`);
  if (missingLessons.size > 0) {
    console.log(`  Sample missing lessons:`);
    for (const ml of missingLessons) {
      console.log(`    ${ml}`);
    }
  }

  // Insert lesson_words in batches
  let lessonWordsInserted = 0;
  for (let i = 0; i < lessonWordsToInsert.length; i += insertBatchSize) {
    const batch = lessonWordsToInsert.slice(i, i + insertBatchSize);
    const { error } = await supabase.from("lesson_words").insert(batch);

    if (error) {
      console.error(`  Error inserting lesson_words batch:`, error);
    } else {
      lessonWordsInserted += batch.length;
    }
  }

  console.log(`  Lesson-word assignments created: ${lessonWordsInserted}`);

  if (skipRelationships) {
    console.log("\nSkipping relationship resolution (--skip-relationships flag)");
    console.log("\nDone!");
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Step 9: Create word relationships
  // -------------------------------------------------------------------------
  console.log("\nStep 9: Creating word relationships...");

  const relationshipsToInsert: { word_id: string; related_word_id: string; relationship_type: string }[] = [];

  for (const rel of relationshipsToStage) {
    const wordUuid = refnToWordId.get(rel.word_legacy_refn);
    const relatedUuid = refnToWordId.get(rel.related_legacy_refn);

    if (wordUuid && relatedUuid) {
      relationshipsToInsert.push({
        word_id: wordUuid,
        related_word_id: relatedUuid,
        relationship_type: rel.relationship_type,
      });
    }
  }

  console.log(`  Valid relationships: ${relationshipsToInsert.length}`);

  // Insert relationships in batches
  let relationshipsInserted = 0;
  for (let i = 0; i < relationshipsToInsert.length; i += insertBatchSize) {
    const batch = relationshipsToInsert.slice(i, i + insertBatchSize);
    const { error } = await supabase.from("word_relationships").insert(batch);

    if (error) {
      // Ignore duplicate key errors
      if (!error.message.includes("duplicate")) {
        console.error(`  Error inserting relationships batch:`, error);
      }
    } else {
      relationshipsInserted += batch.length;
    }
  }

  console.log(`  Relationships created: ${relationshipsInserted}`);

  // -------------------------------------------------------------------------
  // Step 10: Update word counts
  // -------------------------------------------------------------------------
  console.log("\nStep 10: Updating word counts...");

  // Update lesson word counts
  const { data: lessonCounts } = await supabase
    .from("lesson_words")
    .select("lesson_id")
    .in("lesson_id", Array.from(lessonSortOrders.keys()));

  const lessonWordCounts = new Map<string, number>();
  for (const lw of lessonCounts || []) {
    lessonWordCounts.set(lw.lesson_id, (lessonWordCounts.get(lw.lesson_id) || 0) + 1);
  }

  for (const [lessonId, count] of lessonWordCounts) {
    await supabase.from("lessons").update({ word_count: count }).eq("id", lessonId);
  }

  console.log(`  Updated word counts for ${lessonWordCounts.size} lessons`);

  // -------------------------------------------------------------------------
  // Done!
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("Import Complete!");
  console.log("=".repeat(60));
  console.log(`  Words imported: ${insertedCount}`);
  console.log(`  Lesson assignments: ${lessonWordsInserted}`);
  console.log(`  Relationships: ${relationshipsInserted}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
