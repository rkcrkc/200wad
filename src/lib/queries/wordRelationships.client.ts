"use client";

import { createClient } from "@/lib/supabase/client";

export interface RelatedWord {
  id: string;
  headword: string;
  english: string;
  relationship_type: string;
  relationship_id: string;
}

export interface WordRelationshipsResult {
  relatedWords: RelatedWord[];
  error: string | null;
}

/**
 * Fetch all word relationships for a given word (client-side)
 */
export async function getWordRelationships(wordId: string): Promise<WordRelationshipsResult> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("word_relationships")
    .select(`
      id,
      relationship_type,
      related_word:words!word_relationships_related_word_id_fkey(id, headword, english)
    `)
    .eq("word_id", wordId);

  if (error) {
    return { relatedWords: [], error: error.message };
  }

  const relatedWords: RelatedWord[] = (data || []).map((row) => {
    const relatedWord = row.related_word as { id: string; headword: string; english: string } | null;
    return {
      id: relatedWord?.id || "",
      headword: relatedWord?.headword || "",
      english: relatedWord?.english || "",
      relationship_type: row.relationship_type,
      relationship_id: row.id,
    };
  }).filter(w => w.id);

  return { relatedWords, error: null };
}

/**
 * Search for words to add as related (client-side)
 */
export async function searchWordsForRelationship(
  searchQuery: string,
  excludeWordId: string,
  limit = 20
): Promise<{ words: { id: string; headword: string; english: string }[]; error: string | null }> {
  if (!searchQuery.trim()) {
    return { words: [], error: null };
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("words")
    .select("id, headword, english")
    .or(`headword.ilike.%${searchQuery}%,english.ilike.%${searchQuery}%`)
    .neq("id", excludeWordId)
    .limit(limit);

  if (error) {
    return { words: [], error: error.message };
  }

  return { words: data || [], error: null };
}

/**
 * Add a word relationship (client-side)
 */
export async function addWordRelationship(
  wordId: string,
  relatedWordId: string,
  relationshipType: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("word_relationships")
    .insert({
      word_id: wordId,
      related_word_id: relatedWordId,
      relationship_type: relationshipType,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Remove a word relationship (client-side)
 */
export async function removeWordRelationship(
  relationshipId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("word_relationships")
    .delete()
    .eq("id", relationshipId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
