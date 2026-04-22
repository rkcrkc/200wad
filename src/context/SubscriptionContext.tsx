"use client";

import { createContext, useContext, ReactNode } from "react";

export interface SimpleSubscription {
  type: "course" | "language" | "all-languages";
  targetId: string | null;
  isEffective: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
}

interface SubscriptionContextValue {
  subscriptions: SimpleSubscription[];
  hasLanguageAccess: (languageId: string) => boolean;
  hasAllLanguagesAccess: boolean;
  /** Date when the user's current access ends (if cancelling), or null */
  accessEndDate: (languageId?: string) => string | null;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscriptions: [],
  hasLanguageAccess: () => false,
  hasAllLanguagesAccess: false,
  accessEndDate: () => null,
});

interface SubscriptionProviderProps {
  children: ReactNode;
  subscriptions: SimpleSubscription[];
}

export function SubscriptionProvider({ children, subscriptions }: SubscriptionProviderProps) {
  const effective = subscriptions.filter((s) => s.isEffective);

  const hasAllLanguagesAccess = effective.some((s) => s.type === "all-languages");

  const hasLanguageAccess = (languageId: string): boolean => {
    if (hasAllLanguagesAccess) return true;
    return effective.some(
      (s) => s.type === "language" && s.targetId === languageId
    );
  };

  const accessEndDate = (languageId?: string): string | null => {
    // Check all-languages sub first
    const allLangsSub = effective.find((s) => s.type === "all-languages");
    if (allLangsSub?.cancelAtPeriodEnd && allLangsSub.currentPeriodEnd) {
      return allLangsSub.currentPeriodEnd;
    }
    // Check language-specific sub
    if (languageId) {
      const langSub = effective.find(
        (s) => s.type === "language" && s.targetId === languageId
      );
      if (langSub?.cancelAtPeriodEnd && langSub.currentPeriodEnd) {
        return langSub.currentPeriodEnd;
      }
    }
    return null;
  };

  return (
    <SubscriptionContext.Provider
      value={{ subscriptions, hasLanguageAccess, hasAllLanguagesAccess, accessEndDate }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
