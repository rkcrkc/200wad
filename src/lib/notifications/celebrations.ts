/**
 * Mastery celebration helpers.
 *
 * Three scopes, all idempotent per (user, entity):
 *   - recordLessonMastered    fires once when a single lesson hits 100% mastered
 *   - recordCourseMastered    fires once when every lesson in a course is mastered
 *   - recordLanguageMastered  fires once when every course in a language is mastered
 *
 * Each returns a `CelebrationPayload` if it just fired (caller renders the
 * modal), or `null` if the milestone was already recorded for this user/entity.
 *
 * Idempotency: relies on `notifications.data` JSONB carrying both
 *   `template_key` (stamped by insertFromTemplate) and the entity id we
 *   attach via `dataOverrides`. A unique (template_key, entity_id) combo
 *   is what we look for before firing.
 *
 * Admin editability: bell + toast copy comes from notification_templates
 * columns (title, message, toast_title, toast_message). Modal-specific
 * extras (subtitle, share message, secondary CTA, emoji) live in
 * `default_data.celebration` so the same admin form that edits other
 * templates also edits celebration content as a single JSON blob.
 *
 * All functions swallow errors so they never block the parent flow
 * (e.g. completeTestSession). They log failures so admins can debug via
 * server logs.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { insertFromTemplate } from "@/lib/notifications/template";
import { getTemplateByKey } from "@/lib/queries/notification-config";
import { getFlagFromCode } from "@/lib/utils/flags";
import type {
  CelebrationStat,
  CelebrationTier,
} from "@/components/celebrations/CelebrationModal";

// ---------------------------------------------------------------------------
// Public payload (returned to client to render the modal)
// ---------------------------------------------------------------------------

export type CelebrationScope = "lesson" | "course" | "language";

export interface CelebrationPayload {
  scope: CelebrationScope;
  /** Template key that fired. Useful for analytics + the share handler. */
  templateKey: string;
  tier: CelebrationTier;
  title: string;
  subtitle?: string;
  emoji?: string;
  flagEmoji?: string;
  eyebrow?: string;
  stats: CelebrationStat[];
  shareMessage: string;
  /** Optional secondary CTA (e.g. "Pick a new course"). */
  secondaryCta?: { label: string; href?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Lightweight {var} substitution. Duplicated here rather than imported from
 * lib/notifications/template.ts so we can run it on celebration sub-fields
 * (subtitle, share_message, cta href) without exporting internals.
 */
function substitute(
  text: string | null | undefined,
  vars: Record<string, unknown>
): string {
  if (!text) return "";
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return match;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      return String(v);
    }
    return match;
  });
}

interface RawCelebration {
  tier?: string;
  emoji?: string;
  subtitle?: string;
  share_message?: string;
  secondary_cta?: { label?: string; href?: string };
}

function readCelebrationConfig(defaultData: unknown): RawCelebration {
  if (!defaultData || typeof defaultData !== "object") return {};
  const obj = defaultData as Record<string, unknown>;
  const c = obj.celebration;
  if (!c || typeof c !== "object") return {};
  return c as RawCelebration;
}

/**
 * Already-fired check. We index by `template_key` + a scope-specific entity
 * id field, both stored on `notifications.data` JSONB. Returns true if a
 * matching row exists.
 */
async function alreadyFired(
  userId: string,
  templateKey: string,
  entityField: "lesson_id" | "course_id" | "language_id",
  entityId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("data->>template_key", templateKey)
    .eq(`data->>${entityField}`, entityId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      `[celebrations] idempotency check failed for ${templateKey} / ${entityField}=${entityId}:`,
      error.message
    );
    // Fail closed — if we can't confirm, don't double-fire.
    return true;
  }
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Mastery detection (cheap counting queries)
// ---------------------------------------------------------------------------

/**
 * Is this lesson fully mastered for this user?
 *
 * Word-level check: counts distinct `user_word_progress.status='mastered'`
 * rows for the words in this lesson and compares to the total word count
 * for the lesson. This bypasses `user_lesson_progress.status`, which is a
 * stored denormalized column that is NOT updated when a word reaches
 * mastery through an auto-lesson test (e.g. lost-mastery or unmastered
 * auto-lessons). Counting words directly removes that blind spot.
 *
 * Returns false on any DB error or empty lesson — fails closed.
 */
export async function isLessonFullyMastered(
  userId: string,
  lessonId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: lessonWords, error: lwErr } = await supabase
    .from("lesson_words")
    .select("word_id")
    .eq("lesson_id", lessonId);
  if (lwErr || !lessonWords || lessonWords.length === 0) return false;

  const wordIds = lessonWords
    .map((lw) => lw.word_id)
    .filter((id): id is string => Boolean(id));
  if (wordIds.length === 0) return false;

  const { count, error: countErr } = await supabase
    .from("user_word_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "mastered")
    .in("word_id", wordIds);
  if (countErr) return false;

  return (count ?? 0) >= wordIds.length;
}

/**
 * Is the parent course fully mastered? Every published lesson in the
 * course must pass `isLessonFullyMastered`. Defined transitively via the
 * word-level lesson check so auto-lesson cascades (where lesson_progress
 * never updated) are handled correctly.
 *
 * Returns false (not throws) on any DB error so the celebration flow
 * fails closed.
 */
export async function isCourseFullyMastered(
  userId: string,
  courseId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: lessons, error: lessonsErr } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_published", true);
  if (lessonsErr || !lessons || lessons.length === 0) return false;

  for (const lesson of lessons) {
    const ok = await isLessonFullyMastered(userId, lesson.id);
    if (!ok) return false;
  }
  return true;
}

/**
 * Is every course in this language fully mastered? Cascades over
 * isCourseFullyMastered for each course in the language. Only invoked
 * when course mastery just unlocked, so the n+1 cost is bounded by the
 * number of courses in the language (low single digits today).
 */
export async function isLanguageFullyMastered(
  userId: string,
  languageId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("id")
    .eq("language_id", languageId)
    .eq("is_published", true);
  if (error || !courses || courses.length === 0) return false;

  for (const course of courses) {
    const mastered = await isCourseFullyMastered(userId, course.id);
    if (!mastered) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Time aggregates
// ---------------------------------------------------------------------------

/**
 * Total time (study + test, in seconds) this user has spent on a single
 * lesson. Mirrors the aggregation the lesson page header bar performs in
 * `src/lib/queries/words.ts` so the "Time invested" celebration stat
 * matches what the user has been seeing.
 *
 * Two small queries on indexed (user_id, lesson_id) columns.
 * Returns 0 on any DB error so the celebration still renders.
 */
export async function getLessonTotalTimeSeconds(
  userId: string,
  lessonId: string
): Promise<number> {
  const supabase = createAdminClient();
  const [studyRes, testRes] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("duration_seconds")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId),
    supabase
      .from("test_sessions")
      .select("duration_seconds")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId),
  ]);

  const sum = (rows: Array<{ duration_seconds: number | null }> | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.duration_seconds || 0), 0);

  return sum(studyRes.data) + sum(testRes.data);
}

// ---------------------------------------------------------------------------
// Recorders
// ---------------------------------------------------------------------------

export interface RecordLessonMasteredInput {
  userId: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string | null;
  stats: {
    totalWords: number;
    /** Total time spent on this lesson, in seconds. Used for the stats grid. */
    totalTimeSeconds: number;
    /** Average test score across all tests on this lesson, 0-100. */
    averageTestScore: number | null;
  };
}

export async function recordLessonMastered(
  input: RecordLessonMasteredInput
): Promise<CelebrationPayload | null> {
  try {
    const key = "achievement.lesson_mastered";
    if (await alreadyFired(input.userId, key, "lesson_id", input.lessonId)) {
      return null;
    }

    const template = await getTemplateByKey(key);
    if (!template || !template.enabled) return null;

    const vars: Record<string, unknown> = {
      lesson_id: input.lessonId,
      lesson_title: input.lessonTitle,
      course_id: input.courseId ?? "",
    };

    // Fire bell + toast. insertFromTemplate handles substitution of
    // title/message and stamps template_key into data automatically.
    await insertFromTemplate(key, {
      userId: input.userId,
      dataOverrides: vars,
    });

    const config = readCelebrationConfig(template.default_data);
    return {
      scope: "lesson",
      templateKey: key,
      tier: (config.tier as CelebrationTier) ?? "major",
      title: substitute(template.title, vars),
      subtitle: substitute(config.subtitle ?? template.message, vars),
      emoji: config.emoji ?? "🏆",
      eyebrow: input.lessonTitle ? `Lesson · ${input.lessonTitle}` : undefined,
      stats: buildLessonStats(input.stats),
      shareMessage: substitute(
        config.share_message ?? "I just mastered every word in {lesson_title} on 200 Words a Day!",
        vars
      ),
      secondaryCta: config.secondary_cta
        ? {
            label: substitute(config.secondary_cta.label ?? "", vars),
            href: config.secondary_cta.href
              ? substitute(config.secondary_cta.href, vars)
              : undefined,
          }
        : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[celebrations] recordLessonMastered failed:", message);
    return null;
  }
}

export interface RecordCourseMasteredInput {
  userId: string;
  courseId: string;
  courseName: string;
  languageId: string | null;
  languageCode: string | null;
  stats: {
    totalWords: number;
    totalLessons: number;
  };
}

export async function recordCourseMastered(
  input: RecordCourseMasteredInput
): Promise<CelebrationPayload | null> {
  try {
    const key = "achievement.course_mastered";
    if (await alreadyFired(input.userId, key, "course_id", input.courseId)) {
      return null;
    }

    const template = await getTemplateByKey(key);
    if (!template || !template.enabled) return null;

    const vars: Record<string, unknown> = {
      course_id: input.courseId,
      course_name: input.courseName,
    };

    await insertFromTemplate(key, {
      userId: input.userId,
      dataOverrides: vars,
    });

    const config = readCelebrationConfig(template.default_data);
    return {
      scope: "course",
      templateKey: key,
      tier: (config.tier as CelebrationTier) ?? "major",
      title: substitute(template.title, vars),
      subtitle: substitute(config.subtitle ?? template.message, vars),
      emoji: config.emoji ?? "🏆",
      flagEmoji: input.languageCode ? getFlagFromCode(input.languageCode) : undefined,
      eyebrow: `Course · ${input.courseName}`,
      stats: buildCourseStats(input.stats),
      shareMessage: substitute(
        config.share_message ?? "I just mastered every word in {course_name} on 200 Words a Day!",
        vars
      ),
      secondaryCta: config.secondary_cta
        ? {
            label: substitute(config.secondary_cta.label ?? "", vars),
            href: config.secondary_cta.href
              ? substitute(config.secondary_cta.href, vars)
              : undefined,
          }
        : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[celebrations] recordCourseMastered failed:", message);
    return null;
  }
}

export interface RecordLanguageMasteredInput {
  userId: string;
  languageId: string;
  languageName: string;
  languageCode: string | null;
  stats: {
    totalCourses: number;
    totalWords: number;
  };
}

export async function recordLanguageMastered(
  input: RecordLanguageMasteredInput
): Promise<CelebrationPayload | null> {
  try {
    const key = "achievement.language_mastered";
    if (await alreadyFired(input.userId, key, "language_id", input.languageId)) {
      return null;
    }

    const template = await getTemplateByKey(key);
    if (!template || !template.enabled) return null;

    const vars: Record<string, unknown> = {
      language_id: input.languageId,
      language_name: input.languageName,
    };

    await insertFromTemplate(key, {
      userId: input.userId,
      dataOverrides: vars,
    });

    const config = readCelebrationConfig(template.default_data);
    return {
      scope: "language",
      templateKey: key,
      tier: (config.tier as CelebrationTier) ?? "major",
      title: substitute(template.title, vars),
      subtitle: substitute(config.subtitle ?? template.message, vars),
      emoji: config.emoji ?? "🏆",
      flagEmoji: input.languageCode ? getFlagFromCode(input.languageCode) : undefined,
      eyebrow: `Language · ${input.languageName}`,
      stats: buildLanguageStats(input.stats),
      shareMessage: substitute(
        config.share_message ?? "I just mastered an entire language ({language_name}) on 200 Words a Day!",
        vars
      ),
      secondaryCta: config.secondary_cta
        ? {
            label: substitute(config.secondary_cta.label ?? "", vars),
            href: config.secondary_cta.href
              ? substitute(config.secondary_cta.href, vars)
              : undefined,
          }
        : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[celebrations] recordLanguageMastered failed:", message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stats grid builders (data-driven, kept here so the recorders own the shape)
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

function buildLessonStats(
  stats: RecordLessonMasteredInput["stats"]
): CelebrationStat[] {
  const out: CelebrationStat[] = [
    { label: "Words mastered", value: stats.totalWords },
    { label: "Time invested", value: formatDuration(stats.totalTimeSeconds) },
  ];
  if (stats.averageTestScore !== null) {
    out.push({ label: "Average score", value: `${Math.round(stats.averageTestScore)}%` });
  }
  return out;
}

function buildCourseStats(
  stats: RecordCourseMasteredInput["stats"]
): CelebrationStat[] {
  return [
    { label: "Words mastered", value: stats.totalWords },
    { label: "Lessons completed", value: stats.totalLessons },
  ];
}

function buildLanguageStats(
  stats: RecordLanguageMasteredInput["stats"]
): CelebrationStat[] {
  return [
    { label: "Words mastered", value: stats.totalWords },
    { label: "Courses completed", value: stats.totalCourses },
  ];
}
