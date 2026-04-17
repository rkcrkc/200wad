"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search } from "lucide-react";
import { AdminModal } from "./AdminModal";
import { AdminFormField } from "./AdminFormField";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createTip, updateTip } from "@/lib/mutations/admin/tips";
import { createClient } from "@/lib/supabase/client";
import type { TipWithWordCount } from "@/lib/queries/tips";

interface AdminTipEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTip: TipWithWordCount | null;
  onSuccess: () => void;
}

interface LinkedWord {
  id: string;
  headword: string;
  english: string;
}

export function AdminTipEditModal({
  isOpen,
  onClose,
  editingTip,
  onSuccess,
}: AdminTipEditModalProps) {
  const isEditing = !!editingTip;

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [linkedWords, setLinkedWords] = useState<LinkedWord[]>([]);

  // Word search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LinkedWord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or tip changes
  useEffect(() => {
    if (isOpen) {
      if (editingTip) {
        setTitle(editingTip.title || "");
        setBody(editingTip.body);
        setEmoji(editingTip.emoji || "");
        setIsActive(editingTip.is_active);
        setSortOrder(editingTip.sort_order ?? 0);
        setLinkedWords(editingTip.linkedWords || []);
      } else {
        setTitle("");
        setBody("");
        setEmoji("");
        setIsActive(true);
        setSortOrder(0);
        setLinkedWords([]);
      }
      setSearchQuery("");
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen, editingTip]);

  // Word search handler
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("search_words", {
      p_query: query.trim(),
    });

    const results = (data || []).map((row: { word_id: string; headword: string; english: string }) => ({
      id: row.word_id,
      headword: row.headword,
      english: row.english,
    }));

    setSearchResults(results);
    setIsSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleAddWord = (word: LinkedWord) => {
    if (!linkedWords.some((w) => w.id === word.id)) {
      setLinkedWords((prev) => [...prev, word]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveWord = (wordId: string) => {
    setLinkedWords((prev) => prev.filter((w) => w.id !== wordId));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);

    const input = {
      title: title.trim() || null,
      body,
      emoji: emoji.trim() || null,
      display_context: "study_sidebar" as const,
      is_active: isActive,
      sort_order: sortOrder,
      word_ids: linkedWords.map((w) => w.id),
    };

    const result = isEditing
      ? await updateTip(editingTip!.id, input)
      : await createTip(input);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to save tip");
    }

    setIsSaving(false);
  };

  // Filter out already-linked words from search results
  const filteredResults = searchResults.filter(
    (r) => !linkedWords.some((w) => w.id === r.id)
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Tip" : "Create Tip"}
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !body.trim()}>
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Emoji + Title */}
        <AdminFormField label="Title" name="title" hint="Optional heading shown above the tip body">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="💡"
              className="w-14 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gender colours explained"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </AdminFormField>

        {/* Body */}
        <AdminFormField label="Body" name="body" required hint="Supports markdown formatting">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the tip content here... Markdown is supported."
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </AdminFormField>

        {/* Active + Sort Order row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <AdminFormField label="Sort Order" name="sort_order">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </AdminFormField>
        </div>

        {/* Linked Words */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">Linked Words</h4>

          {/* Selected words as removable badges */}
          {linkedWords.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {linkedWords.map((word) => (
                <span
                  key={word.id}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700"
                >
                  <span className="font-medium">{word.headword}</span>
                  <span className="text-blue-400">({word.english})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWord(word.id)}
                    className="ml-1 text-blue-400 transition-colors hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words to link..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Search results dropdown */}
          {searchQuery.trim() && (
            <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              {isSearching ? (
                <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
              ) : filteredResults.length > 0 ? (
                filteredResults.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => handleAddWord(word)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="font-medium">{word.headword}</span>
                    <span className="text-gray-400">({word.english})</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-400">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}
