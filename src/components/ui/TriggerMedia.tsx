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
  /**
   * Layout mode:
   * - "fill" (default): `<Image fill>` / absolutely-positioned `<video>` that
   *   stretch to a parent-defined aspect box. No layout shift when swapping media.
   * - "natural": in-flow media sized to its own intrinsic dimensions, so the
   *   surrounding box hugs the media. The caller's `className` supplies the
   *   constraints (e.g. `max-h-[400px] w-auto`). Used on mobile where a fixed
   *   letterbox wastes vertical space.
   */
  fit?: "fill" | "natural";
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
  fit = "fill",
}: TriggerMediaProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const showVideo = !!videoUrl && !videoFailed && !reducedMotion;

  // Natural mode: in-flow media sized to its intrinsic dimensions. The caller's
  // `className` carries the sizing constraints (e.g. `max-h-[400px] w-auto`).
  if (fit === "natural") {
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
          className={className}
        />
      );
    }
    if (imageUrl) {
      // Intrinsic dimensions are unknown at build time, so a plain <img> lets the
      // box hug the file's real size; next/image `fill` can't do that.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={imageUrl} alt={alt} className={className} />;
    }
    return null;
  }

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
