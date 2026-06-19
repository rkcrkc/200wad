"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";
import { AdminModal } from "./AdminModal";
import { AdminFormField } from "./AdminFormField";
import { AdminFileUpload } from "./AdminFileUpload";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { uploadFileClient } from "@/lib/supabase/storage.client";
import {
  updateImageGroup,
  listImageGroupMembers,
} from "@/lib/mutations/admin/imageGroups";
import type { ImageGroupWithStats, ImageGroupMember } from "@/lib/queries/imageGroups";

interface ImageGroupEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup: ImageGroupWithStats | null;
  onSuccess: () => void;
}

export function ImageGroupEditModal({
  isOpen,
  onClose,
  editingGroup,
  onSuccess,
}: ImageGroupEditModalProps) {
  // Form state
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [englishSuffix, setEnglishSuffix] = useState("");
  const [italianSuffix, setItalianSuffix] = useState("");
  const [isException, setIsException] = useState(false);
  const [notes, setNotes] = useState("");
  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);

  const [members, setMembers] = useState<ImageGroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens / group changes
  useEffect(() => {
    if (isOpen && editingGroup) {
      setKey(editingGroup.key);
      setLabel(editingGroup.label);
      setEnglishSuffix(editingGroup.english_suffix ?? "");
      setItalianSuffix(editingGroup.italian_suffix ?? "");
      setIsException(editingGroup.is_exception);
      setNotes(editingGroup.notes ?? "");
      setMasterUrl(editingGroup.master_image_url);
      setMasterFile(null);
      setError(null);
    }
  }, [isOpen, editingGroup]);

  // Lazily load the member list when the modal opens
  useEffect(() => {
    if (!isOpen || !editingGroup) {
      setMembers([]);
      return;
    }
    let active = true;
    setMembersLoading(true);
    listImageGroupMembers(editingGroup.id)
      .then((rows) => {
        if (active) setMembers(rows);
      })
      .finally(() => {
        if (active) setMembersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, editingGroup]);

  const handleSubmit = async () => {
    if (!editingGroup) return;
    setIsSaving(true);
    setError(null);

    try {
      // 1. If a new master image was picked, upload it first.
      let newMasterUrl = editingGroup.master_image_url;
      if (masterFile) {
        const res = await uploadFileClient(
          "word-images",
          masterFile,
          "image-groups",
          editingGroup.id,
          "master"
        );
        if (!res.url) {
          setError(`Master image upload failed${res.error ? `: ${res.error}` : ""}`);
          setIsSaving(false);
          return;
        }
        newMasterUrl = res.url;
      }

      // 2. Save the group fields (master change fans out to inheriting members).
      const result = await updateImageGroup(editingGroup.id, {
        key: key.trim(),
        label: label.trim(),
        master_image_url: newMasterUrl,
        is_exception: isException,
        english_suffix: englishSuffix.trim() || null,
        italian_suffix: italianSuffix.trim() || null,
        notes: notes.trim() || null,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to save image group");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Image Group"
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
              disabled={isSaving || !label.trim() || !key.trim()}
            >
              {isSaving ? "Saving..." : "Update"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Course (read-only) */}
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-500">Course</span>
          <span className="text-sm font-medium text-gray-900">
            {editingGroup?.courseName ?? "—"}
          </span>
        </div>

        {/* Master image */}
        <AdminFormField
          label="Master Image"
          name="master_image_url"
          hint="Replacing this updates every inheriting member word"
        >
          <AdminFileUpload
            type="image"
            value={masterUrl}
            onChange={(file, preview) => {
              setMasterFile(file);
              setMasterUrl(preview);
            }}
          />
        </AdminFormField>

        {/* Label */}
        <AdminFormField label="Label" name="label" required hint="Human-friendly display name">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </AdminFormField>

        {/* Key */}
        <AdminFormField
          label="Key"
          name="key"
          required
          hint="Stable identifier (unique within the course)"
        >
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </AdminFormField>

        {/* Suffixes */}
        <div className="flex gap-4">
          <AdminFormField
            label="English Suffix"
            name="english_suffix"
            hint="Optional (Turbo rules)"
            className="flex-1"
          >
            <input
              type="text"
              value={englishSuffix}
              onChange={(e) => setEnglishSuffix(e.target.value)}
              placeholder="e.g. tion"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
          <AdminFormField
            label="Italian Suffix"
            name="italian_suffix"
            hint="Optional (Turbo rules)"
            className="flex-1"
          >
            <input
              type="text"
              value={italianSuffix}
              onChange={(e) => setItalianSuffix(e.target.value)}
              placeholder="e.g. zione"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
        </div>

        {/* Exception */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Exception</span>
          <Switch checked={isException} onCheckedChange={setIsException} />
          <span className="text-xs text-gray-400">
            Marks a TurboX / exception-family group
          </span>
        </div>

        {/* Notes */}
        <AdminFormField label="Notes" name="notes" hint="Optional internal notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </AdminFormField>

        {/* Member list (read-only) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Member words
            </span>
            <span className="text-xs text-gray-400">
              {membersLoading ? "Loading…" : `${members.length} total`}
            </span>
          </div>
          <div className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {members.length === 0 && !membersLoading ? (
              <p className="px-3 py-4 text-center text-xs text-gray-400">
                No member words.
              </p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
                    {m.memory_trigger_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.memory_trigger_image_url}
                        alt={m.english}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900">
                      {m.headword}
                    </p>
                    <p className="truncate text-xs text-gray-400">{m.english}</p>
                  </div>
                  {m.image_override_url && (
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Override
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
