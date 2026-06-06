"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { resetAllTipDismissals } from "@/lib/mutations/tips";
import { updateDailyXpGoalAction } from "@/lib/mutations/settings";
import { DailyGoalEditor } from "@/components/header/DailyGoalEditor";

const TOOLTIPS_KEY = "show-tooltips";
const RELATED_WORDS_KEY = "show-related-words";

interface PreferencesSectionProps {
  /** Current `users.daily_xp_goal` — used to seed the inline editor. */
  dailyXpGoal: number;
}

/** SSR-safe read of a boolean preference (absent / "true" → on). */
function readPref(key: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(key) !== "false";
}

export function PreferencesSection({ dailyXpGoal }: PreferencesSectionProps) {
  // `mounted` gates the first client render to null so the localStorage-seeded
  // toggles can't cause a hydration mismatch against the server HTML.
  const [mounted, setMounted] = useState(false);

  // Draft (uncommitted) values for the staged preferences. They only take
  // effect when the user presses "Save changes".
  const [draftTooltips, setDraftTooltips] = useState(() => readPref(TOOLTIPS_KEY));
  const [draftRelated, setDraftRelated] = useState(() => readPref(RELATED_WORDS_KEY));
  const [draftGoal, setDraftGoal] = useState(dailyXpGoal);
  const [goalValid, setGoalValid] = useState(true);

  // Bumped on Cancel to remount <DailyGoalEditor> so its chip/input UI reverts
  // to the saved value (the editor owns that UI state internally).
  const [editorKey, setEditorKey] = useState(0);

  // Saved baselines (what's currently persisted), used for dirty detection.
  const [savedTooltips, setSavedTooltips] = useState(() => readPref(TOOLTIPS_KEY));
  const [savedRelated, setSavedRelated] = useState(() => readPref(RELATED_WORDS_KEY));
  const [savedGoal, setSavedGoal] = useState(dailyXpGoal);

  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedDone, setSavedDone] = useState(false);

  const [isResettingTips, setIsResettingTips] = useState(false);
  const [tipsResetDone, setTipsResetDone] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Editor reports the chosen goal (or null when its custom input is invalid).
  const handleGoalChange = useCallback((value: number | null) => {
    if (value === null) {
      setGoalValid(false);
    } else {
      setGoalValid(true);
      setDraftGoal(value);
    }
    setSavedDone(false);
  }, []);

  const dirty =
    draftTooltips !== savedTooltips ||
    draftRelated !== savedRelated ||
    draftGoal !== savedGoal;

  const canSave = mounted && dirty && goalValid && !isSaving;

  const handleSave = () => {
    setSaveError(null);
    startSaving(async () => {
      // Persist the server-backed goal first (only when it actually changed).
      if (draftGoal !== savedGoal) {
        const result = await updateDailyXpGoalAction(draftGoal);
        if (!result.success) {
          setSaveError(result.error ?? "Could not save preferences");
          return;
        }
      }

      // Persist the local toggles and apply them live to the document.
      localStorage.setItem(TOOLTIPS_KEY, String(draftTooltips));
      localStorage.setItem(RELATED_WORDS_KEY, String(draftRelated));
      document.body.classList.toggle("hide-tooltips", !draftTooltips);
      document.body.classList.toggle("hide-related-words", !draftRelated);

      // Advance the baselines so the form is no longer dirty.
      setSavedTooltips(draftTooltips);
      setSavedRelated(draftRelated);
      setSavedGoal(draftGoal);
      setSavedDone(true);
    });
  };

  const handleCancel = () => {
    setDraftTooltips(savedTooltips);
    setDraftRelated(savedRelated);
    setDraftGoal(savedGoal);
    setGoalValid(true);
    setSaveError(null);
    setSavedDone(false);
    setEditorKey((k) => k + 1);
  };

  const handleResetTips = async () => {
    setIsResettingTips(true);
    setTipsResetDone(false);
    const result = await resetAllTipDismissals();
    setIsResettingTips(false);
    if (result.success) {
      setTipsResetDone(true);
      setTimeout(() => setTipsResetDone(false), 3000);
    }
  };

  if (!mounted) return null;

  return (
    <div className="mb-6 rounded-2xl bg-white p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Preferences</h2>
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-small-regular text-destructive">{saveError}</span>
          )}
          {savedDone && !dirty && (
            <span className="text-small-regular text-muted-foreground">Saved</span>
          )}
          {dirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="font-medium">Daily XP goal</h3>
          <p className="text-sm text-gray-600">
            How much XP you aim to earn each day. Triggers a celebration toast when reached.
          </p>
        </div>
        <div className="shrink-0">
          <DailyGoalEditor
            key={editorKey}
            initialGoal={savedGoal}
            onChange={handleGoalChange}
          />
        </div>
      </div>

      <div className="my-4 h-px bg-gray-200" />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Show hover descriptions</h3>
          <p className="text-sm text-gray-600">
            Display tooltip labels when hovering over action bar buttons
          </p>
        </div>
        <Switch
          checked={draftTooltips}
          onCheckedChange={setDraftTooltips}
        />
      </div>

      <div className="my-4 h-px bg-gray-200" />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Show related words</h3>
          <p className="text-sm text-gray-600">
            Display the related words card in study and test mode
          </p>
        </div>
        <Switch
          checked={draftRelated}
          onCheckedChange={setDraftRelated}
        />
      </div>

      <div className="my-4 h-px bg-gray-200" />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Learning tips</h3>
          <p className="text-sm text-gray-600">
            Contextual tips appear during study to explain app features. Reset to see all tips again.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetTips}
          disabled={isResettingTips}
        >
          {isResettingTips ? "Resetting..." : tipsResetDone ? "Done!" : "Reset all tips"}
        </Button>
      </div>
    </div>
  );
}
