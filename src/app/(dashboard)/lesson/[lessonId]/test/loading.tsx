/**
 * No-op loading boundary for /lesson/[lessonId]/test.
 *
 * Without this file, the test page would inherit the lesson-detail skeleton
 * from ../loading.tsx, which has a completely different layout from the test
 * UI. TestModeClient already renders its own pre-reveal skeletons inside the
 * test flow, so the route doesn't need an external fallback.
 */
export default function TestLoading() {
  return null;
}
