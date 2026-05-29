"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { resetAllTipDismissals } from "@/lib/mutations/tips";

const TOOLTIPS_KEY = "show-tooltips";
const RELATED_WORDS_KEY = "show-related-words";

export function PreferencesSection() {
  const [showTooltips, setShowTooltips] = useState(true);
  const [showRelatedWords, setShowRelatedWords] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isResettingTips, setIsResettingTips] = useState(false);
  const [tipsResetDone, setTipsResetDone] = useState(false);

  useEffect(() => {
    const storedTooltips = localStorage.getItem(TOOLTIPS_KEY);
    const tooltipsEnabled = storedTooltips !== "false";
    setShowTooltips(tooltipsEnabled);
    if (!tooltipsEnabled) {
      document.body.classList.add("hide-tooltips");
    }

    const storedRelated = localStorage.getItem(RELATED_WORDS_KEY);
    const relatedEnabled = storedRelated !== "false";
    setShowRelatedWords(relatedEnabled);
    if (!relatedEnabled) {
      document.body.classList.add("hide-related-words");
    }

    setMounted(true);
  }, []);

  const handleToggle = (enabled: boolean) => {
    setShowTooltips(enabled);
    localStorage.setItem(TOOLTIPS_KEY, String(enabled));
    if (enabled) {
      document.body.classList.remove("hide-tooltips");
    } else {
      document.body.classList.add("hide-tooltips");
    }
  };

  const handleRelatedWordsToggle = (enabled: boolean) => {
    setShowRelatedWords(enabled);
    localStorage.setItem(RELATED_WORDS_KEY, String(enabled));
    if (enabled) {
      document.body.classList.remove("hide-related-words");
    } else {
      document.body.classList.add("hide-related-words");
    }
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
      <h2 className="mb-6 text-xl font-semibold">Preferences</h2>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Show hover descriptions</h3>
          <p className="text-sm text-gray-600">
            Display tooltip labels when hovering over action bar buttons
          </p>
        </div>
        <Switch
          checked={showTooltips}
          onCheckedChange={handleToggle}
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
          checked={showRelatedWords}
          onCheckedChange={handleRelatedWordsToggle}
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
