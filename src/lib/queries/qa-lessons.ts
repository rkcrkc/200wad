/**
 * Pure (no server imports) helpers for admin-only "QA lesson" IDs.
 *
 * A QA lesson gathers every word in a course that carries one developer-QA
 * flag (the checkboxes/notes in `DeveloperSection`) so an admin can Study
 * through them and fix flags inline. QA study is **fully ephemeral** — no
 * scoring/session rows are ever written (see the short-circuits in
 * `mutations/study.ts`).
 *
 * IMPORTANT: `qa-` ids are their OWN namespace, deliberately NOT auto-lessons.
 * They match neither the `lesson_id` (UUID FK) nor the
 * `auto_lesson_type IN (...)` side of the split-column CHECK constraints on
 * `study_sessions` / `test_sessions`, so the DB physically rejects any QA
 * session row — a hard backstop behind the write short-circuits.
 *
 * Lives in a separate module from `words.ts` / `qa.ts` (which pull in
 * `@/lib/supabase/server`) so client components can import these helpers
 * without dragging server-only code into the client bundle.
 */

// The 7 developer-QA flags, in DeveloperSection display order. `kind`
// distinguishes the free-text note ("flagged" = non-empty) from the booleans
// ("flagged" = true).
export type QaFlag =
  | "developer_notes"
  | "picture_wrong"
  | "picture_missing"
  | "picture_bad_svg"
  | "picture_mp4_defect"
  | "audio_rerecord"
  | "notes_in_memory_trigger";

export const QA_FLAG_DEFINITIONS: {
  key: QaFlag;
  label: string;
  column: string;
  kind: "text" | "bool";
  emoji: string;
}[] = [
  {
    key: "developer_notes",
    label: "Developer Notes",
    column: "developer_notes",
    kind: "text",
    emoji: "📝",
  },
  {
    key: "picture_wrong",
    label: "Wrong Picture",
    column: "picture_wrong",
    kind: "bool",
    emoji: "🖼️",
  },
  {
    key: "picture_missing",
    label: "Missing Picture",
    column: "picture_missing",
    kind: "bool",
    emoji: "🚫",
  },
  {
    key: "picture_bad_svg",
    label: "Bad SVG",
    column: "picture_bad_svg",
    kind: "bool",
    emoji: "🧩",
  },
  {
    key: "picture_mp4_defect",
    label: "MP4 Defect",
    column: "picture_mp4_defect",
    kind: "bool",
    emoji: "🎞️",
  },
  {
    // Combined flag: a word matches if ANY of audio_rerecord_english,
    // audio_rerecord_foreign, or audio_rerecord_trigger is set. The `column`
    // below is nominal only (no single backing column) — the combined match
    // lives in `isFlagged` in qa.ts. `column` is not used for reads.
    key: "audio_rerecord",
    label: "Re-record Audio",
    column: "audio_rerecord_trigger",
    kind: "bool",
    emoji: "🎙️",
  },
  {
    key: "notes_in_memory_trigger",
    label: "Notes in Trigger",
    column: "notes_in_memory_trigger",
    kind: "bool",
    emoji: "🧠",
  },
];

export const QA_FLAG_META: Record<
  QaFlag,
  { label: string; column: string; kind: "text" | "bool"; emoji: string }
> = QA_FLAG_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.key] = {
      label: def.label,
      column: def.column,
      kind: def.kind,
      emoji: def.emoji,
    };
    return acc;
  },
  {} as Record<
    QaFlag,
    { label: string; column: string; kind: "text" | "bool"; emoji: string }
  >,
);

const QA_FLAG_KEYS = QA_FLAG_DEFINITIONS.map((d) => d.key);

// QA-lesson ID helpers. Format: `qa-{flag}-{courseId}`.
export function createQaLessonId(flag: QaFlag, courseId: string): string {
  return `qa-${flag}-${courseId}`;
}

export function parseQaLessonId(
  lessonId: string,
): { flag: QaFlag; courseId: string } | null {
  const match = lessonId.match(
    /^qa-(developer_notes|picture_wrong|picture_missing|picture_bad_svg|picture_mp4_defect|audio_rerecord|notes_in_memory_trigger)-(.+)$/,
  );
  if (!match) return null;
  return { flag: match[1] as QaFlag, courseId: match[2] };
}

export function isQaLesson(lessonId: string): boolean {
  return lessonId.startsWith("qa-");
}

/** All QA-lesson IDs for a course (one per flag), in display order. */
export function getAllQaLessonIds(courseId: string): string[] {
  return QA_FLAG_KEYS.map((flag) => createQaLessonId(flag, courseId));
}
