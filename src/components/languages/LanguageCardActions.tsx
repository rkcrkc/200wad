"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { ActionMenu } from "@/components/subscriptions/ActionMenu";
import { ConfirmModal } from "@/components/admin/AdminModal";
import {
  addLanguageConfirmCopy,
  removeLanguageConfirmCopy,
} from "@/components/languages/enrollmentCopy";
import { addLanguage, removeLanguage } from "@/lib/mutations/settings";
import type { LanguageWithProgress } from "@/lib/queries";

/**
 * Trailing control for a language card on the Courses page. Enrolled ("My
 * Languages") cards get an ellipsis menu whose sole action removes the language;
 * available cards get a "+" that enrols it. Both flows confirm first, run the
 * mutation in a transition, then refresh the page so the card moves between the
 * "My" and "Available" sections. Enrollment is organisational only (it surfaces
 * the language in the course switcher) — progress is never affected either way.
 */
export function LanguageCardActions({
  language,
  canRemove,
}: {
  language: LanguageWithProgress;
  /** False when this is the user's only enrolled language (removal is blocked). */
  canRemove: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isEnrolled = language.isEnrolled;
  const copy = isEnrolled
    ? removeLanguageConfirmCopy(language.name)
    : addLanguageConfirmCopy(language.name);

  const handleConfirm = () => {
    startTransition(async () => {
      const result = isEnrolled
        ? await removeLanguage(language.id)
        : await addLanguage(language.id);
      if (result.success) {
        setConfirmOpen(false);
        router.refresh();
        toast.success(
          isEnrolled ? `Removed ${language.name}` : `Added ${language.name}`
        );
      } else {
        toast.error(result.error || "Something went wrong");
      }
    });
  };

  return (
    <>
      {isEnrolled ? (
        <ActionMenu
          label={`${language.name} options`}
          items={[
            {
              label: "Remove from My Languages",
              destructive: true,
              disabled: !canRemove,
              title: canRemove
                ? undefined
                : "Add another language before removing this one",
              onClick: () => setConfirmOpen(true),
            },
          ]}
        />
      ) : (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Add ${language.name} to My Languages`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-beige hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        isLoading={isPending}
        title={copy.title}
        message={copy.message}
        confirmLabel={isEnrolled ? "Remove" : "Add language"}
        confirmVariant={isEnrolled ? "destructive" : "default"}
      />
    </>
  );
}
