# Migration Reconciliation

How to bring the local `supabase/migrations/*.sql` files back into exact
agreement with the remote ledger (`supabase_migrations.schema_migrations`)
in the NL database when they have drifted apart.

**Last run:** 2026-06-19 — reconciled 159 migrations (commits `bd25e00`,
Gap A ledger inserts, `cde1b3e`). End state: `supabase migration list` shows
`Local == Remote` for all 159 rows, zero gaps either direction.

## Background

The remote ledger is the source of truth for what has actually been applied
to the NL database. Each row stores:

| column | meaning |
|---|---|
| `version` | timestamp-style id, e.g. `20260314030657` (PK) |
| `name` | slug after the version, e.g. `billing_schema` |
| `statements` | `text[]` — for our history always a **single element** holding the whole file body |
| `created_by` | e.g. `ryancrocombe@gmail.com` |
| `idempotency_key`, `rollback` | unused (null) |

Drift accumulates three ways:

- **Filename mismatch** — a local file and a ledger row describe the same
  migration but the filename stem (`<version>_<name>`) doesn't match the
  ledger's `version`/`name` (e.g. local dates differ from the recorded ones).
- **Gap A — applied but unrecorded** — a migration ran against the DB but has
  no ledger row. The local file exists; the ledger doesn't know about it.
- **Gap B — recorded but no local file** — a ledger row exists (the migration
  was applied) but the corresponding `.sql` file is missing locally.

The goal is a 1:1 match: every ledger `version_name` has exactly one local
`<version>_<name>.sql`, and vice versa.

## Detecting drift

1. Dump the remote ledger:
   ```sql
   SELECT string_agg(version || '_' || name, E'\n' ORDER BY version)
   FROM supabase_migrations.schema_migrations;
   ```
   Write it sorted to `/tmp/remote_sorted.txt`.
2. Dump local filename stems sorted to `/tmp/local_sorted.txt`:
   ```bash
   ls -1 supabase/migrations/*.sql | sed 's/\.sql$//' | xargs -n1 basename | sort
   ```
3. Diff with `comm`:
   ```bash
   comm -23 local_sorted.txt remote_sorted.txt   # local-only  → Gap A (or renames)
   comm -13 local_sorted.txt remote_sorted.txt   # remote-only → Gap B
   comm -12 local_sorted.txt remote_sorted.txt   # matched
   ```

Or just run `supabase migration list` — a blank in the `Remote` column is a
local-only file; a blank in `Local` is a missing file.

## Fix 1 — filename mismatches (rename only)

When the same migration exists on both sides under different names, rename the
**local file** to match the ledger's `<version>_<name>` exactly. This is a
pure `git mv`; **no content changes**. Commit on its own so the diff is
reviewable as renames (e.g. `bd25e00`).

> Never rename or rewrite ledger rows to match local files — the ledger
> reflects what production actually ran. Local always conforms to the ledger.

## Fix 2 — Gap A (record applied migrations in the ledger)

Equivalent to `supabase migration repair --status applied`: insert the missing
ledger rows from the existing local files. This touches **ledger metadata
only — never table data.**

For each local-only file, insert a row using dollar-quoting so the file body
(with its single quotes and `$$` function bodies) embeds safely:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
VALUES (
  '20260501000001',
  'max_points_always_three',
  ARRAY[$MIG$<entire file body>$MIG$],
  'ryancrocombe@gmail.com'
)
ON CONFLICT (version) DO NOTHING;
```

- Pick a dollar-quote tag (`$MIG$`) and confirm it does not appear in any of
  the file bodies first.
- `statements` is a one-element array holding the whole file, matching the
  shape of every existing row.
- `ON CONFLICT (version) DO NOTHING` makes it safe to re-run.

Verify the rows landed (`SELECT version, array_length(statements,1) ...` →
each `n = 1`).

## Fix 3 — Gap B (backfill missing local files from the ledger)

The ledger body is the authoritative content, so write each missing `.sql`
file straight from `statements[1]`. **Do not hand-transcribe base64 or SQL** —
LLM transcription of large bodies is unreliable (it silently corrupted one
10KB file on the first attempt). Route the content through code only, then
verify every file's md5 against the DB.

The reliable, transcription-free method:

1. **Capture the integrity reference** before writing anything:
   ```sql
   SELECT version || '_' || name AS file, md5(statements[1]) AS md5
   FROM supabase_migrations.schema_migrations
   WHERE version IN (<the Gap B versions>);
   ```
   Save to `/tmp/gapB_md5.txt`.

2. **Expose the bodies via a temporary public view** (PostgREST only serves
   the `public` schema, not `supabase_migrations`):
   ```sql
   CREATE OR REPLACE VIEW public._mig_export_tmp AS
     SELECT version, name, statements[1] AS body
     FROM supabase_migrations.schema_migrations;
   GRANT SELECT ON public._mig_export_tmp TO anon, authenticated, service_role;
   NOTIFY pgrst, 'reload schema';
   ```

3. **Write files with a throwaway Node script** using the service-role key
   (reads `.env.local`, queries the view via `@supabase/supabase-js`, and
   `writeFileSync`s `body` to `supabase/migrations/<version>_<name>.sql`). The
   content never passes through the chat context, so there is nothing to
   mis-copy.

4. **Verify md5 of every written file** against `/tmp/gapB_md5.txt`
   (`md5 -q <file>` on macOS). Re-fetch any mismatch. Target: all PASS, 0 FAIL.

5. **Tear down**: `DROP VIEW public._mig_export_tmp; NOTIFY pgrst, 'reload
   schema';` and delete the Node script.

Commit the backfilled files on their own (e.g. `cde1b3e`).

> Why a view + service role rather than the MCP `execute_sql` result? Both can
> read the bodies, but only the Node path writes bytes to disk without the
> model re-emitting them. The md5 check is the backstop either way.

## Verification (run after any fix)

1. `supabase migration list` — every row has `Local == Remote`, no blanks.
2. `comm` of local stems vs live ledger — 0 local-only, 0 remote-only.
3. Counts match: local `*.sql` count == `SELECT count(*) FROM
   supabase_migrations.schema_migrations`.
4. For Gap B, md5 of every backfilled file matches the ledger.

## Cleanup

Remove scratch files from `/tmp` (`remote_*.txt`, `local_*.txt`,
`gap*.txt`, `gapA.sql`, the Node script) and drop the temporary export view.
These live in the OS temp dir, not the repo, and nothing depends on them.
