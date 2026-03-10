"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Available study music tracks
 * URLs point to Supabase Storage paths
 */
export const STUDY_MUSIC_TRACKS = [
  { id: "focus-flow", name: "Focus Flow", duration: "60 min" },
  { id: "deep-learning", name: "Deep Learning", duration: "45 min" },
  { id: "calm-study", name: "Calm Study", duration: "30 min" },
  { id: "memory-boost", name: "Memory Boost", duration: "50 min" },
] as const;

export type StudyMusicTrackId = (typeof STUDY_MUSIC_TRACKS)[number]["id"];

// Supabase Storage base URL for audio files
const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/audio/study-music";

/**
 * Get the audio URL for a track
 */
function getTrackUrl(trackId: StudyMusicTrackId): string {
  return `${STORAGE_BASE_URL}/${trackId}.mp3`;
}

// LocalStorage keys
const STORAGE_KEY_ENABLED = "study-music-enabled";
const STORAGE_KEY_TRACK = "study-music-track";
const STORAGE_KEY_VOLUME = "study-music-volume";

interface UseStudyMusicOptions {
  /** Default volume (0-1), defaults to 0.5 */
  defaultVolume?: number;
}

interface UseStudyMusicReturn {
  /** Whether music is currently enabled */
  isEnabled: boolean;
  /** Toggle music on/off */
  setEnabled: (enabled: boolean) => void;
  /** Currently selected track ID */
  selectedTrack: StudyMusicTrackId;
  /** Change the selected track */
  setSelectedTrack: (trackId: StudyMusicTrackId) => void;
  /** Current volume (0-1) */
  volume: number;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether the audio has encountered an error (e.g., file not found) */
  hasError: boolean;
  /** Stop playback (e.g., when leaving study mode) */
  stop: () => void;
}

/**
 * Hook for managing background study music
 * Persists settings to localStorage and handles audio playback
 */
export function useStudyMusic(options: UseStudyMusicOptions = {}): UseStudyMusicReturn {
  const { defaultVolume = 0.5 } = options;

  // State
  const [isEnabled, setIsEnabledState] = useState(false);
  const [selectedTrack, setSelectedTrackState] = useState<StudyMusicTrackId>("focus-flow");
  const [volume, setVolumeState] = useState(defaultVolume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED);
    const storedTrack = localStorage.getItem(STORAGE_KEY_TRACK);
    const storedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);

    if (storedEnabled !== null) {
      setIsEnabledState(storedEnabled === "true");
    }
    if (storedTrack && STUDY_MUSIC_TRACKS.some((t) => t.id === storedTrack)) {
      setSelectedTrackState(storedTrack as StudyMusicTrackId);
    }
    if (storedVolume !== null) {
      const vol = parseFloat(storedVolume);
      if (!isNaN(vol) && vol >= 0 && vol <= 1) {
        setVolumeState(vol);
      }
    }

    setIsInitialized(true);
  }, []);

  // Create and manage audio element
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized) return;

    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.preload = "auto";

      // Event listeners
      audioRef.current.addEventListener("play", () => setIsPlaying(true));
      audioRef.current.addEventListener("pause", () => setIsPlaying(false));
      audioRef.current.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current.addEventListener("error", () => {
        setHasError(true);
        setIsPlaying(false);
      });
      audioRef.current.addEventListener("canplay", () => {
        setHasError(false);
      });
    }

    const audio = audioRef.current;

    // Update source if track changed
    const trackUrl = getTrackUrl(selectedTrack);
    if (audio.src !== trackUrl) {
      const wasPlaying = !audio.paused;
      audio.src = trackUrl;
      if (wasPlaying && isEnabled) {
        audio.play().catch(() => {
          // Autoplay may be blocked
          setHasError(true);
        });
      }
    }

    // Update volume
    audio.volume = volume;

    // Play/pause based on enabled state
    if (isEnabled && audio.paused) {
      audio.play().catch(() => {
        // Autoplay may be blocked - user needs to interact first
        setHasError(true);
      });
    } else if (!isEnabled && !audio.paused) {
      audio.pause();
    }

    return () => {
      // Don't cleanup audio on every render, only on unmount
    };
  }, [isEnabled, selectedTrack, volume, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Handlers with localStorage persistence
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    setHasError(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
    }
  }, []);

  const setSelectedTrack = useCallback((trackId: StudyMusicTrackId) => {
    setSelectedTrackState(trackId);
    setHasError(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_TRACK, trackId);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVol);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(clampedVol));
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  return {
    isEnabled,
    setEnabled,
    selectedTrack,
    setSelectedTrack,
    volume,
    setVolume,
    isPlaying,
    hasError,
    stop,
  };
}
