"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Language {
  id: string;
  name: string;
  native_name: string;
  flag: string;
  sort_order: number | null;
  courseCount: number;
  created_at: string | null;
}

interface LanguagesClientProps {
  languages: Language[];
}

interface FormData {
  name: string;
  native_name: string;
  flag: string;
}

interface FormErrors {
  name?: string;
  native_name?: string;
  flag?: string;
}

export function LanguagesClient({ languages }: LanguagesClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    native_name: "",
    flag: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const resetForm = () => {
    setFormData({ name: "", native_name: "", flag: "" });
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
      flag: language.flag,
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
    if (!formData.flag.trim()) {
      newErrors.flag = "Flag emoji is required";
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Native Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Courses
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {languages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No languages yet. Add your first language to get started.
                </td>
              </tr>
            ) : (
              languages.map((language) => (
                <tr key={language.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-2xl">
                    {language.flag}
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
            label="Flag Emoji"
            name="flag"
            required
            error={errors.flag}
          >
            <AdminInput
              id="flag"
              name="flag"
              value={formData.flag}
              onChange={(e) =>
                setFormData({ ...formData, flag: e.target.value })
              }
              placeholder="e.g., 🇮🇹"
              error={!!errors.flag}
            />
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
    </div>
  );
}
