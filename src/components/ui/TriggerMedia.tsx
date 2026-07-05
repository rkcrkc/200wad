"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * SSR-safe subscription to the reduced-motion media query. Uses
 * `useSyncExternalStore` rather than an effect so we never call setState
 * synchronously inside an effect (which triggers cascading renders).
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

interface TriggerMediaProps {
  /** Poster/fallback still. Also used as the `<video>` poster while buffering. */
  imageUrl: string | null;
  /** Optional MP4 trigger clip. When present (and motion allowed), plays silently. */
  videoUrl: string | null;
  alt: string;
  /**
   * object-fit / sizing classes for the still `<Image>` at this call site.
   * The video is always `object-contain` (never crops) regardless of this.
   */
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Single source of truth for rendering a memory-trigger media slot: a silent,
 * looping MP4 when one exists, otherwise the still image. The silent / loop /
 * autoplay / no-crop defaults are hard-coded here so they can't drift across the
 * many render sites (WordCard, study grid, test mode…).
 *
 * The parent supplies a `relative` aspect box; both the `<Image fill>` and the
 * absolutely-filled `<video>` stretch to it, so swapping media causes no layout
 * shift. Falls back to the poster image on decode/load error or when the user
 * prefers reduced motion.
 */
export function TriggerMedia({
  imageUrl,
  videoUrl,
  alt,
  className,
  sizes,
  priority,
}: TriggerMediaProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const showVideo = !!videoUrl && !videoFailed && !reducedMotion;

  if (showVideo) {
    return (
      <video
        src={videoUrl!}
        poster={imageUrl ?? undefined}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={alt}
        onError={() => setVideoFailed(true)}
        className="absolute inset-0 h-full w-full bg-transparent object-contain"
      />
    );
  }

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        priority={priority}
        className={className}
        sizes={sizes}
      />
    );
  }

  return null;
}
