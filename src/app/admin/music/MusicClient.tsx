"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Music,
  Play,
  Pause,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AdminModal,
  ConfirmModal,
  AdminFormField,
  AdminInput,
  AdminTextarea,
} from "@/components/admin";
import {
  createMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
  uploadMusicFile,
  toggleMusicTrackActive,
} from "@/lib/mutations/admin/music";
import { StudyMusicTrack } from "@/types/database";

interface MusicClientProps {
  tracks: StudyMusicTrack[];
}

interface FormData {
  name: string;
  author: string;
  description: string;
  category: string;
  bpm: string;
}

interface FormErrors {
  name?: string;
  file?: string;
  general?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MusicClient({ tracks }: MusicClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<StudyMusicTrack | null>(null);
  const [deletingTrack, setDeletingTrack] = useState<StudyMusicTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [extractedDuration, setExtractedDuration] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    author: "",
    description: "",
    category: "",
    bpm: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const resetForm = () => {
    setFormData({
      name: "",
      author: "",
      description: "",
      category: "",
      bpm: "",
    });
    setErrors({});
    setEditingTrack(null);
    setSelectedFile(null);
    setUploadedFilePath(null);
    setUploadedFileSize(null);
    setExtractedDuration(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (track: StudyMusicTrack) => {
    setEditingTrack(track);
    setFormData({
      name: track.name,
      author: track.author || "",
      description: track.description || "",
      category: track.category || "",
      bpm: track.bpm?.toString() || "",
    });
    setUploadedFilePath(track.file_path);
    setUploadedFileSize(track.file_size);
    setExtractedDuration(track.duration_seconds);
    setErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (track: StudyMusicTrack) => {
    setDeletingTrack(track);
    setIsDeleteModalOpen(true);
  };

  // Extract duration from audio file using Web Audio API
  const extractAudioDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration));
        URL.revokeObjectURL(audio.src);
      };

      audio.onerror = () => {
        reject(new Error("Failed to load audio metadata"));
        URL.revokeObjectURL(audio.src);
      };

      audio.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setErrors({ ...errors, file: "Please select an audio file" });
      return;
    }

    setSelectedFile(file);
    setErrors({ ...errors, file: undefined });

    // Extract duration
    try {
      const duration = await extractAudioDuration(file);
      setExtractedDuration(duration);

      // Auto-fill name from filename if empty
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setFormData((prev) => ({ ...prev, name: nameWithoutExt }));
      }
    } catch (err) {
      console.error("Failed to extract audio duration:", err);
      setErrors({ ...errors, file: "Could not read audio duration" });
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrors({});

    try {
      const formDataObj = new FormData();
      formDataObj.append("file", selectedFile);

      const result = await uploadMusicFile(formDataObj);

      if (!result.success) {
        setErrors({ file: result.error || "Upload failed" });
        return;
      }

      setUploadedFilePath(result.filePath!);
      setUploadedFileSize(result.fileSize!);
      setSelectedFile(null);
    } catch (err) {
      console.error("Upload error:", err);
      setErrors({ file: "Upload failed. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!editingTrack && !uploadedFilePath) {
      newErrors.file = "Please upload an audio file";
    }

    if (!extractedDuration && !editingTrack) {
      newErrors.file = "Could not determine audio duration";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (editingTrack) {
        const result = await updateMusicTrack(editingTrack.id, {
          name: formData.name,
          author: formData.author || null,
          description: formData.description || null,
          category: formData.category || null,
          bpm: formData.bpm ? parseInt(formData.bpm, 10) : null,
          ...(uploadedFilePath !== editingTrack.file_path && {
            file_path: uploadedFilePath!,
            file_size: uploadedFileSize,
            duration_seconds: extractedDuration!,
          }),
        });

        if (!result.success) {
          setErrors({ general: result.error || "Failed to update track" });
          return;
        }
      } else {
        const result = await createMusicTrack({
          name: formData.name,
          author: formData.author || null,
          description: formData.description || null,
          category: formData.category || null,
          bpm: formData.bpm ? parseInt(formData.bpm, 10) : null,
          duration_seconds: extractedDuration!,
          file_path: uploadedFilePath!,
          file_size: uploadedFileSize,
        });

        if (!result.success) {
          setErrors({ general: result.error || "Failed to create track" });
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
    if (!deletingTrack) return;

    setIsLoading(true);

    try {
      const result = await deleteMusicTrack(deletingTrack.id);
      if (!result.success) {
        alert(result.error);
        return;
      }

      setIsDeleteModalOpen(false);
      setDeletingTrack(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (track: StudyMusicTrack) => {
    const result = await toggleMusicTrackActive(track.id, !track.is_active);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  };

  const handlePlayPreview = (track: StudyMusicTrack) => {
    if (playingTrackId === track.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      // Play new track
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const audioUrl = `${baseUrl}/storage/v1/object/public/audio/${track.file_path}`;

      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch((err) => {
        console.error("Playback failed:", err);
        setPlayingTrackId(null);
      });
      audioRef.current.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(track.id);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Music</h1>
          <p className="mt-1 text-gray-600">
            Manage background music tracks for study and test modes.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Track
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-10 px-2 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Track
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                BPM
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Active
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <Music className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>No music tracks yet.</p>
                  <p className="text-sm">Add your first track to get started.</p>
                </td>
              </tr>
            ) : (
              tracks.map((track) => (
                <tr key={track.id} className="hover:bg-gray-50">
                  <td className="px-2 py-4">
                    <GripVertical className="h-4 w-4 cursor-grab text-gray-400" />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePlayPreview(track)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        {playingTrackId === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-gray-900">{track.name}</div>
                        {track.description && (
                          <div className="max-w-xs truncate text-sm text-gray-500">
                            {track.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {track.author || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {track.category || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {formatDuration(track.duration_seconds)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {track.bpm || "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {formatFileSize(track.file_size)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Switch
                      checked={track.is_active}
                      onCheckedChange={() => handleToggleActive(track)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(track)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(track)}
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
        title={editingTrack ? "Edit Track" : "Add Track"}
        description={
          editingTrack
            ? "Update the track details."
            : "Add a new music track for study mode."
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
            <Button onClick={handleSubmit} disabled={isLoading || isUploading}>
              {isLoading
                ? "Saving..."
                : editingTrack
                ? "Save Changes"
                : "Add Track"}
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

          {/* File Upload */}
          <AdminFormField
            label="Audio File"
            name="file"
            required={!editingTrack}
            error={errors.file}
          >
            <div className="space-y-2">
              {uploadedFilePath && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <Music className="h-4 w-4" />
                  <span className="flex-1 truncate">
                    {editingTrack ? "Current file uploaded" : "File uploaded successfully"}
                  </span>
                  {extractedDuration && (
                    <span className="text-green-600">
                      {formatDuration(extractedDuration)}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFile ? selectedFile.name : "Choose File"}
                </Button>
                {selectedFile && !uploadedFilePath && (
                  <Button
                    type="button"
                    onClick={handleUploadFile}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                )}
              </div>

              {selectedFile && extractedDuration && !uploadedFilePath && (
                <p className="text-sm text-gray-500">
                  Duration: {formatDuration(extractedDuration)} • Size:{" "}
                  {formatFileSize(selectedFile.size)}
                </p>
              )}
            </div>
          </AdminFormField>

          {/* Name */}
          <AdminFormField label="Name" name="name" required error={errors.name}>
            <AdminInput
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Focus Flow"
              error={!!errors.name}
            />
          </AdminFormField>

          {/* Author */}
          <AdminFormField label="Author / Artist" name="author">
            <AdminInput
              id="author"
              name="author"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              placeholder="e.g., Ambient Studio"
            />
          </AdminFormField>

          {/* Category */}
          <AdminFormField label="Category" name="category">
            <AdminInput
              id="category"
              name="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Alpha Waves, Lo-Fi, Ambient"
            />
          </AdminFormField>

          {/* BPM */}
          <AdminFormField label="BPM" name="bpm" hint="Beats per minute (optional)">
            <AdminInput
              id="bpm"
              name="bpm"
              type="number"
              value={formData.bpm}
              onChange={(e) =>
                setFormData({ ...formData, bpm: e.target.value })
              }
              placeholder="e.g., 60"
            />
          </AdminFormField>

          {/* Description */}
          <AdminFormField label="Description" name="description">
            <AdminTextarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of the track..."
              rows={2}
            />
          </AdminFormField>
        </div>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTrack(null);
        }}
        onConfirm={handleDelete}
        title="Delete Track"
        message={`Are you sure you want to delete "${deletingTrack?.name}"? This will also remove the audio file from storage. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isLoading}
      />
    </div>
  );
}
