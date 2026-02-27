"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type AudioType = "english" | "foreign" | "trigger";

interface UseAudioReturn {
  /** Play audio from URL, returns a promise that resolves when audio ends */
  playAudio: (url: string, type: AudioType) => Promise<void>;
  /** Stop current audio playback */
  stopAudio: () => void;
  /** Preload audio URLs for faster playback */
  preloadAudio: (urls: (string | null | undefined)[]) => void;
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
  const requestIdRef = useRef<number>(0);
  const preloadCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.oncanplaythrough = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopAudio = useCallback(() => {
    // Increment request ID to invalidate any pending audio
    requestIdRef.current++;

    if (audioRef.current) {
      // Remove event handlers to prevent callbacks from firing
      audioRef.current.oncanplaythrough = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
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

  // Preload audio URLs for faster playback
  const preloadAudio = useCallback((urls: (string | null | undefined)[]) => {
    urls.forEach((url) => {
      if (!url || preloadCacheRef.current.has(url)) return;

      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
      preloadCacheRef.current.set(url, audio);
    });
  }, []);

  const playAudio = useCallback(
    (url: string, type: AudioType): Promise<void> => {
      console.log(`[useAudio] playAudio called for type: ${type}`);
      return new Promise((resolve) => {
        // Stop any currently playing audio and get new request ID
        stopAudio();
        const currentRequestId = requestIdRef.current;

        // Handle empty URL
        if (!url) {
          console.log(`[useAudio] No URL for type: ${type}`);
          setError("No audio URL provided");
          resolve();
          return;
        }

        setError(null);
        setCurrentAudioType(type);

        // Check if audio is preloaded
        const cachedAudio = preloadCacheRef.current.get(url);
        const audio = cachedAudio || new Audio(url);
        audioRef.current = audio;
        resolveRef.current = resolve;

        // Reset to start if reusing cached audio
        if (cachedAudio) {
          audio.currentTime = 0;
        }

        const setupAndPlay = () => {
          // Check if this request is still valid
          if (requestIdRef.current !== currentRequestId) {
            console.log(`[useAudio] Ignoring stale play for type: ${type}`);
            return;
          }
          console.log(`[useAudio] Starting playback for type: ${type}`);
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
          // Check if this request is still valid
          if (requestIdRef.current !== currentRequestId) {
            console.log(`[useAudio] Ignoring stale onended for type: ${type}`);
            return;
          }
          console.log(`[useAudio] Playback ended for type: ${type}`);
          setIsPlaying(false);
          setCurrentAudioType(null);
          resolve();
          resolveRef.current = null;
        };

        audio.onerror = () => {
          // Check if this request is still valid
          if (requestIdRef.current !== currentRequestId) {
            return;
          }
          console.error("Error loading audio:", url);
          setError("Failed to load audio");
          setIsLoading(false);
          setIsPlaying(false);
          setCurrentAudioType(null);
          resolve();
          resolveRef.current = null;
        };

        // If already loaded (cached or ready), play immediately
        if (audio.readyState >= 3) {
          setupAndPlay();
        } else {
          setIsLoading(true);
          audio.oncanplaythrough = () => {
            if (requestIdRef.current !== currentRequestId) return;
            setupAndPlay();
          };
          if (!cachedAudio) {
            audio.load();
          }
        }
      });
    },
    [stopAudio]
  );

  return {
    playAudio,
    stopAudio,
    preloadAudio,
    isPlaying,
    currentAudioType,
    isLoading,
    error,
  };
}
