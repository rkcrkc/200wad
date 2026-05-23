/**
 * No-op loading boundary for /lesson/[lessonId]/study.
 *
 * Without this file, the study page would inherit the lesson-detail skeleton
 * from ../loading.tsx, which has a completely different layout from the
 * study UI. StudyModeClient already renders its own pre-reveal skeletons
 * inside the study flow, so the route doesn't need an external fallback.
 */
export default function StudyLoading() {
  return null;
}
