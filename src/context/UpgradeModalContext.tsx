"use client";

import { createContext, useContext, type ReactNode } from "react";

interface UpgradeModalContextValue {
  /** Open the dashboard's upgrade modal. */
  openUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | undefined>(
  undefined
);

export function UpgradeModalProvider({
  openUpgradeModal,
  children,
}: {
  openUpgradeModal: () => void;
  children: ReactNode;
}) {
  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal }}>
      {children}
    </UpgradeModalContext.Provider>
  );
}

/** Returns the upgrade-modal opener if a provider is mounted, else null. */
export function useUpgradeModal(): UpgradeModalContextValue | null {
  return useContext(UpgradeModalContext) ?? null;
}
