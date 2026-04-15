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
