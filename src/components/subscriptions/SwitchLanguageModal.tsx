"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal-shell";
import { useModalClose } from "./useModalClose";
import { switchLanguageSubscription } from "@/lib/mutations/subscriptions";
import { getFlagFromCode } from "@/lib/utils/flags";
import type { SubscriptionLanguage } from "@/lib/queries/subscriptions";

interface SwitchLanguageModalProps {
  subscriptionId: string;
  /** Currently unlocked language id (excluded from the pick list). */
  currentLanguageId: string | null;
  languages: SubscriptionLanguage[];
  onClose: () => void;
}

export function SwitchLanguageModal({
  subscriptionId,
  currentLanguageId,
  languages,
  onClose,
}: SwitchLanguageModalProps) {
  const router = useRouter();
  const choices = languages.filter((l) => l.id !== currentLanguageId);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalClose(onClose, !isSaving);

  async function handleSwitch() {
    if (!selectedId) return;
    setIsSaving(true);
    setError(null);
    const result = await switchLanguageSubscription(subscriptionId, selectedId);
    if (result.success) {
      const name = choices.find((l) => l.id === selectedId)?.name ?? "your language";
      toast.success(`${name} is now unlocked`);
      router.refresh();
      onClose();
    } else {
      setIsSaving(false);
      setError(result.error || "Couldn't switch language. Please try again.");
    }
  }

  return (
    <ModalShell maxWidth="content-sm">
      <ModalHeader className="relative pt-8 pb-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="text-xl-semibold">Switch unlocked language</h1>
        <p className="text-sm text-muted-foreground">
          Your plan unlocks one language. Move it to another any time.
        </p>
      </ModalHeader>

      <ModalBody className="bg-bone">
        {choices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other languages available.</p>
        ) : (
          <div className="space-y-2">
            {choices.map((lang) => {
              const selected = lang.id === selectedId;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setSelectedId(lang.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors ${
                    selected ? "border-primary ring-1 ring-primary" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{getFlagFromCode(lang.code)}</span>
                    <span className="text-regular-semibold">{lang.name}</span>
                  </span>
                  {selected && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}

            {error && (
              <div className="flex items-center gap-1.5 pt-1 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <div className="flex flex-col items-stretch gap-3">
          <Button
            type="button"
            onClick={handleSwitch}
            disabled={isSaving || !selectedId}
            className="w-full"
          >
            {isSaving ? "Switching..." : "Switch language"}
          </Button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </ModalFooter>
    </ModalShell>
  );
}
