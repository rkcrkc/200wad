"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, HelpCircle, FolderPen, FolderPlus, FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
  MarkdownEditor,
} from "@/components/admin";
import {
  createHelpEntry,
  updateHelpEntry,
  deleteHelpEntry,
  toggleHelpEntryPublished,
  renameHelpCategory,
  deleteHelpCategory,
} from "@/lib/mutations/admin/help";
import { Badge } from "@/components/ui/badge";
import type { HelpEntry } from "@/types/database";

interface HelpClientProps {
  entries: HelpEntry[];
  languages: { code: string; name: string }[];
}

interface FormData {
  title: string;
  slug: string;
  content: string;
  category: string;
  is_published: boolean;
  preview: string;
  language_codes: string[];
}

interface FormErrors {
  title?: string;
  content?: string;
  category?: string;
  general?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generatePreview(content: string): string {
  let text = content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/(\*{1,3}|_{1,3})/g, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/\n+/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  const sentenceMatch = text.slice(0, 200).match(/^(.+?[.!?])\s/);
  if (sentenceMatch && sentenceMatch[1].length >= 20) {
    return sentenceMatch[1];
  }
  if (text.length <= 150) return text;
  const truncated = text.slice(0, 150);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

export function HelpClient({ entries, languages }: HelpClientProps) {
  const router = useRouter();

  // Entry CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HelpEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<HelpEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Category management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"create" | "rename" | "delete">("create");
  const [categoryName, setCategoryName] = useState("");
  const [categoryTarget, setCategoryTarget] = useState(""); // for rename: new name; for delete: reassign target
  const [categoryError, setCategoryError] = useState("");
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: "",
    content: "",
    category: "",
    is_published: true,
    preview: "",
    language_codes: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Get unique categories from entries
  const categories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category));
    return Array.from(cats).sort();
  }, [entries]);

  // Filter entries by active category
  const filteredEntries = useMemo(() => {
    if (!activeCategory) return entries;
    return entries.filter((e) => e.category === activeCategory);
  }, [entries, activeCategory]);

  // ========================================================================
  // Entry CRUD handlers
  // ========================================================================

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      category: "",
      is_published: true,
      preview: "",
      language_codes: [],
    });
    setErrors({});
    setEditingEntry(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (entry: HelpEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      slug: entry.slug,
      content: entry.content,
      category: entry.category,
      is_published: entry.is_published,
      preview: entry.preview || "",
      language_codes: entry.language_codes ?? [],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (entry: HelpEntry) => {
    setDeletingEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: editingEntry ? prev.slug : slugify(value),
    }));
  };

  const handleSubmit = async () => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.content.trim()) newErrors.content = "Content is required";
    if (!formData.category.trim()) newErrors.category = "Category is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      if (editingEntry) {
        const result = await updateHelpEntry(editingEntry.id, {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          category: formData.category,
          is_published: formData.is_published,
          preview: formData.preview || null,
          language_codes: formData.language_codes.length > 0 ? formData.language_codes : null,
        });
        if (!result.success) {
          setErrors({ general: result.error || "Failed to update entry" });
          return;
        }
      } else {
        const result = await createHelpEntry({
          title: formData.title,
          slug: formData.slug || undefined,
          content: formData.content,
          category: formData.category,
          is_published: formData.is_published,
          preview: formData.preview || null,
          language_codes: formData.language_codes.length > 0 ? formData.language_codes : null,
        });
        if (!result.success) {
          setErrors({ general: result.error || "Failed to create entry" });
          return;
        }
      }

      setIsModalOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    setIsLoading(true);
    try {
      const result = await deleteHelpEntry(deletingEntry.id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsDeleteModalOpen(false);
      setDeletingEntry(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublished = async (entry: HelpEntry) => {
    const result = await toggleHelpEntryPublished(entry.id, !entry.is_published);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  };

  // ========================================================================
  // Category management handlers
  // ========================================================================

  const openCategoryModal = (mode: "create" | "rename" | "delete", existingName?: string) => {
    setCategoryModalMode(mode);
    setCategoryName(existingName || "");
    setCategoryTarget("");
    setCategoryError("");
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async () => {
    setCategoryError("");

    if (categoryModalMode === "create") {
      const name = categoryTarget.trim();
      if (!name) {
        setCategoryError("Category name is required");
        return;
      }
      if (categories.includes(name)) {
        setCategoryError("Category already exists");
        return;
      }
      // Create a placeholder entry so the category appears
      // Actually — a category with zero entries won't persist. We'll just
      // add it to the entry form's dropdown. For it to truly exist, we need
      // at least one entry. Let's create a draft placeholder entry.
      setIsCategoryLoading(true);
      try {
        const result = await createHelpEntry({
          title: `${name} — Placeholder`,
          content: "This is a placeholder entry. Edit or replace it with real content.",
          category: name,
          is_published: false,
        });
        if (!result.success) {
          setCategoryError(result.error || "Failed to create category");
          return;
        }
        setIsCategoryModalOpen(false);
        router.refresh();
      } finally {
        setIsCategoryLoading(false);
      }
    } else if (categoryModalMode === "rename") {
      const newName = categoryTarget.trim();
      if (!newName) {
        setCategoryError("New name is required");
        return;
      }
      if (newName === categoryName) {
        setCategoryError("New name must be different");
        return;
      }
      if (categories.includes(newName)) {
        setCategoryError("A category with that name already exists");
        return;
      }
      setIsCategoryLoading(true);
      try {
        const result = await renameHelpCategory(categoryName, newName);
        if (!result.success) {
          setCategoryError(result.error || "Failed to rename category");
          return;
        }
        if (activeCategory === categoryName) setActiveCategory(newName);
        setIsCategoryModalOpen(false);
        router.refresh();
      } finally {
        setIsCategoryLoading(false);
      }
    } else if (categoryModalMode === "delete") {
      if (!categoryTarget) {
        setCategoryError("Select a category to reassign entries to");
        return;
      }
      setIsCategoryLoading(true);
      try {
        const result = await deleteHelpCategory(categoryName, categoryTarget);
        if (!result.success) {
          setCategoryError(result.error || "Failed to delete category");
          return;
        }
        if (activeCategory === categoryName) setActiveCategory(null);
        setIsCategoryModalOpen(false);
        router.refresh();
      } finally {
        setIsCategoryLoading(false);
      }
    }
  };

  const categoryModalTitle = {
    create: "Create Category",
    rename: `Rename "${categoryName}"`,
    delete: `Delete "${categoryName}"`,
  }[categoryModalMode];

  const categoryModalDescription = {
    create: "Create a new category. A draft placeholder entry will be added.",
    rename: `All ${entries.filter((e) => e.category === categoryName).length} entries in this category will be updated.`,
    delete: `All ${entries.filter((e) => e.category === categoryName).length} entries will be reassigned to another category.`,
  }[categoryModalMode];

  const otherCategories = categories.filter((c) => c !== categoryName);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help / Glossary</h1>
          <p className="mt-1 text-gray-600">
            Manage help entries and glossary content. {entries.length} entries across {categories.length} categories.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Category Filter + Management */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            !activeCategory
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({entries.length})
        </button>
        {categories.map((cat) => {
          const count = entries.filter((e) => e.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <div key={cat} className="group relative">
              <button
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat} ({count})
              </button>
              {/* Hover actions */}
              <div className="absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCategoryModal("rename", cat);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:text-primary"
                  title="Rename"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCategoryModal("delete", cat);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add category button */}
        <button
          onClick={() => openCategoryModal("create")}
          className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
        >
          <Plus className="h-3 w-3" />
          Category
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Languages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Published
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <HelpCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>No help entries yet.</p>
                  <p className="text-sm">Add your first entry to get started.</p>
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{entry.title}</div>
                    <div className="max-w-xs truncate text-sm text-gray-500">
                      {entry.content.slice(0, 80)}...
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge size="sm">
                      {entry.category}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {entry.language_codes && entry.language_codes.length > 0 ? (
                      <div className="flex gap-1">
                        {entry.language_codes.map((code) => (
                          <Badge key={code} size="sm" variant="beige">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">All</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {entry.slug}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Switch
                      checked={entry.is_published}
                      onCheckedChange={() => handleTogglePublished(entry)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(entry)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(entry)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Entry Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingEntry ? "Edit Help Entry" : "Add Help Entry"}
        description={
          editingEntry
            ? "Update the help entry details."
            : "Add a new help entry to the glossary."
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : editingEntry
                  ? "Save Changes"
                  : "Add Entry"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {errors.general && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {errors.general}
            </div>
          )}

          <AdminFormField label="Title" name="title" required error={errors.title}>
            <AdminInput
              id="title"
              name="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Memory Triggers"
              error={!!errors.title}
            />
          </AdminFormField>

          <AdminFormField label="Slug" name="slug" hint="URL-safe identifier (auto-generated)">
            <AdminInput
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              placeholder="e.g., memory-triggers"
            />
          </AdminFormField>

          <AdminFormField label="Category" name="category" required error={errors.category}>
            <AdminSelect
              id="category"
              name="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              error={!!errors.category}
              placeholder="Select a category..."
              options={categories.map((cat) => ({ value: cat, label: cat }))}
            />
          </AdminFormField>

          <AdminFormField label="Content" name="content" required error={errors.content}>
            <MarkdownEditor
              value={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Help entry content..."
              rows={12}
              error={!!errors.content}
            />
          </AdminFormField>

          <AdminFormField label="Preview" name="preview" hint="Short summary shown in link tooltips">
            <AdminTextarea
              id="preview"
              name="preview"
              value={formData.preview}
              onChange={(e) =>
                setFormData({ ...formData, preview: e.target.value })
              }
              placeholder="Brief preview text for tooltips..."
              rows={2}
            />
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  preview: generatePreview(prev.content),
                }))
              }
              className="mt-1 text-sm text-primary hover:underline"
            >
              Auto-generate from content
            </button>
          </AdminFormField>

          <AdminFormField label="Published" name="is_published">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_published: checked })
                }
              />
              <span className="text-sm text-gray-600">
                {formData.is_published ? "Visible to users" : "Draft (hidden)"}
              </span>
            </div>
          </AdminFormField>

          <AdminFormField
            label="Restrict to languages"
            name="language_codes"
            hint="Leave empty to show for all languages"
          >
            <div className="flex flex-wrap gap-3">
              {languages.map((lang) => {
                const checked = formData.language_codes.includes(lang.code);
                return (
                  <label key={lang.code} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          language_codes: checked
                            ? prev.language_codes.filter((c) => c !== lang.code)
                            : [...prev.language_codes, lang.code],
                        }));
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    {lang.name}
                  </label>
                );
              })}
            </div>
          </AdminFormField>
        </div>
      </AdminModal>

      {/* Delete Entry Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingEntry(null);
        }}
        onConfirm={handleDelete}
        title="Delete Help Entry"
        message={`Are you sure you want to delete "${deletingEntry?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />

      {/* Category Management Modal */}
      <AdminModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={categoryModalTitle}
        description={categoryModalDescription}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={isCategoryLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCategorySubmit}
              disabled={isCategoryLoading}
              variant={categoryModalMode === "delete" ? "destructive" : "default"}
            >
              {isCategoryLoading
                ? "Saving..."
                : categoryModalMode === "create"
                  ? "Create"
                  : categoryModalMode === "rename"
                    ? "Rename"
                    : "Delete & Reassign"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {categoryError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {categoryError}
            </div>
          )}

          {categoryModalMode === "create" && (
            <AdminFormField label="Category Name" name="categoryName" required>
              <AdminInput
                id="categoryName"
                name="categoryName"
                value={categoryTarget}
                onChange={(e) => setCategoryTarget(e.target.value)}
                placeholder="e.g., Advanced Topics"
                error={!!categoryError}
              />
            </AdminFormField>
          )}

          {categoryModalMode === "rename" && (
            <AdminFormField label="New Name" name="newCategoryName" required>
              <AdminInput
                id="newCategoryName"
                name="newCategoryName"
                value={categoryTarget}
                onChange={(e) => setCategoryTarget(e.target.value)}
                placeholder={categoryName}
                error={!!categoryError}
              />
            </AdminFormField>
          )}

          {categoryModalMode === "delete" && (
            <AdminFormField label="Reassign entries to" name="reassignCategory" required>
              <AdminSelect
                id="reassignCategory"
                name="reassignCategory"
                value={categoryTarget}
                onChange={(e) => setCategoryTarget(e.target.value)}
                placeholder="Select a category..."
                options={otherCategories.map((cat) => ({ value: cat, label: cat }))}
                error={!!categoryError}
              />
            </AdminFormField>
          )}
        </div>
      </AdminModal>
    </div>
  );
}
