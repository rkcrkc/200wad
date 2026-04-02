#!/usr/bin/env npx tsx
/**
 * Import help/glossary entries from RTF files
 *
 * Usage:
 *   npx tsx scripts/import-help-entries.ts
 *
 * Reads RTF files from /Windows/Glossary/ directory, converts to text,
 * categorizes, and upserts into the help_entries table.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Load env vars from .env.local if running locally
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================================
// Category mapping
// ============================================================================

const CATEGORY_MAP: Record<string, string> = {
  // Getting Started
  "200 words a day": "Getting Started",
  "How to Use the Course": "Getting Started",
  "Finding your way around the course": "Getting Started",
  "Navigation": "Getting Started",
  "Log in": "Getting Started",
  "Password": "Getting Started",
  "Master Password": "Getting Started",
  "Users": "Getting Started",
  "Exit": "Getting Started",
  "Contact us": "Getting Started",
  "Acknowledgements": "Getting Started",
  "Acknowledgements Photographs": "Getting Started",
  "Bibliography and Recommended Reading": "Getting Started",
  "help-ways to get help": "Getting Started",
  "Right clicking for help": "Getting Started",

  // Learning
  "Learning Words": "Learning",
  "Learning Styles": "Learning",
  "Auditory Learning": "Learning",
  "Visual Learning": "Learning",
  "Kinesthetic Learning": "Learning",
  "Multi-Modal Learning": "Learning",
  "Accelerated Learning": "Learning",
  "Excelearning": "Learning",
  "Superlearning": "Learning",
  "Memory Trigger": "Learning",
  "Visualization": "Learning",
  "association": "Learning",
  "Flashcards": "Learning",
  "Clue": "Learning",
  "Lesson": "Learning",
  "Lesson in Random Sequence": "Learning",
  "Select a Lesson of your Choice": "Learning",
  "Build a Lesson": "Learning",
  "Special Lessons": "Learning",
  "Automatic mode": "Learning",
  "Rapid Mode": "Learning",
  "Continue": "Learning",
  "Repeat": "Learning",
  "Previous": "Learning",
  "Fast Forward": "Learning",
  "Picture or animation": "Learning",
  "Ignore button": "Learning",
  "Mastery": "Learning",

  // Testing
  "Test": "Testing",
  "how to Test Yourself": "Testing",
  "Testing Options": "Testing",
  "Lesson Pre Test Settings": "Testing",
  "Test in Random Sequence": "Testing",
  "Test Twice": "Testing",
  "Initial Test": "Testing",
  "24 Hour Test": "Testing",
  "Weekly Test": "Testing",
  "Monthly Test": "Testing",
  "Quarterly Test": "Testing",
  "Annual Test": "Testing",
  "Other Test": "Testing",
  "Scheduled Test": "Testing",
  "Tests Due": "Testing",
  "schedule": "Testing",
  "Retesting": "Testing",
  "Copy of Test": "Testing",
  "Retype Button": "Testing",
  "Lenient Marking": "Testing",
  "Pause Before Correct Answer": "Testing",

  // Study Mode
  "Breathing": "Study Mode",
  "Breathe In signal": "Study Mode",
  "Breathe Out signal": "Study Mode",
  "Hold Signal": "Study Mode",
  "Alpha state": "Study Mode",
  "Beta state": "Study Mode",
  "Rhythm": "Study Mode",
  "Summary": "Study Mode",
  "Time Lessons": "Study Mode",
  "Time Tests": "Study Mode",

  // Words & Vocabulary
  "Vocabulary": "Words & Vocabulary",
  "Words Page": "Words & Vocabulary",
  "Words Learned": "Words & Vocabulary",
  "Total Words Learned": "Words & Vocabulary",
  "Words per Day": "Words & Vocabulary",
  "Words I Dont Know": "Words & Vocabulary",
  "My Best Words": "Words & Vocabulary",
  "My Worst Words": "Words & Vocabulary",
  "Best-Worst Word Indicator": "Words & Vocabulary",
  "Find a Word": "Words & Vocabulary",
  "Find": "Words & Vocabulary",
  "Dictionary": "Words & Vocabulary",
  "English Italian Dictionary": "Words & Vocabulary",
  "Italian English dictionary": "Words & Vocabulary",
  "Alphabetical Order": "Words & Vocabulary",
  "Compound Words": "Words & Vocabulary",
  "False Friends": "Words & Vocabulary",
  "Words Similar in Italian and English": "Words & Vocabulary",
  "Random Words- not in Vocabulary": "Words & Vocabulary",
  "Abbreviations": "Words & Vocabulary",
  "Accented Words": "Words & Vocabulary",

  // Grammar
  "Grammar": "Grammar",
  "Grammar Slammer": "Grammar",
  "Article": "Grammar",
  "Noun": "Grammar",
  "Verb": "Grammar",
  "Adjective": "Grammar",
  "Adverb": "Grammar",
  "Pronoun": "Grammar",
  "Preposition": "Grammar",
  "Conjunction": "Grammar",
  "Numeral": "Grammar",
  "Phrase": "Grammar",
  "Exclamation": "Grammar",
  "Question": "Grammar",
  "Gender": "Grammar",
  "Gender Trigger": "Grammar",
  "Masculine": "Grammar",
  "Feminine": "Grammar",
  "Neuter": "Grammar",
  "Singular": "Grammar",
  "Plural": "Grammar",
  "Formal": "Grammar",
  "Informal": "Grammar",
  "Reflexive verb": "Grammar",
  "Relative clause": "Grammar",
  "Imperfect": "Grammar",
  "Preterit": "Grammar",
  "Elliptical": "Grammar",
  "Sentences": "Grammar",
  "Voice Gender Trigger": "Grammar",

  // Settings & Preferences
  "Settings": "Settings & Preferences",
  "Colour coding": "Settings & Preferences",
  "My Notes": "Settings & Preferences",
  "Notes": "Settings & Preferences",
  "Student Notes": "Settings & Preferences",
  "View All": "Settings & Preferences",

  // Music & Audio
  "Music": "Music & Audio",
  "Background Music": "Music & Audio",
  "Background Music during Summary": "Music & Audio",
  "Baroque Music": "Music & Audio",
  "Beats per minute": "Music & Audio",
  "Tunes": "Music & Audio",
  "Volume": "Music & Audio",
  "Foreign Sound": "Music & Audio",
  "Corelli Concerto 8 Opus 6 Largo": "Music & Audio",
  "Vivaldi 4 Seasons Winter Largo": "Music & Audio",
  "Vivaldi Concerto Opus 4 No 1 Largo": "Music & Audio",

  // Foreign Characters
  "Foreign Characters": "Foreign Characters",
  "Typing Foreign Characters": "Foreign Characters",
  "Alt Numeric": "Foreign Characters",
  "Acute": "Foreign Characters",
  "Circumflex": "Foreign Characters",
  "Grave": "Foreign Characters",
  "Tilde": "Foreign Characters",
  "Umlaut": "Foreign Characters",
  "Cedilla": "Foreign Characters",
  "Dipthong": "Foreign Characters",
  "Ess tsett": "Foreign Characters",
  "Norwegian": "Foreign Characters",
  "Slash": "Foreign Characters",
  "Upside down Exclamation mark": "Foreign Characters",
  "Upside down Question mark": "Foreign Characters",
  "a": "Foreign Characters",
  "e": "Foreign Characters",
  "i": "Foreign Characters",
  "n": "Foreign Characters",
  "o": "Foreign Characters",
  "u": "Foreign Characters",

  // Interface
  "Main Menu": "Interface",
  "Shortcuts": "Interface",
  "Scroll Bar": "Interface",
  "Slide Control": "Interface",
  "Drill Down": "Interface",
  "Review Progress": "Interface",
  "Scores": "Interface",
  "Scoring": "Interface",
  "Overall Score": "Interface",
  "Grade": "Interface",
  "Day (score on Review Progress)": "Interface",
  "Details of Time and Scores": "Interface",
  "Forecast Statistics": "Interface",
  "Mistakes": "Interface",
  "Jump to Course": "Interface",
  "Auto Run": "Interface",

  // People & References
  "Dominic O Brien": "People & References",
  "Dr Bruno Furst": "People & References",
  "Georgi Lozanov": "People & References",
  "Paul Daniels": "People & References",
  "Celebrity": "People & References",
  "Famous person": "People & References",
  "Techniques of the Memory Masters": "People & References",

  // Technical
  "Acrobat Reader": "Technical",
  "pdf": "Technical",
  "Portable document file": "Technical",
  "Inc": "Technical",
  "Flag in the Spanish colours": "Technical",
  "Italian colours": "Technical",
  "Italian flag": "Technical",
  "Turboboosters": "Technical",
};

// ============================================================================
// Helpers
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function normalizeApostrophes(text: string): string {
  // Replace curly/smart quotes with straight apostrophes
  return text.replace(/[\u2018\u2019]/g, "'");
}

function convertHyperlinks(text: string): string {
  // Convert <hyperlink>Target</hyperlink> to [Target](/help/slug)
  return text.replace(/<hyperlink>([^<]+)<\/hyperlink>/g, (_, target: string) => {
    const slug = slugify(target.trim());
    return `[${target.trim()}](/help/${slug})`;
  });
}

function convertRtfToText(filePath: string): string {
  try {
    const output = execSync(`textutil -convert txt -stdout "${filePath}"`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    return output.trim();
  } catch (err) {
    console.error(`  Failed to convert: ${filePath}`, err);
    return "";
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const glossaryDir = path.resolve(process.cwd(), "../Windows/Glossary");

  if (!fs.existsSync(glossaryDir)) {
    console.error(`Glossary directory not found: ${glossaryDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(glossaryDir)
    .filter((f) => f.endsWith(".rtf"))
    .sort();

  console.log(`Found ${files.length} RTF files in ${glossaryDir}`);

  const entries: Array<{
    title: string;
    slug: string;
    content: string;
    category: string;
    is_published: boolean;
    sort_order: number;
  }> = [];

  const categoryCounts: Record<string, number> = {};
  const unmapped: string[] = [];

  for (const file of files) {
    const title = file.replace(/\.rtf$/, "");
    const filePath = path.join(glossaryDir, file);

    // Convert RTF to text
    let content = convertRtfToText(filePath);
    if (!content) {
      console.warn(`  Skipping empty file: ${file}`);
      continue;
    }

    // Remove leading title if it matches the filename (textutil often includes it)
    const lines = content.split("\n");
    if (lines[0]?.trim().toLowerCase() === title.toLowerCase()) {
      content = lines.slice(1).join("\n").trim();
    }

    // Normalize apostrophes
    content = normalizeApostrophes(content);
    const normalizedTitle = normalizeApostrophes(title);

    // Convert hyperlinks to markdown links
    content = convertHyperlinks(content);

    // Determine category
    const category = CATEGORY_MAP[title] || "General";
    if (!CATEGORY_MAP[title]) {
      unmapped.push(title);
    }

    // Track sort_order within category
    if (!categoryCounts[category]) categoryCounts[category] = 0;
    const sortOrder = categoryCounts[category]++;

    const slug = slugify(normalizedTitle);

    entries.push({
      title: normalizedTitle,
      slug,
      content,
      category,
      is_published: true,
      sort_order: sortOrder,
    });
  }

  if (unmapped.length > 0) {
    console.warn(`\nUnmapped entries (assigned to "General"):`);
    unmapped.forEach((t) => console.warn(`  - ${t}`));
  }

  console.log(`\nPrepared ${entries.length} entries across ${Object.keys(categoryCounts).length} categories:`);
  for (const [cat, count] of Object.entries(categoryCounts).sort()) {
    console.log(`  ${cat}: ${count}`);
  }

  // Batch upsert (50 at a time)
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    const { error } = await supabase
      .from("help_entries")
      .upsert(batch, { onConflict: "slug" });

    if (error) {
      console.error(`Error upserting batch ${i}-${i + batch.length}:`, error);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
