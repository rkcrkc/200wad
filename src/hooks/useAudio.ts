"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type AudioType = "english" | "foreign" | "trigger";

interface UseAudioReturn {
  /** Play audio from URL, returns a promise that resolves when audio ends */
  playAudio: (url: string, type: AudioType) => Promise<void>;
  /** Stop current audio playback */
  stopAudio: () => void;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Which audio type is currently playing */
  currentAudioType: AudioType | null;
  /** Whether audio is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
}

export function useAudio(): UseAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudioType, setCurrentAudioType] = useState<AudioType | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentAudioType(null);
    setIsLoading(false);
    
    // Resolve any pending promise
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  const playAudio = useCallback(
    (url: string, type: AudioType): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Stop any currently playing audio
        stopAudio();

        // Handle empty URL
        if (!url) {
          setError("No audio URL provided");
          resolve();
          return;
        }

        setError(null);
        setIsLoading(true);
        setCurrentAudioType(type);

        // Create new audio element
        const audio = new Audio(url);
        audioRef.current = audio;
        resolveRef.current = resolve;

        audio.oncanplaythrough = () => {
          setIsLoading(false);
          setIsPlaying(true);
          audio.play().catch((err) => {
            console.error("Error playing audio:", err);
            setError("Failed to play audio");
            setIsPlaying(false);
            setCurrentAudioType(null);
            resolve();
          });
        };

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentAudioType(null);
          resolve();
          resolveRef.current = null;
        };

        audio.onerror = () => {
          console.error("Error loading audio:", url);
          setError("Failed to load audio");
          setIsLoading(false);
          setIsPlaying(false);
          setCurrentAudioType(null);
          resolve(); // Resolve instead of reject to allow flow to continue
          resolveRef.current = null;
        };

        // Start loading
        audio.load();
      });
    },
    [stopAudio]
  );

  return {
    playAudio,
    stopAudio,
    isPlaying,
    currentAudioType,
    isLoading,
    error,
  };
}
