"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { saveDeveloperData, type DeveloperData } from "@/lib/mutations";
import { setWordVideoOverride } from "@/lib/mutations/admin/imageGroups";

interface DeveloperSectionProps {
  /** Current word ID - used to detect word changes and reset local state */
  wordId: string;
  developerNotes?: string | null;
  pictureWrong?: boolean | null;
  pictureWrongNotes?: string | null;
  pictureMissing?: boolean | null;
  pictureBadSvg?: boolean | null;
  pictureMp4Defect?: boolean | null;
  audioRerecordEnglish?: boolean | null;
  audioRerecordForeign?: boolean | null;
  audioRerecordTrigger?: boolean | null;
  notesInMemoryTrigger?: boolean | null;
  /**
   * Effective trigger video URL for this word. When present, a "Remove video"
   * action is shown so admins can strip a bad MP4 in place (it clears the
   * per-word `video_override_url`, so the still image takes over).
   */
  videoUrl?: string | null;
  /** Notify parent once the video override is cleared, so it can drop the
   * cached video URL and re-render the still. */
  onVideoRemoved?: () => void;
  /** Optional: dim/disable when parent context is disabled */
  isEnabled?: boolean;
  /** Notify parent of successful saves so it can update its cached word data */
  onSaved?: (data: DeveloperData) => void;
}

export function DeveloperSection({
  wordId,
  developerNotes: initialDeveloperNotes,
  pictureWrong: initialPictureWrong,
  pictureWrongNotes: initialPictureWrongNotes,
  pictureMissing: initialPictureMissing,
  pictureBadSvg: initialPictureBadSvg,
  pictureMp4Defect: initialPictureMp4Defect,
  audioRerecordEnglish: initialAudioRerecordEnglish,
  audioRerecordForeign: initialAudioRerecordForeign,
  audioRerecordTrigger: initialAudioRerecordTrigger,
  notesInMemoryTrigger: initialNotesInMemoryTrigger,
  videoUrl,
  onVideoRemoved,
  isEnabled = true,
  onSaved,
}: DeveloperSectionProps) {
  const [isEditingDeveloperNotes, setIsEditingDeveloperNotes] = useState(false);
  const [developerNotesInput, setDeveloperNotesInput] = useState(initialDeveloperNotes || "");
  const [developerNotes, setDeveloperNotes] = useState(initialDeveloperNotes || null);
  const [pictureWrong, setPictureWrong] = useState(initialPictureWrong || false);
  const [pictureWrongNotesInput, setPictureWrongNotesInput] = useState(initialPictureWrongNotes || "");
  const [pictureWrongNotes, setPictureWrongNotes] = useState(initialPictureWrongNotes || null);
  const [pictureMissing, setPictureMissing] = useState(initialPictureMissing || false);
  const [pictureBadSvg, setPictureBadSvg] = useState(initialPictureBadSvg || false);
  const [pictureMp4Defect, setPictureMp4Defect] = useState(initialPictureMp4Defect || false);
  const [audioRerecordEnglish, setAudioRerecordEnglish] = useState(initialAudioRerecordEnglish || false);
  const [audioRerecordForeign, setAudioRerecordForeign] = useState(initialAudioRerecordForeign || false);
  const [audioRerecordTrigger, setAudioRerecordTrigger] = useState(initialAudioRerecordTrigger || false);
  const [notesInMemoryTrigger, setNotesInMemoryTrigger] = useState(initialNotesInMemoryTrigger || false);
  const [isSavingDeveloperData, setIsSavingDeveloperData] = useState(false);
  const [videoRemoved, setVideoRemoved] = useState(false);
  const [isRemovingVideo, setIsRemovingVideo] = useState(false);

  // Reset local state when the word changes. Adjusting state during render
  // (React's recommended pattern over a reset effect) so the new word's values
  // are applied in the same commit, avoiding a flash of the previous word.
  const [prevWordId, setPrevWordId] = useState(wordId);
  if (wordId !== prevWordId) {
    setPrevWordId(wordId);
    setDeveloperNotesInput(initialDeveloperNotes || "");
    setDeveloperNotes(initialDeveloperNotes || null);
    setIsEditingDeveloperNotes(false);
    setPictureWrong(initialPictureWrong || false);
    setPictureWrongNotesInput(initialPictureWrongNotes || "");
    setPictureWrongNotes(initialPictureWrongNotes || null);
    setPictureMissing(initialPictureMissing || false);
    setPictureBadSvg(initialPictureBadSvg || false);
    setPictureMp4Defect(initialPictureMp4Defect || false);
    setAudioRerecordEnglish(initialAudioRerecordEnglish || false);
    setAudioRerecordForeign(initialAudioRerecordForeign || false);
    setAudioRerecordTrigger(initialAudioRerecordTrigger || false);
    setNotesInMemoryTrigger(initialNotesInMemoryTrigger || false);
    setVideoRemoved(false);
  }

  const handleSaveDeveloperNotes = async () => {
    const trimmedNotes = developerNotesInput.trim() || null;
    setDeveloperNotes(trimmedNotes);
    setIsEditingDeveloperNotes(false);
    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: trimmedNotes,
      picture_wrong: pictureWrong,
      picture_wrong_notes: pictureWrongNotes,
      picture_missing: pictureMissing,
      picture_bad_svg: pictureBadSvg,
      picture_mp4_defect: pictureMp4Defect,
      audio_rerecord_english: audioRerecordEnglish,
      audio_rerecord_foreign: audioRerecordForeign,
      audio_rerecord_trigger: audioRerecordTrigger,
      notes_in_memory_trigger: notesInMemoryTrigger,
    };
    const result = await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
    if (result.success) {
      onSaved?.(data);
    }
  };

  const handleCancelDeveloperNotes = () => {
    setDeveloperNotesInput(developerNotes || "");
    setIsEditingDeveloperNotes(false);
  };

  const handlePictureCheckboxChange = async (
    field: "wrong" | "missing" | "bad_svg" | "mp4_defect",
    checked: boolean,
  ) => {
    if (field === "wrong") {
      setPictureWrong(checked);
      if (!checked) {
        setPictureWrongNotes(null);
        setPictureWrongNotesInput("");
      }
    } else if (field === "missing") {
      setPictureMissing(checked);
    } else if (field === "bad_svg") {
      setPictureBadSvg(checked);
    } else if (field === "mp4_defect") {
      setPictureMp4Defect(checked);
    }

    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: developerNotes,
      picture_wrong: field === "wrong" ? checked : pictureWrong,
      picture_wrong_notes: field === "wrong" && !checked ? null : pictureWrongNotes,
      picture_missing: field === "missing" ? checked : pictureMissing,
      picture_bad_svg: field === "bad_svg" ? checked : pictureBadSvg,
      picture_mp4_defect: field === "mp4_defect" ? checked : pictureMp4Defect,
      audio_rerecord_english: audioRerecordEnglish,
      audio_rerecord_foreign: audioRerecordForeign,
      audio_rerecord_trigger: audioRerecordTrigger,
      notes_in_memory_trigger: notesInMemoryTrigger,
    };
    const result = await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
    if (result.success) {
      onSaved?.(data);
    }
  };

  const handleSavePictureWrongNotes = async () => {
    const trimmedNotes = pictureWrongNotesInput.trim() || null;
    setPictureWrongNotes(trimmedNotes);
    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: developerNotes,
      picture_wrong: pictureWrong,
      picture_wrong_notes: trimmedNotes,
      picture_missing: pictureMissing,
      picture_bad_svg: pictureBadSvg,
      picture_mp4_defect: pictureMp4Defect,
      audio_rerecord_english: audioRerecordEnglish,
      audio_rerecord_foreign: audioRerecordForeign,
      audio_rerecord_trigger: audioRerecordTrigger,
      notes_in_memory_trigger: notesInMemoryTrigger,
    };
    const result = await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
    if (result.success) {
      onSaved?.(data);
    }
  };

  const handleTextCheckboxChange = async (
    field: "notes_in_memory_trigger",
    checked: boolean,
  ) => {
    setNotesInMemoryTrigger(checked);
    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: developerNotes,
      picture_wrong: pictureWrong,
      picture_wrong_notes: pictureWrongNotes,
      picture_missing: pictureMissing,
      picture_bad_svg: pictureBadSvg,
      picture_mp4_defect: pictureMp4Defect,
      audio_rerecord_english: audioRerecordEnglish,
      audio_rerecord_foreign: audioRerecordForeign,
      audio_rerecord_trigger: audioRerecordTrigger,
      notes_in_memory_trigger: checked,
    };
    const result = await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
    if (result.success) {
      onSaved?.(data);
    }
  };

  const handleAudioCheckboxChange = async (
    track: "english" | "foreign" | "trigger",
    checked: boolean,
  ) => {
    if (track === "english") setAudioRerecordEnglish(checked);
    else if (track === "foreign") setAudioRerecordForeign(checked);
    else setAudioRerecordTrigger(checked);

    setIsSavingDeveloperData(true);
    const data: DeveloperData = {
      developer_notes: developerNotes,
      picture_wrong: pictureWrong,
      picture_wrong_notes: pictureWrongNotes,
      picture_missing: pictureMissing,
      picture_bad_svg: pictureBadSvg,
      picture_mp4_defect: pictureMp4Defect,
      audio_rerecord_english: track === "english" ? checked : audioRerecordEnglish,
      audio_rerecord_foreign: track === "foreign" ? checked : audioRerecordForeign,
      audio_rerecord_trigger: track === "trigger" ? checked : audioRerecordTrigger,
      notes_in_memory_trigger: notesInMemoryTrigger,
    };
    const result = await saveDeveloperData(wordId, data);
    setIsSavingDeveloperData(false);
    if (result.success) {
      onSaved?.(data);
    }
  };

  // Clear the per-word trigger video override in place. The still image (poster)
  // is left untouched and takes over as the displayed media.
  const handleRemoveVideo = async () => {
    setIsRemovingVideo(true);
    const result = await setWordVideoOverride(wordId, null);
    setIsRemovingVideo(false);
    if (result.success) {
      setVideoRemoved(true);
      onVideoRemoved?.();
    }
  };

  const cardClasses = cn(
    "w-full rounded-2xl bg-white shadow-card transition-opacity",
    !isEnabled && "pointer-events-none opacity-30",
  );

  return (
    <div className={cardClasses}>
      <div className="flex flex-col gap-5 p-6">
        <span className="study-card-label uppercase tracking-wide text-foreground/50">
          DEVELOPER
        </span>

        <div className="flex flex-col gap-4">
          {/* Developer Notes */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground/70">Notes</span>
            {isEditingDeveloperNotes ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={developerNotesInput}
                  onChange={(e) => setDeveloperNotesInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      handleSaveDeveloperNotes();
                    }
                  }}
                  placeholder="Add developer notes..."
                  className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 p-3 text-small-regular focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDeveloperNotes}
                    disabled={isSavingDeveloperData}
                    className="rounded-lg bg-primary px-3 py-1.5 text-small-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelDeveloperNotes}
                    className="rounded-lg px-3 py-1.5 text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : developerNotes ? (
              <div className="flex flex-col gap-2">
                <p className="text-small-regular text-foreground whitespace-pre-wrap">{developerNotes}</p>
                <button
                  onClick={() => {
                    setDeveloperNotesInput(developerNotes);
                    setIsEditingDeveloperNotes(true);
                  }}
                  className="self-start text-small-semibold text-foreground/50 transition-colors hover:text-foreground"
                >
                  Edit
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingDeveloperNotes(true)}
                className="self-start text-small-regular text-foreground/50 transition-colors hover:text-foreground"
              >
                + Add developer notes
              </button>
            )}
          </div>

          <div className="h-px w-full bg-black/10" />

          {/* Picture Section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-foreground/70">Picture</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pictureWrong}
                onChange={(e) => handlePictureCheckboxChange("wrong", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">Wrong picture</span>
            </label>

            {pictureWrong && (
              <div className="ml-6 flex flex-col gap-2">
                <input
                  type="text"
                  value={pictureWrongNotesInput}
                  onChange={(e) => setPictureWrongNotesInput(e.target.value)}
                  onBlur={handleSavePictureWrongNotes}
                  placeholder="Add notes about the issue..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-small-regular focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pictureMissing}
                onChange={(e) => handlePictureCheckboxChange("missing", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">Missing picture</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pictureBadSvg}
                onChange={(e) => handlePictureCheckboxChange("bad_svg", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">Bad SVG</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pictureMp4Defect}
                onChange={(e) => handlePictureCheckboxChange("mp4_defect", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">MP4 defect</span>
            </label>

            {videoUrl && !videoRemoved && (
              <button
                type="button"
                onClick={handleRemoveVideo}
                disabled={isRemovingVideo}
                className="self-start text-small-semibold text-destructive transition-colors hover:underline disabled:opacity-50"
              >
                {isRemovingVideo ? "Removing video…" : "Remove video"}
              </button>
            )}
          </div>

          <div className="h-px w-full bg-black/10" />

          {/* Audio Section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-foreground/70">Audio</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={audioRerecordEnglish}
                onChange={(e) => handleAudioCheckboxChange("english", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">Re-record English</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={audioRerecordForeign}
                onChange={(e) => handleAudioCheckboxChange("foreign", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">Re-record Foreign</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={audioRerecordTrigger}
                onChange={(e) => handleAudioCheckboxChange("trigger", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">Re-record Memory Trigger</span>
            </label>
          </div>

          <div className="h-px w-full bg-black/10" />

          {/* Text Section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-foreground/70">Text</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notesInMemoryTrigger}
                onChange={(e) => handleTextCheckboxChange("notes_in_memory_trigger", e.target.checked)}
                disabled={isSavingDeveloperData}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-small-regular text-foreground">Notes appearing in memory trigger</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
