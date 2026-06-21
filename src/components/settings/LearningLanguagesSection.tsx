"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Lock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { removeLanguage } from "@/lib/mutations/settings";
import type { LearningLanguage } from "@/lib/queries/settings";
import { getFlagFromCode } from "@/lib/utils/flags";
import { mapStatus } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (languageId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(languageId)) {
        next.delete(languageId);
      } else {
        next.add(languageId);
      }
      return next;
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
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-card">
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
          const isRemovePending = pendingAction === `remove-${language.id}`;
          const isExpanded = expanded.has(language.id);

          return (
            <div
              key={language.id}
              className="overflow-hidden rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between p-4">
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

                <div className="flex items-center gap-1">
                  {!isOnlyLanguage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(language.id, language.name)}
                      disabled={isPending}
                      aria-label={`Remove ${language.name}`}
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

                  <button
                    type="button"
                    onClick={() => toggleExpanded(language.id)}
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? `Hide ${language.name} courses`
                        : `Show ${language.name} courses`
                    }
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50/50 p-2">
                  {language.courses.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-gray-500">
                      No courses available yet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {language.courses.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() =>
                            router.push(`/course/${course.id}/schedule`)
                          }
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white",
                            course.isCurrent && "bg-white"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {course.name}
                          </span>
                          {course.isCurrent && (
                            <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Current
                            </span>
                          )}
                          <StatusPill status={mapStatus(course.status)} size="sm" />
                          <span className="w-10 shrink-0 text-right text-sm tabular-nums text-gray-600">
                            {course.progressPercent}%
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
