"use server";

import { getWord } from "@/lib/queries/words";
import type { WordWithDetails } from "@/lib/queries/words";

export async function fetchWordDetails(
  wordId: string
): Promise<{ word: WordWithDetails | null }> {
  const { word } = await getWord(wordId);
  return { word };
}
