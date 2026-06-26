"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  UpgradeModal,
  type UpgradeLanguageOption,
  type AllLanguagesStats,
} from "@/components/UpgradeModal";
import type { PricingPlan } from "@/types/database";
import type { PricingTierCopyMap } from "@/lib/queries/subscriptions";

/** The language a row wants to upgrade. Drives the modal's language tier. */
export interface UpgradeTarget {
  languageId: string;
  languageName: string;
  languageFlag: string;
}

interface LanguagesUpgradeContextValue {
  /** Open targeting a specific language (shows its language tier). */
  openUpgrade: (target: UpgradeTarget) => void;
  /** Open with no language target (all-languages tier only). */
  openUpgradeAllLanguages: () => void;
}

const LanguagesUpgradeContext =
  createContext<LanguagesUpgradeContextValue | null>(null);

/**
 * Dashboard-local upgrade flow. The global UpgradeModalContext targets a single
 * course's language (via CourseContext) and isn't mounted on /dashboard, so the
 * Manage Languages page provides its own opener that takes an explicit language
 * target — letting each accordion row upgrade its own language.
 */
export function LanguagesUpgradeProvider({
  plans,
  enabledTiers,
  freeLessons,
  languages,
  defaultLanguageId,
  allLanguagesStats,
  copy,
  children,
}: {
  plans: PricingPlan[];
  enabledTiers: string[];
  freeLessons: number;
  /** Languages selectable for the single-language tier (not-yet-unlocked). */
  languages?: UpgradeLanguageOption[];
  /** Language pre-selected in the modal's picker (e.g. the current one). */
  defaultLanguageId?: string;
  /** Content totals across every language, shown on the All Languages card. */
  allLanguagesStats?: AllLanguagesStats;
  /** Admin-editable card copy keyed by tier. */
  copy?: PricingTierCopyMap;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<UpgradeTarget | null>(null);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    defaultLanguageId ?? null
  );

  const openUpgrade = (t: UpgradeTarget) => {
    setTarget(t);
    setSelectedLanguageId(t.languageId);
    setOpen(true);
  };
  const openUpgradeAllLanguages = () => {
    setTarget(null);
    setSelectedLanguageId(defaultLanguageId ?? languages?.[0]?.id ?? null);
    setOpen(true);
  };

  return (
    <LanguagesUpgradeContext.Provider
      value={{ openUpgrade, openUpgradeAllLanguages }}
    >
      {children}
      <UpgradeModal
        isOpen={open}
        onClose={() => setOpen(false)}
        languageId={target?.languageId}
        languageName={target?.languageName}
        languageFlag={target?.languageFlag}
        languages={languages}
        selectedLanguageId={selectedLanguageId}
        onSelectLanguage={setSelectedLanguageId}
        allLanguagesStats={allLanguagesStats}
        copy={copy}
        plans={plans}
        enabledTiers={enabledTiers}
        freeLessons={freeLessons}
      />
    </LanguagesUpgradeContext.Provider>
  );
}

export function useLanguagesUpgrade(): LanguagesUpgradeContextValue {
  const ctx = useContext(LanguagesUpgradeContext);
  if (!ctx) {
    throw new Error(
      "useLanguagesUpgrade must be used within a LanguagesUpgradeProvider"
    );
  }
  return ctx;
}
