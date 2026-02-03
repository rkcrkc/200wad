"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, X, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  setCurrentLanguage,
  removeLanguage,
} from "@/lib/mutations/settings";
import type { LearningLanguage } from "@/lib/queries/settings";
import { getFlagFromCode } from "@/lib/utils/flags";

interface LearningLanguagesSectionProps {
  languages: LearningLanguage[];
}

export function LearningLanguagesSection({
  languages,
}: LearningLanguagesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleSetCurrent = (languageId: string) => {
    setError(null);
    setPendingAction(`current-${languageId}`);

    startTransition(async () => {
      const result = await setCurrentLanguage(languageId);
      setPendingAction(null);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to set current language");
      }
    });
  };

  const handleRemove = (languageId: string, languageName: string) => {
    if (
      !confirm(`Remove ${languageName} from your learning languages?`)
    ) {
      return;
    }

    setError(null);
    setPendingAction(`remove-${languageId}`);

    startTransition(async () => {
      const result = await removeLanguage(languageId);
      setPendingAction(null);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to remove language");
      }
    });
  };

  const isOnlyLanguage = languages.length === 1;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="mb-1 text-xl font-semibold">Learning Languages</h2>
          <p className="text-sm text-gray-600">
            Manage the languages you&apos;re learning (minimum 1 required)
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="text-primary hover:bg-primary/10"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Language
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {languages.map((language) => {
          const isCurrentPending = pendingAction === `current-${language.id}`;
          const isRemovePending = pendingAction === `remove-${language.id}`;

          return (
            <div
              key={language.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-all hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-2xl">
                  {getFlagFromCode(language.code)}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium">{language.name}</p>
                    {language.isCurrent && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {language.courseCount} course
                    {language.courseCount !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!language.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetCurrent(language.id)}
                    disabled={isPending}
                    className="text-primary hover:bg-primary/10"
                  >
                    {isCurrentPending ? (
                      "Setting..."
                    ) : (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Set Current
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(`/courses/${language.id}`)
                  }
                  className="text-primary hover:bg-primary/10"
                >
                  <BookOpen className="mr-1 h-4 w-4" />
                  View
                </Button>

                {!isOnlyLanguage ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(language.id, language.name)}
                    disabled={isPending}
                    className="text-red-600 hover:bg-red-50"
                  >
                    {isRemovePending ? (
                      "Removing..."
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <div
                    className="cursor-not-allowed px-3 py-1.5 text-sm text-gray-400"
                    title="Cannot remove your only language"
                  >
                    <Lock className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {languages.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="mb-2 text-gray-600">
              You haven&apos;t added any languages yet.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Language
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
