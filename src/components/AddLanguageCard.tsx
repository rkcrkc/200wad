"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { addLanguage } from "@/lib/mutations/settings";
import { getFlagFromCode } from "@/lib/utils/flags";

interface AvailableLanguage {
  id: string;
  name: string;
  code: string;
}

interface AddLanguageCardProps {
  availableLanguages: AvailableLanguage[];
}

export function AddLanguageCard({ availableLanguages }: AddLanguageCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (!isPending) setIsOpen(false);
  }, [isPending]);

  // Escape to close + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, close]);

  const handleSelect = (languageId: string) => {
    setError(null);
    setPendingId(languageId);
    startTransition(async () => {
      const result = await addLanguage(languageId);
      if (result.success) {
        setIsOpen(false);
        // Take the user to the new language's courses to pick where to start.
        router.push(`/courses/${languageId}`);
      } else {
        setError(result.error || "Failed to add language");
        setPendingId(null);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-6 transition-all hover:border-primary/50 hover:from-blue-50 hover:to-purple-50"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white transition-all group-hover:bg-primary/10">
          <Plus className="h-8 w-8 text-gray-400 group-hover:text-primary" />
        </div>
        <h3 className="mb-2 text-xl text-gray-700 group-hover:text-gray-900">
          Add a language
        </h3>
        <p className="text-center text-sm text-gray-500">
          Start learning a new language today
        </p>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={close}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add a language"
            className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-large-semibold">Add a language</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a language to start learning
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {error && (
                <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {availableLanguages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  You&apos;re already learning every available language.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableLanguages.map((language) => {
                    const isThisPending = pendingId === language.id;
                    return (
                      <button
                        key={language.id}
                        type="button"
                        onClick={() => handleSelect(language.id)}
                        disabled={isPending}
                        className="flex w-full items-center gap-4 rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-primary/50 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-2xl">
                          {getFlagFromCode(language.code)}
                        </div>
                        <span className="flex-1 font-medium">{language.name}</span>
                        {isThisPending ? (
                          <span className="text-sm text-muted-foreground">
                            Adding…
                          </span>
                        ) : (
                          <Plus className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
