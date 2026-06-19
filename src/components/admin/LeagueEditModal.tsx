"use client";

import { useState, useEffect } from "react";
import { AdminModal } from "./AdminModal";
import { AdminFormField } from "./AdminFormField";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createLeague, updateLeague } from "@/lib/mutations/admin/leagues";
import type { League } from "@/types/aliases";

interface LeagueEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLeague: League | null;
  onSuccess: () => void;
}

const DEFAULT_COLOR = "#9ca3af";

export function LeagueEditModal({
  isOpen,
  onClose,
  editingLeague,
  onSuccess,
}: LeagueEditModalProps) {
  const isEditing = !!editingLeague;

  // Form state
  const [tierOrder, setTierOrder] = useState(1);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🪵");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [divisionSize, setDivisionSize] = useState(30);
  const [promoteCount, setPromoteCount] = useState(8);
  const [relegateCount, setRelegateCount] = useState(8);
  const [enabled, setEnabled] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or league changes
  useEffect(() => {
    if (isOpen) {
      if (editingLeague) {
        setTierOrder(editingLeague.tier_order);
        setSlug(editingLeague.slug);
        setName(editingLeague.name);
        setIcon(editingLeague.icon);
        setColor(editingLeague.color);
        setDivisionSize(editingLeague.division_size);
        setPromoteCount(editingLeague.promote_count);
        setRelegateCount(editingLeague.relegate_count);
        setEnabled(editingLeague.enabled);
      } else {
        setTierOrder(1);
        setSlug("");
        setName("");
        setIcon("🪵");
        setColor(DEFAULT_COLOR);
        setDivisionSize(30);
        setPromoteCount(8);
        setRelegateCount(8);
        setEnabled(true);
      }
      setError(null);
    }
  }, [isOpen, editingLeague]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);

    const input = {
      tier_order: tierOrder,
      slug: slug.trim(),
      name: name.trim(),
      icon: icon.trim(),
      color,
      division_size: divisionSize,
      promote_count: promoteCount,
      relegate_count: relegateCount,
      enabled,
    };

    const result = isEditing
      ? await updateLeague(editingLeague!.id, input)
      : await createLeague(input);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to save league");
    }

    setIsSaving(false);
  };

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(color);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit League" : "Create League"}
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
              disabled={isSaving || !name.trim() || !slug.trim() || !icon.trim()}
            >
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Preview */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-500">Preview</span>
          <span className="text-xl leading-none">{icon.trim() || "🏅"}</span>
          <span className="font-semibold">{name.trim() || "League name"}</span>
          <span
            className="h-4 w-4 rounded-full border border-gray-200"
            style={{ backgroundColor: isValidHex ? color : DEFAULT_COLOR }}
          />
        </div>

        {/* Tier order + Slug */}
        <div className="flex gap-4">
          <AdminFormField label="Tier Order" name="tier_order" required hint="Ladder position, ascending">
            <input
              type="number"
              min={1}
              value={tierOrder}
              onChange={(e) => setTierOrder(parseInt(e.target.value) || 1)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
          <AdminFormField label="Slug" name="slug" required hint="Lowercase, numbers, hyphens" className="flex-1">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. gold"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
        </div>

        {/* Name + Icon */}
        <div className="flex gap-4">
          <AdminFormField label="Name" name="name" required hint="Display label" className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
          <AdminFormField label="Icon" name="icon" required hint="Emoji shown beside the name">
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🥇"
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-xl focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
        </div>

        {/* Colour */}
        <AdminFormField label="Colour" name="color" hint="6-digit hex; drives the tier tint">
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

        {/* Division size + promote/relegate */}
        <div className="flex gap-4">
          <AdminFormField label="Division Size" name="division_size" required hint="Members per room" className="flex-1">
            <input
              type="number"
              min={1}
              value={divisionSize}
              onChange={(e) => setDivisionSize(parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
          <AdminFormField label="Promote" name="promote_count" required hint="Top N move up" className="flex-1">
            <input
              type="number"
              min={0}
              value={promoteCount}
              onChange={(e) => setPromoteCount(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
          <AdminFormField label="Relegate" name="relegate_count" required hint="Bottom N move down" className="flex-1">
            <input
              type="number"
              min={0}
              value={relegateCount}
              onChange={(e) => setRelegateCount(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
        </div>

        {/* Enabled */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Enabled</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-xs text-gray-400">
            Disabled tiers are dropped from the ladder (no promotions into them)
          </span>
        </div>
      </div>
    </AdminModal>
  );
}
