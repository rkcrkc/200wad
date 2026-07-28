"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { setAnswerFeedbackSoundEnabled } from "@/lib/mutations/admin/answer-sounds";

interface AnswerSound {
  grade: string;
  audio_url: string;
  enabled: boolean;
  updated_at: string;
}

interface AnswerSoundsClientProps {
  sounds: AnswerSound[];
}

const GRADE_META: Record<string, { label: string; description: string }> = {
  correct: {
    label: "Correct",
    description: "Plays on a full-mark answer (no mistakes).",
  },
  "half-correct": {
    label: "Half correct",
    description: "Plays when the answer has 1–2 mistakes.",
  },
  incorrect: {
    label: "Incorrect",
    description: "Plays when the answer is wrong.",
  },
};

export function AnswerSoundsClient({ sounds }: AnswerSoundsClientProps) {
  const router = useRouter();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingGrade, setUploadingGrade] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpload = async (grade: string, file: File) => {
    setErrors((e) => ({ ...e, [grade]: "" }));
    setUploadingGrade(grade);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade", grade);

      const res = await fetch("/api/admin/upload-answer-sound", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrors((e) => ({ ...e, [grade]: json.error || "Upload failed" }));
        return;
      }
      router.refresh();
    } catch {
      setErrors((e) => ({ ...e, [grade]: "Upload failed" }));
    } finally {
      setUploadingGrade(null);
    }
  };

  const handleToggle = async (grade: string, enabled: boolean) => {
    const result = await setAnswerFeedbackSoundEnabled(grade, enabled);
    if (!result.success) {
      setErrors((e) => ({ ...e, [grade]: result.error || "Update failed" }));
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {sounds.map((sound) => {
        const meta = GRADE_META[sound.grade] ?? {
          label: sound.grade,
          description: "",
        };
        const isUploading = uploadingGrade === sound.grade;
        const error = errors[sound.grade];

        return (
          <div
            key={sound.grade}
            className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900">{meta.label}</div>
              <div className="text-sm text-gray-500">{meta.description}</div>
              {error && (
                <div className="mt-1 text-sm text-destructive">{error}</div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Preview */}
              <audio
                key={sound.audio_url}
                controls
                preload="none"
                src={sound.audio_url}
                className="h-9 w-56 max-w-full"
              />

              {/* Replace */}
              <input
                ref={(el) => {
                  fileInputs.current[sound.grade] = el;
                }}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(sound.grade, file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputs.current[sound.grade]?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading…" : "Replace"}
              </Button>

              {/* Enable toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={sound.enabled}
                  onCheckedChange={(checked) =>
                    handleToggle(sound.grade, checked)
                  }
                />
                <span className="w-14 text-sm text-gray-600">
                  {sound.enabled ? "On" : "Off"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
