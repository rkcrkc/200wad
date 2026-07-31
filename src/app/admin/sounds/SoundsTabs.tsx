"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnswerSoundsClient } from "./AnswerSoundsClient";
import { MusicClient } from "./MusicClient";
import { StudyMusicTrack } from "@/types/database";

interface AnswerSound {
  grade: string;
  audio_url: string;
  enabled: boolean;
  updated_at: string;
}

type TabKey = "answer-sounds" | "music";

interface SoundsTabsProps {
  answerSounds: AnswerSound[];
  musicTracks: StudyMusicTrack[];
}

const TABS: { key: TabKey; label: string; description: string }[] = [
  {
    key: "answer-sounds",
    label: "Answer Sounds",
    description:
      "Sounds played when a learner submits a test answer. Upload an MP3 (or any audio file, up to 2\u00a0MB) to replace a sound, or toggle one off. Learners can also mute all of these from the test settings.",
  },
  {
    key: "music",
    label: "Music",
    description: "Manage background music tracks for study and test modes.",
  },
];

export function SoundsTabs({ answerSounds, musicTracks }: SoundsTabsProps) {
  const [active, setActive] = useState<TabKey>("answer-sounds");

  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sounds</h1>
        <p className="mt-1 text-sm text-gray-500">{activeTab.description}</p>
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {active === "answer-sounds" && (
        <AnswerSoundsClient sounds={answerSounds} />
      )}
      {active === "music" && <MusicClient tracks={musicTracks} />}
    </div>
  );
}
