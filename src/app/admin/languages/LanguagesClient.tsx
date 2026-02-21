"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
} from "@/components/admin";
import {
  createLanguage,
  updateLanguage,
  deleteLanguage,
} from "@/lib/mutations/admin/languages";
import { getFlagFromCode } from "@/lib/utils/flags";

interface Language {
  id: string;
  name: string;
  native_name: string;
  code: string;
  sort_order: number | null;
  is_visible: boolean;
  courseCount: number;
  created_at: string | null;
}

interface LanguagesClientProps {
  languages: Language[];
}

interface FormData {
  name: string;
  native_name: string;
  code: string;
}

interface FormErrors {
  name?: string;
  native_name?: string;
  code?: string;
}

type SortKey = "code" | "name" | "native_name" | "courseCount" | "is_visible";
type SortDirection = "asc" | "desc";

export function LanguagesClient({ languages }: LanguagesClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null);
  const [togglingLanguage, setTogglingLanguage] = useState<Language | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    native_name: "",
    code: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedLanguages = useMemo(() => {
    return [...languages].sort((a, b) => {
      let aVal: string | number | boolean;
      let bVal: string | number | boolean;

      switch (sortKey) {
        case "code":
          aVal = a.code.toLowerCase();
          bVal = b.code.toLowerCase();
          break;
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "native_name":
          aVal = a.native_name.toLowerCase();
          bVal = b.native_name.toLowerCase();
          break;
        case "courseCount":
          aVal = a.courseCount;
          bVal = b.courseCount;
          break;
        case "is_visible":
          aVal = a.is_visible ? 1 : 0;
          bVal = b.is_visible ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [languages, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const SortHeader = ({ column, label }: { column: SortKey; label: string }) => (
    <th
      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === column ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <span className="w-4" />
        )}
      </div>
    </th>
  );

  const resetForm = () => {
    setFormData({ name: "", native_name: "", code: "" });
    setErrors({});
    setEditingLanguage(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (language: Language) => {
    setEditingLanguage(language);
    setFormData({
      name: language.name,
      native_name: language.native_name,
      code: language.code,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (language: Language) => {
    setDeletingLanguage(language);
    setIsDeleteModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.native_name.trim()) {
      newErrors.native_name = "Native name is required";
    }
    if (!formData.code.trim()) {
      newErrors.code = "Language code is required";
    } else if (!/^[a-z]{2,3}$/.test(formData.code.toLowerCase())) {
      newErrors.code = "Code must be 2-3 lowercase letters (ISO 639-1)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (editingLanguage) {
        const result = await updateLanguage(editingLanguage.id, formData);
        if (!result.success) {
          setErrors({ name: result.error || "Failed to update language" });
          return;
        }
      } else {
        const result = await createLanguage(formData);
        if (!result.success) {
          setErrors({ name: result.error || "Failed to create language" });
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
    if (!deletingLanguage) return;

    setIsLoading(true);

    try {
      const result = await deleteLanguage(deletingLanguage.id);
      if (!result.success) {
        alert(result.error);
        return;
      }

      setIsDeleteModalOpen(false);
      setDeletingLanguage(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const openVisibilityModal = (language: Language) => {
    setTogglingLanguage(language);
    setIsVisibilityModalOpen(true);
  };

  const handleToggleVisibility = async () => {
    if (!togglingLanguage) return;
    setIsLoading(true);
    try {
      const result = await updateLanguage(togglingLanguage.id, {
        is_visible: !togglingLanguage.is_visible,
      });
      if (!result.success) {
        alert(result.error);
        return;
      }
      setIsVisibilityModalOpen(false);
      setTogglingLanguage(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Languages</h1>
          <p className="mt-1 text-gray-600">
            Manage available languages for courses.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Language
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Flag
              </th>
              <SortHeader column="code" label="Code" />
              <SortHeader column="name" label="Name" />
              <SortHeader column="native_name" label="Native Name" />
              <SortHeader column="courseCount" label="Courses" />
              <SortHeader column="is_visible" label="Visible" />
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedLanguages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No languages yet. Add your first language to get started.
                </td>
              </tr>
            ) : (
              sortedLanguages.map((language) => (
                <tr key={language.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-2xl">
                    {getFlagFromCode(language.code)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-600">
                    {language.code}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                    {language.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {language.native_name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {language.courseCount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Switch
                      checked={language.is_visible}
                      onCheckedChange={() => openVisibilityModal(language)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(language)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(language)}
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

      {/* Create/Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingLanguage ? "Edit Language" : "Add Language"}
        description={
          editingLanguage
            ? "Update the language details."
            : "Add a new language for courses."
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
                : editingLanguage
                ? "Save Changes"
                : "Add Language"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AdminFormField
            label="Name"
            name="name"
            required
            error={errors.name}
          >
            <AdminInput
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Italian"
              error={!!errors.name}
            />
          </AdminFormField>

          <AdminFormField
            label="Native Name"
            name="native_name"
            required
            error={errors.native_name}
          >
            <AdminInput
              id="native_name"
              name="native_name"
              value={formData.native_name}
              onChange={(e) =>
                setFormData({ ...formData, native_name: e.target.value })
              }
              placeholder="e.g., Italiano"
              error={!!errors.native_name}
            />
          </AdminFormField>

          <AdminFormField
            label="Language Code (ISO 639-1)"
            name="code"
            required
            error={errors.code}
            hint="2-3 letter code like 'it', 'es', 'fr', 'de', 'zh'"
          >
            <div className="flex items-center gap-3">
              <AdminInput
                id="code"
                name="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toLowerCase() })
                }
                placeholder="e.g., it"
                error={!!errors.code}
                className="w-24"
              />
              {formData.code && (
                <span className="text-2xl" title="Flag preview">
                  {getFlagFromCode(formData.code)}
                </span>
              )}
            </div>
          </AdminFormField>
        </div>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingLanguage(null);
        }}
        onConfirm={handleDelete}
        title="Delete Language"
        message={`Are you sure you want to delete "${deletingLanguage?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />

      {/* Visibility Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={isVisibilityModalOpen}
        onClose={() => {
          setIsVisibilityModalOpen(false);
          setTogglingLanguage(null);
        }}
        onConfirm={handleToggleVisibility}
        title={togglingLanguage?.is_visible ? "Hide Language" : "Show Language"}
        message={
          togglingLanguage?.is_visible
            ? `Are you sure you want to hide "${togglingLanguage?.name}"? It will no longer be visible to users.`
            : `Are you sure you want to show "${togglingLanguage?.name}"? It will become visible to users.`
        }
        confirmLabel={togglingLanguage?.is_visible ? "Hide" : "Show"}
        confirmVariant={togglingLanguage?.is_visible ? "destructive" : "default"}
        isLoading={isLoading}
      />
    </div>
  );
}
