"use client";

import { useState, useCallback } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePlatformConfig } from "@/lib/mutations/admin/config";
import {
  TEXT_CATEGORIES,
  TEXT_DEFAULTS,
  TEXT_KEYS,
  getGroupedKeysForCategory,
  getKeysForCategory,
} from "@/lib/text";

interface TextLabelsClientProps {
  overrides: Record<string, string>;
}

export function TextLabelsClient({ overrides: initial }: TextLabelsClientProps) {
  const [activeTab, setActiveTab] = useState(TEXT_CATEGORIES[0].id);
  const [overrides, setOverrides] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeCategory = TEXT_CATEGORIES.find((c) => c.id === activeTab)!;
  const groups = getGroupedKeysForCategory(activeTab);

  const handleChange = useCallback((key: string, value: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setMessage(null);
  }, []);

  const handleReset = useCallback((key: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    const results = await Promise.all(
      TEXT_CATEGORIES.map((category) => {
        const categoryKeys = getKeysForCategory(category.id);
        const categoryOverrides: Record<string, string> = {};
        for (const k of categoryKeys) {
          if (overrides[k] !== undefined) {
            categoryOverrides[k] = overrides[k];
          }
        }
        return updatePlatformConfig(category.configKey, categoryOverrides);
      })
    );

    setSaving(false);

    const firstError = results.find((r) => !r.success);
    if (firstError) {
      setMessage(`Error: ${firstError.error}`);
    } else {
      setMessage("Text labels saved");
    }
  }, [overrides]);

  const allKeys = getKeysForCategory(activeTab);
  const overriddenCount = allKeys.filter((k) => overrides[k] !== undefined).length;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {TEXT_CATEGORIES.map((cat) => {
          const catKeys = getKeysForCategory(cat.id);
          const catOverrideCount = catKeys.filter(
            (k) => overrides[k] !== undefined
          ).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === cat.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {cat.label}
              {catOverrideCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                  {catOverrideCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category header + save */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {activeCategory.label}
          </h2>
          <p className="text-sm text-gray-500">{activeCategory.description}</p>
        </div>
        <div className="flex items-center gap-3">
          {overriddenCount > 0 && (
            <span className="text-xs text-gray-400">
              {overriddenCount} override{overriddenCount !== 1 ? "s" : ""}
            </span>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.startsWith("Error")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Grouped text fields */}
      {groups.map(({ group, keys }) => (
        <div key={group}>
          <h3 className="mb-2 text-sm font-medium text-gray-500">{group}</h3>
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {keys.map((key) => {
              const meta = TEXT_KEYS[key];
              const defaultVal = TEXT_DEFAULTS[key] ?? "";
              const currentVal = overrides[key] ?? "";
              const isOverridden = overrides[key] !== undefined;

              return (
                <div key={key} className="px-6 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {meta.label}
                    </span>
                    <code className="text-xs text-gray-400">{key}</code>
                    {isOverridden && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        customised
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={currentVal}
                      placeholder={defaultVal}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        isOverridden
                          ? "border-primary/30 bg-primary/5"
                          : "border-gray-200 bg-white"
                      } placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30`}
                    />
                    {isOverridden && (
                      <button
                        onClick={() => handleReset(key)}
                        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        title="Reset to default"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  {isOverridden && (
                    <div className="mt-1.5 text-xs text-gray-400">
                      Default: {defaultVal}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
