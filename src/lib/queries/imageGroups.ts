import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/utils";
import type { WordImageGroup } from "@/types/aliases";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A word_image_groups row enriched for the admin CMS with its course name and
 * membership tallies.
 *
 * - `memberCount`   — words whose `image_group_id` points at this group.
 * - `overrideCount` — of those members, how many set their own
 *   `image_override_url` (i.e. do NOT inherit the master).
 */
export interface ImageGroupWithStats extends WordImageGroup {
  courseName: string | null;
  memberCount: number;
  overrideCount: number;
}

/** A single member word, for the read-only member list in the edit modal. */
export interface ImageGroupMember {
  id: string;
  english: string;
  headword: string;
  /** Effective, materialized URL the learner sees. */
  memory_trigger_image_url: string | null;
  /** Per-word override; NULL = inherits the group master. */
  image_override_url: string | null;
}

// ============================================================================
// ADMIN QUERIES
// ============================================================================

/**
 * Fetch every image group for the admin CMS, joined to its course name and
 * annotated with member/override counts.
 *
 * Uses the service-role client to bypass RLS (mirrors getAllLevelsAdmin). The
 * counts are computed by paginating the `words` membership columns and tallying
 * in JS — there are ~8k grouped words, beyond PostgREST's 1,000-row cap, so we
 * use `fetchAllRows`. Server-only; never import client-side.
 *
 * Ordered by course name then label so the table reads course-by-course.
 */
export async function getAllImageGroupsAdmin(): Promise<ImageGroupWithStats[]> {
  const supabase = createAdminClient();

  const [groupsResult, members] = await Promise.all([
    supabase
      .from("word_image_groups")
      .select("*, courses(name)")
      .order("label", { ascending: true }),
    fetchAllRows<{ image_group_id: string | null; image_override_url: string | null }>(
      (from, to) =>
        supabase
          .from("words")
          .select("image_group_id, image_override_url")
          .not("image_group_id", "is", null)
          .order("image_group_id", { ascending: true })
          .range(from, to),
      { label: "getAllImageGroupsAdmin.members" }
    ),
  ]);

  if (groupsResult.error) {
    console.error("Error fetching image groups (admin):", groupsResult.error);
    return [];
  }

  // Tally member + override counts per group.
  const memberCounts = new Map<string, number>();
  const overrideCounts = new Map<string, number>();
  for (const row of members) {
    if (!row.image_group_id) continue;
    memberCounts.set(
      row.image_group_id,
      (memberCounts.get(row.image_group_id) ?? 0) + 1
    );
    if (row.image_override_url) {
      overrideCounts.set(
        row.image_group_id,
        (overrideCounts.get(row.image_group_id) ?? 0) + 1
      );
    }
  }

  type GroupJoinRow = WordImageGroup & { courses: { name: string } | null };
  const groups = (groupsResult.data ?? []) as GroupJoinRow[];

  const enriched = groups.map(({ courses, ...group }) => ({
    ...group,
    courseName: courses?.name ?? null,
    memberCount: memberCounts.get(group.id) ?? 0,
    overrideCount: overrideCounts.get(group.id) ?? 0,
  }));

  // Sort by course name then label (nulls last on course).
  enriched.sort((a, b) => {
    const courseA = a.courseName ?? "\uffff";
    const courseB = b.courseName ?? "\uffff";
    if (courseA !== courseB) return courseA.localeCompare(courseB);
    return (a.label ?? "").localeCompare(b.label ?? "");
  });

  return enriched;
}

/**
 * List the words that belong to a group, for the modal's read-only member list.
 * Service-role; server-only. Ordered by English text for a stable display.
 */
export async function getImageGroupMembers(
  groupId: string
): Promise<ImageGroupMember[]> {
  const supabase = createAdminClient();

  const rows = await fetchAllRows<ImageGroupMember>(
    (from, to) =>
      supabase
        .from("words")
        .select(
          "id, english, headword, memory_trigger_image_url, image_override_url"
        )
        .eq("image_group_id", groupId)
        .order("english", { ascending: true })
        .range(from, to),
    { label: "getImageGroupMembers" }
  );

  return rows;
}
