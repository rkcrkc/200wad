"use client";

import { Fragment, useState } from "react";
import type { SubscriptionLanguage } from "@/lib/queries/subscriptions";
import { LanguageSubscriptionRow } from "./LanguageSubscriptionRow";

interface LanguageSubscriptionsListProps {
  languages: SubscriptionLanguage[];
  /** Language ids the user can already access (individual or all-languages). */
  unlockedLanguageIds: string[];
  /** Whether per-row unlock CTAs are offered (free plan only). */
  canUnlockIndividually: boolean;
  /** Language id currently in the checkout cart, so its CTA shows "Selected". */
  selectedLanguageId: string | null;
  onUnlockLanguage: (lang: SubscriptionLanguage) => void;
}

export function LanguageSubscriptionsList({
  languages,
  unlockedLanguageIds,
  canUnlockIndividually,
  selectedLanguageId,
  onUnlockLanguage,
}: LanguageSubscriptionsListProps) {
  const [expandedLanguageIds, setExpandedLanguageIds] = useState<Set<string>>(new Set());

  function toggleExpand(languageId: string) {
    setExpandedLanguageIds((prev) => {
      const next = new Set(prev);
      if (next.has(languageId)) {
        next.delete(languageId);
      } else {
        next.add(languageId);
      }
      return next;
    });
  }

  return (
    // Full-width divider separates the header section from the languages list.
    <div className="border-t border-bone-hover">
      {/* Column headers */}
      <div className="grid items-center grid-cols-[minmax(0,240px)_minmax(0,180px)_1fr_220px_40px] px-8 pt-6 pb-3">
        <span className="text-xs-medium text-muted-foreground">Language</span>
        <span className="text-xs-medium text-muted-foreground"># Courses</span>
        <span className="text-xs-medium text-muted-foreground"># Lessons</span>
        <span />
        <span />
      </div>

      <div>
        {languages.map((lang, i) => {
          const accessUnlocked = unlockedLanguageIds.includes(lang.id);
          return (
            <Fragment key={lang.id}>
              {/* Inset row dividers respect the card's horizontal padding. */}
              {i > 0 && <div className="mx-8 border-t border-bone-hover" />}
              <LanguageSubscriptionRow
                lang={lang}
                accessUnlocked={accessUnlocked}
                showUnlockCta={canUnlockIndividually && !accessUnlocked}
                isSelected={selectedLanguageId === lang.id}
                isExpanded={expandedLanguageIds.has(lang.id)}
                onToggleExpand={() => toggleExpand(lang.id)}
                onUnlock={() => onUnlockLanguage(lang)}
              />
            </Fragment>
          );
        })}

        {languages.length === 0 && (
          <div className="px-8 py-12 text-center">
            <p className="text-sm text-muted-foreground">No languages available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
