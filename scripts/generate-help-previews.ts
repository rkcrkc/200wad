/**
 * Generate preview text for all help entries where preview IS NULL.
 *
 * Usage:  npx tsx scripts/generate-help-previews.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function generatePreview(content: string): string {
  // Strip markdown links [text](url) → text
  let text = content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Strip bold/italic markers
  text = text.replace(/(\*{1,3}|_{1,3})/g, "");
  // Strip headings markers
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Strip bullet markers
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  // Strip numbered list markers
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  // Collapse newlines into spaces
  text = text.replace(/\n+/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Try to extract the first sentence (up to . ! ? within 200 chars)
  const sentenceMatch = text.slice(0, 200).match(/^(.+?[.!?])\s/);
  if (sentenceMatch && sentenceMatch[1].length >= 20) {
    return sentenceMatch[1];
  }

  // Truncate at ~150 chars on a word boundary
  if (text.length <= 150) return text;
  const truncated = text.slice(0, 150);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

async function main() {
  // Fetch entries with no preview
  const { data: entries, error } = await supabase
    .from("help_entries")
    .select("id, title, content")
    .is("preview", null);

  if (error) {
    console.error("Error fetching entries:", error);
    process.exit(1);
  }

  if (!entries || entries.length === 0) {
    console.log("All entries already have previews. Nothing to do.");
    return;
  }

  console.log(`Generating previews for ${entries.length} entries...`);

  let updated = 0;
  for (const entry of entries) {
    const preview = generatePreview(entry.content);
    const { error: updateError } = await supabase
      .from("help_entries")
      .update({ preview })
      .eq("id", entry.id);

    if (updateError) {
      console.error(`  Error updating "${entry.title}":`, updateError.message);
    } else {
      updated++;
      console.log(`  [${updated}/${entries.length}] ${entry.title}: "${preview.slice(0, 60)}..."`);
    }
  }

  console.log(`\nDone. Updated ${updated}/${entries.length} entries.`);
}

main();
