"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface StudyMusicTrack {
  id: string;
  name: string;
  file_path: string;
  duration_seconds: number;
}

// Supabase Storage base URL for audio files
const STORAGE_BASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/audio";

function getTrackUrl(filePath: string): string {
  return `${STORAGE_BASE_URL}/${filePath}`;
}

// LocalStorage keys
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
  selectedTrack: string;
  /** Change the selected track */
  setSelectedTrack: (trackId: string) => void;
  /** Toggle a track: play if not playing, pause if already playing */
  toggleTrack: (trackId: string) => void;
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
  /** Available tracks from the database */
  tracks: StudyMusicTrack[];
  /** Whether tracks are still loading */
  isLoadingTracks: boolean;
}

/**
 * Hook for managing background study music
 * Fetches tracks from the database and handles audio playback
 */
export function useStudyMusic(
  options: UseStudyMusicOptions = {}
): UseStudyMusicReturn {
  const { defaultVolume = 0.5 } = options;

  // State
  const [isEnabled, setIsEnabledState] = useState(false);
  const [selectedTrack, setSelectedTrackState] = useState<string>("");
  const [volume, setVolumeState] = useState(defaultVolume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tracks, setTracks] = useState<StudyMusicTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch tracks from database
  useEffect(() => {
    async function fetchTracks() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("study_music_tracks")
        .select("id, name, file_path, duration_seconds")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching study music tracks:", error);
        setIsLoadingTracks(false);
        return;
      }

      setTracks(data || []);
      setIsLoadingTracks(false);
    }

    fetchTracks();
  }, []);

  // Initialize from localStorage (after tracks are loaded)
  useEffect(() => {
    if (typeof window === "undefined" || tracks.length === 0) return;

    const storedTrack = localStorage.getItem(STORAGE_KEY_TRACK);
    const storedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);

    if (storedTrack && tracks.some((t) => t.id === storedTrack)) {
      setSelectedTrackState(storedTrack);
    } else {
      // Default to first track
      setSelectedTrackState(tracks[0].id);
    }
    if (storedVolume !== null) {
      const vol = parseFloat(storedVolume);
      if (!isNaN(vol) && vol >= 0 && vol <= 1) {
        setVolumeState(vol);
      }
    }

    setIsInitialized(true);
  }, [tracks]);

  // Find current track's file_path
  const currentTrack = tracks.find((t) => t.id === selectedTrack);

  // Create and manage audio element
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized || !currentTrack)
      return;

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
    const trackUrl = getTrackUrl(currentTrack.file_path);
    if (audio.src !== trackUrl) {
      const wasPlaying = !audio.paused;
      audio.src = trackUrl;
      if (wasPlaying && isEnabled) {
        audio.play().catch(() => {
          setHasError(true);
        });
      }
    }

    // Update volume
    audio.volume = volume;

    // Play/pause based on enabled state
    if (isEnabled && audio.paused) {
      audio.play().catch(() => {
        setHasError(true);
      });
    } else if (!isEnabled && !audio.paused) {
      audio.pause();
    }
  }, [isEnabled, selectedTrack, volume, isInitialized, currentTrack]);

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
  }, []);

  const setSelectedTrack = useCallback((trackId: string) => {
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

  const toggleTrack = useCallback((trackId: string) => {
    if (selectedTrack === trackId && isEnabled) {
      // Pause current track
      setEnabled(false);
    } else {
      // Play new or resumed track
      setSelectedTrackState(trackId);
      localStorage.setItem(STORAGE_KEY_TRACK, trackId);
      setHasError(false);
      setEnabled(true);
    }
  }, [selectedTrack, isEnabled, setEnabled]);

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
    toggleTrack,
    volume,
    setVolume,
    isPlaying,
    hasError,
    stop,
    tracks,
    isLoadingTracks,
  };
}
