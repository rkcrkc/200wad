"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateMarketingConsent } from "@/lib/mutations/settings";

interface MarketingEmailSectionProps {
  /** Current consent: true = opted in, false = declined, null = never decided. */
  marketingEmailConsent: boolean | null;
}

/**
 * "Email preferences" settings card. Toggling promotional-email consent is the
 * user-facing withdrawal/opt-in path for C4 — flipping it off is a lawful
 * unsubscribe (as easy to withdraw as to give). Undecided (null) reads as off.
 */
export function MarketingEmailSection({ marketingEmailConsent }: MarketingEmailSectionProps) {
  const initial = marketingEmailConsent === true;
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);

  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedDone, setSavedDone] = useState(false);

  const dirty = draft !== saved;

  const handleSave = () => {
    setSaveError(null);
    startSaving(async () => {
      const result = await updateMarketingConsent(draft);
      if (!result.success) {
        setSaveError(result.error ?? "Could not save preferences");
        return;
      }
      setSaved(draft);
      setSavedDone(true);
    });
  };

  const handleCancel = () => {
    setDraft(saved);
    setSaveError(null);
    setSavedDone(false);
  };

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-6 flex min-h-10 items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Email preferences</h2>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-small-regular text-destructive">{saveError}</span>}
          {savedDone && !dirty && (
            <span className="text-small-regular text-muted-foreground">Saved</span>
          )}
          {dirty && (
            <>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-6">
        <div>
          <h3 className="font-medium">Product news &amp; learning tips</h3>
          <p className="text-sm text-gray-600">
            Occasional emails about new features, courses, and tips to help you learn. Turn this off
            anytime to unsubscribe.
          </p>
        </div>
        <Switch
          checked={draft}
          onCheckedChange={(on) => {
            setDraft(on);
            setSavedDone(false);
          }}
        />
      </div>
    </div>
  );
}
