"use client";

import { InlineSearch } from "@/components/InlineSearch";
import { useListSearch } from "@/context/ListSearchContext";

/**
 * InlineSearch pre-bound to the shared {@link useListSearch} query. Lets the
 * page header host the search control while the list component (rendered
 * elsewhere in the tree) does the actual filtering off the same query.
 */
export function ListSearchInput({ placeholder }: { placeholder?: string }) {
  const { query, setQuery } = useListSearch();
  return <InlineSearch value={query} onChange={setQuery} placeholder={placeholder} />;
}
