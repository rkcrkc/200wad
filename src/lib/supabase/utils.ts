/**
 * Default row limit for Supabase queries that need all rows.
 * PostgREST silently caps responses at 1,000 rows by default.
 * Use this constant with `.limit(SUPABASE_ALL_ROWS)` on any query
 * that may return more than 1,000 rows.
 */
export const SUPABASE_ALL_ROWS = 100_000;

/**
 * Warn if a Supabase query result hits the limit, which means rows may be silently truncated.
 * Call this after any query using SUPABASE_ALL_ROWS.
 */
export function warnIfTruncated(label: string, rowCount: number) {
  if (rowCount >= SUPABASE_ALL_ROWS) {
    console.warn(
      `[Supabase] Query "${label}" returned ${rowCount} rows (limit: ${SUPABASE_ALL_ROWS}). Results may be truncated — increase SUPABASE_ALL_ROWS.`
    );
  }
}

/**
 * Fetch all rows from a Supabase query by paginating via `.range()` in chunks.
 *
 * Why this exists: PostgREST applies a server-side `max-rows` cap (typically
 * 1,000) that silently truncates responses. Passing `.limit(100_000)` does NOT
 * override that cap — the server still returns at most the configured maximum.
 * For queries that may return more than ~1,000 rows (e.g. a power user's
 * `user_word_progress`, a large course's `lesson_words`), we have to paginate
 * with `.range(from, to)` to actually read everything.
 *
 * Usage:
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from("user_word_progress")
 *       .select("word_id, status")
 *       .eq("user_id", userId)
 *       .range(from, to)
 *   );
 *
 * Notes:
 * - The caller should not add `.limit()`; `.range()` controls the window.
 * - When the query needs a stable ordering across pages, add `.order(...)` to
 *   the builder — otherwise PostgreSQL may return overlapping/missing rows
 *   across page boundaries.
 */
export async function fetchAllRows<T>(
  buildQuery: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  options?: { batchSize?: number; label?: string }
): Promise<T[]> {
  const BATCH_SIZE = options?.batchSize ?? 1000;
  const allRows: T[] = [];
  let offset = 0;

  // Safety valve: bail out at ~SUPABASE_ALL_ROWS rows so a runaway table
  // doesn't loop forever. Emits the same warnIfTruncated signal callers expect.
  while (offset < SUPABASE_ALL_ROWS) {
    const { data, error } = await buildQuery(offset, offset + BATCH_SIZE - 1);
    if (error) {
      console.error(
        `[Supabase] fetchAllRows${options?.label ? ` (${options.label})` : ""} error:`,
        error
      );
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  if (options?.label) warnIfTruncated(options.label, allRows.length);
  return allRows;
}
