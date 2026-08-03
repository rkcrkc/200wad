"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ListSearchValue {
  query: string;
  setQuery: (value: string) => void;
}

const ListSearchContext = createContext<ListSearchValue | null>(null);

/**
 * Shares one search query between a page's header controls and its list
 * component. Needed on pages where the header (with the mobile stats dropdown
 * and its trailing search) and the filterable list live in sibling components —
 * the header search and the list filter must read/write the same query.
 */
export function ListSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return (
    <ListSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </ListSearchContext.Provider>
  );
}

/**
 * Returns the shared query when rendered inside a {@link ListSearchProvider},
 * otherwise falls back to component-local state so the same list components keep
 * working standalone (e.g. the App UI catalog previews) without a provider.
 */
export function useListSearch(): ListSearchValue {
  const ctx = useContext(ListSearchContext);
  const [localQuery, setLocalQuery] = useState("");
  if (ctx) return ctx;
  return { query: localQuery, setQuery: setLocalQuery };
}
