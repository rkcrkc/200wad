"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Loader2 } from "lucide-react";
import { getFlagFromCode } from "@/lib/utils/flags";
import { addLanguage, removeLanguage } from "@/lib/mutations/settings";
import type { LanguageWithProgress } from "@/lib/queries";

/**
 * A card-shaped button (sized to sit at the end of the language card row) that
 * opens a dropdown listing every language with a check toggle. Selecting a
 * language enrols the user (adds it to "My Languages"); deselecting removes it.
 * The user must always keep at least one language, so the last enrolled toggle
 * is disabled.
 */
export function ManageLanguagesMenu({
  languages,
}: {
  languages: LanguageWithProgress[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const enrolledCount = languages.filter((l) => l.isEnrolled).length;
  const availableNames = languages
    .filter((l) => !l.isEnrolled)
    .map((l) => l.name);

  // Close the menu on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = (language: LanguageWithProgress) => {
    if (isPending) return;
    setError(null);
    setPendingId(language.id);
    startTransition(async () => {
      const result = language.isEnrolled
        ? await removeLanguage(language.id)
        : await addLanguage(language.id);
      setPendingId(null);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Something went wrong");
      }
    });
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-full min-h-[7.5rem] w-44 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 px-3 text-muted-foreground transition-colors hover:border-black/30 hover:bg-bone-hover"
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-medium">Add languages</span>
        {availableNames.length > 0 && (
          <span className="line-clamp-2 text-center text-xs text-muted-foreground/70">
            {availableNames.join(", ")}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-xl bg-white py-1 shadow-panel"
        >
          <p className="px-4 py-2 text-xs-medium text-muted-foreground">
            Select the languages you want to learn
          </p>
          {languages.map((language) => {
            const flag = getFlagFromCode(language.code);
            const loading = pendingId === language.id;
            const lastOne = language.isEnrolled && enrolledCount <= 1;
            return (
              <button
                key={language.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={language.isEnrolled}
                onClick={() => toggle(language)}
                disabled={isPending || lastOne}
                title={
                  lastOne ? "You must keep at least one language" : undefined
                }
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-xl">{flag}</span>
                <span className="min-w-0 flex-1 truncate">{language.name}</span>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : language.isEnrolled ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : null}
              </button>
            );
          })}
          {error && (
            <p className="px-4 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
