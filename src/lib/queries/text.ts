import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/static";
import { TEXT_CATEGORIES } from "@/lib/text";

export interface GetTextOverridesResult {
  overrides: Record<string, string>;
  error: string | null;
}

/**
 * Fetch all text overrides from platform_config.
 * Each category is stored as a separate key (e.g. `text_tooltips_popovers`)
 * whose value is a JSON object of `{ textKey: overriddenValue }`.
 *
 * Returns a flat map merging every category's overrides.
 *
 * Cached for 1 hour. Admin config mutations call
 * `updateTag("text-overrides")` to force refresh.
 */
export const getTextOverrides = unstable_cache(
  async (): Promise<GetTextOverridesResult> => {
    try {
      const supabase = createStaticClient();

      const configKeys = TEXT_CATEGORIES.map((c) => c.configKey);

      const { data, error } = await supabase
        .from("platform_config")
        .select("key, value")
        .in("key", configKeys);

      if (error) {
        return { overrides: {}, error: error.message };
      }

      const overrides: Record<string, string> = {};

      for (const row of data ?? []) {
        if (row.value && typeof row.value === "object" && !Array.isArray(row.value)) {
          for (const [k, v] of Object.entries(row.value as Record<string, unknown>)) {
            if (typeof v === "string" && v.length > 0) {
              overrides[k] = v;
            }
          }
        }
      }

      return { overrides, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { overrides: {}, error: message };
    }
  },
  ["text-overrides"],
  { revalidate: 3600, tags: ["text-overrides"] }
);
