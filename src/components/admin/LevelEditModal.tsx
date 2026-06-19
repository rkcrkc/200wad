"use client";

import { useState, useEffect } from "react";
import { AdminModal } from "./AdminModal";
import { AdminFormField } from "./AdminFormField";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LevelBadge } from "@/components/levels/LevelBadge";
import { createLevel, updateLevel } from "@/lib/mutations/admin/levels";
import type { Level } from "@/types/aliases";

interface LevelEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLevel: Level | null;
  onSuccess: () => void;
}

const DEFAULT_COLOR = "#9ca3af";

export function LevelEditModal({
  isOpen,
  onClose,
  editingLevel,
  onSuccess,
}: LevelEditModalProps) {
  const isEditing = !!editingLevel;

  // Form state
  const [levelNumber, setLevelNumber] = useState(1);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [xpThreshold, setXpThreshold] = useState(0);
  const [lessonsThreshold, setLessonsThreshold] = useState(0);
  const [enabled, setEnabled] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or level changes
  useEffect(() => {
    if (isOpen) {
      if (editingLevel) {
        setLevelNumber(editingLevel.level_number);
        setSlug(editingLevel.slug);
        setName(editingLevel.name);
        setColor(editingLevel.color);
        setXpThreshold(editingLevel.xp_threshold);
        setLessonsThreshold(editingLevel.lessons_mastered_threshold);
        setEnabled(editingLevel.enabled);
      } else {
        setLevelNumber(1);
        setSlug("");
        setName("");
        setColor(DEFAULT_COLOR);
        setXpThreshold(0);
        setLessonsThreshold(0);
        setEnabled(true);
      }
      setError(null);
    }
  }, [isOpen, editingLevel]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);

    const input = {
      level_number: levelNumber,
      slug: slug.trim(),
      name: name.trim(),
      color,
      xp_threshold: xpThreshold,
      lessons_mastered_threshold: lessonsThreshold,
      enabled,
    };

    const result = isEditing
      ? await updateLevel(editingLevel!.id, input)
      : await createLevel(input);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to save level");
    }

    setIsSaving(false);
  };

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(color);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Level" : "Create Level"}
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <div>{error && <p className="text-sm text-red-500">{error}</p>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !name.trim() || !slug.trim()}
            >
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Badge preview */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-500">Preview</span>
          <LevelBadge name={name.trim() || "Rank name"} color={isValidHex ? color : DEFAULT_COLOR} size="md" />
        </div>

        {/* Level number + Slug */}
        <div className="flex gap-4">
          <AdminFormField label="Level Number" name="level_number" required hint="Ladder position, ascending">
            <input
              type="number"
              min={1}
              value={levelNumber}
              onChange={(e) => setLevelNumber(parseInt(e.target.value) || 1)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
          <AdminFormField label="Slug" name="slug" required hint="Lowercase, numbers, hyphens" className="flex-1">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. grandmaster"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
        </div>

        {/* Name */}
        <AdminFormField label="Name" name="name" required hint="Display label on the rank badge">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grandmaster"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </AdminFormField>

        {/* Colour */}
        <AdminFormField label="Colour" name="color" hint="6-digit hex; drives the badge tint and dot">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isValidHex ? color : DEFAULT_COLOR}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 p-1"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#9ca3af"
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </AdminFormField>

        {/* Thresholds */}
        <div className="flex gap-4">
          <AdminFormField label="XP Threshold" name="xp_threshold" required hint="Lifetime XP gate" className="flex-1">
            <input
              type="number"
              min={0}
              value={xpThreshold}
              onChange={(e) => setXpThreshold(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
          <AdminFormField
            label="Lessons Mastered"
            name="lessons_mastered_threshold"
            required
            hint="Cross-language lessons gate"
            className="flex-1"
          >
            <input
              type="number"
              min={0}
              value={lessonsThreshold}
              onChange={(e) => setLessonsThreshold(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
        </div>

        {/* Enabled */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Enabled</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-xs text-gray-400">
            Disabled tiers are hidden from learners but kept for cached pointers
          </span>
        </div>
      </div>
    </AdminModal>
  );
}
