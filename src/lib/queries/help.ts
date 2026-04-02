import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HelpEntry } from "@/types/database";

/**
 * Get published help entries filtered by language.
 * If languageCode is provided: returns universal entries (language_codes IS NULL)
 * plus entries that include the given language code.
 * If no languageCode: returns only universal entries.
 */
export async function getHelpEntries(languageCode?: string): Promise<HelpEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("help_entries")
    .select("*");

  if (languageCode) {
    query = query.or(`language_codes.is.null,language_codes.cs.{"${languageCode}"}`);
  } else {
    query = query.is("language_codes", null);
  }

  const { data, error } = await query
    .order("category")
    .order("sort_order")
    .order("title");

  if (error) {
    console.error("Error fetching help entries:", error);
    return [];
  }

  return data;
}

/**
 * Get all help entries (including unpublished) for admin.
 * Uses admin client to bypass RLS.
 */
export async function getHelpEntriesAdmin(): Promise<HelpEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("help_entries")
    .select("*")
    .order("category")
    .order("sort_order")
    .order("title");

  if (error) {
    console.error("Error fetching admin help entries:", error);
    return [];
  }

  return data;
}
