import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tip } from "@/types/database";

/** Tip data relevant for display on a word in study mode */
export interface TipForWord {
  id: string;
  title: string | null;
  body: string;
  emoji: string | null;
  sort_order: number | null;
}

/**
 * Batch fetch all active tips linked to a set of word IDs,
 * plus the current user's dismissals.
 * Returns a map of wordId → tips[], and a set of dismissed tip IDs.
 */
export async function getTipsForWords(
  wordIds: string[],
  userId: string | null
): Promise<{
  tipsByWordId: Record<string, TipForWord[]>;
  dismissedTipIds: string[];
}> {
  if (wordIds.length === 0) {
    return { tipsByWordId: {}, dismissedTipIds: [] };
  }

  const supabase = await createClient();

  // Fetch tip_words for the given word IDs, joining with tips
  const { data: tipWords } = await supabase
    .from("tip_words")
    .select("word_id, tip_id, sort_order, tips(id, title, body, emoji, sort_order, is_active)")
    .in("word_id", wordIds);

  // Build the map
  const tipsByWordId: Record<string, TipForWord[]> = {};
  const seenTipIds = new Set<string>();

  (tipWords || []).forEach((tw) => {
    const tip = tw.tips as unknown as Tip | null;
    if (!tip || !tip.is_active) return;

    if (!tipsByWordId[tw.word_id]) {
      tipsByWordId[tw.word_id] = [];
    }

    tipsByWordId[tw.word_id].push({
      id: tip.id,
      title: tip.title,
      body: tip.body,
      emoji: tip.emoji,
      sort_order: tip.sort_order,
    });

    seenTipIds.add(tip.id);
  });

  // Sort tips within each word by sort_order
  Object.values(tipsByWordId).forEach((tips) => {
    tips.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  });

  // Fetch user dismissals
  let dismissedTipIds: string[] = [];
  if (userId && seenTipIds.size > 0) {
    const { data: dismissals } = await supabase
      .from("user_tip_dismissals")
      .select("tip_id")
      .eq("user_id", userId)
      .in("tip_id", Array.from(seenTipIds));

    dismissedTipIds = (dismissals || []).map((d) => d.tip_id);
  }

  return { tipsByWordId, dismissedTipIds };
}

/** Admin: fetch all tips with linked word count */
export interface TipWithWordCount extends Tip {
  wordCount: number;
  linkedWords: { id: string; headword: string; english: string }[];
}

export async function getAllTips(): Promise<TipWithWordCount[]> {
  const supabase = createAdminClient();

  const { data: tips } = await supabase
    .from("tips")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (!tips || tips.length === 0) return [];

  // Fetch all tip_words with word details
  const tipIds = tips.map((t) => t.id);
  const { data: tipWords } = await supabase
    .from("tip_words")
    .select("tip_id, words(id, headword, english)")
    .in("tip_id", tipIds);

  // Build map of tip_id → linked words
  const wordsByTipId: Record<string, { id: string; headword: string; english: string }[]> = {};
  (tipWords || []).forEach((tw) => {
    const word = tw.words as unknown as { id: string; headword: string; english: string } | null;
    if (!word) return;
    if (!wordsByTipId[tw.tip_id]) {
      wordsByTipId[tw.tip_id] = [];
    }
    wordsByTipId[tw.tip_id].push(word);
  });

  return tips.map((tip) => ({
    ...tip,
    wordCount: wordsByTipId[tip.id]?.length ?? 0,
    linkedWords: wordsByTipId[tip.id] ?? [],
  }));
}

/** Admin: fetch tips linked to a specific word */
export async function getTipsByWordId(
  wordId: string
): Promise<TipForWord[]> {
  const supabase = createAdminClient();

  const { data: tipWords } = await supabase
    .from("tip_words")
    .select("tip_id, tips(id, title, body, emoji, sort_order, is_active)")
    .eq("word_id", wordId);

  if (!tipWords) return [];

  return tipWords
    .map((tw) => {
      const tip = tw.tips as unknown as Tip | null;
      if (!tip) return null;
      return {
        id: tip.id,
        title: tip.title,
        body: tip.body,
        emoji: tip.emoji,
        sort_order: tip.sort_order,
      };
    })
    .filter((t): t is TipForWord => t !== null);
}
