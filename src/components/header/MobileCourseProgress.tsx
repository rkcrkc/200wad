"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ProgressRingWithLabel } from "@/components/ui/progress-ring-with-label";
import { Button } from "@/components/ui/button";
import { formatDuration, formatNumber, formatPercent, formatRatioPercent } from "@/lib/utils/helpers";
import type { HeaderStats } from "../DashboardContent";

interface MobileCourseProgressProps {
  courseId: string;
  /** Course-scoped header stats (already merged with CourseContext overrides). */
  stats: HeaderStats;
  /** All-course learning time, for the "All courses" row of the study-time block. */
  allCourseTotalTimeSeconds?: number;
}

/**
 * Mobile-only course progress indicator for the top header. Renders a compact
 * ring (percentage inside, matching the courses-page cards) that on tap opens a
 * full-width dropdown sheet with completion, words/day and study time, plus a
 * shortcut into the full progress page.
 *
 * Hidden at md+, where the header already shows these stats inline. The sheet is
 * portalled to <body> and positioned `fixed` so it always spans the viewport
 * width regardless of any transformed ancestors. Interaction follows
 * {@link ProfileDropdown}: click toggles, Escape closes, and an outside tap
 * closes it (touch devices have no hover to fall back on).
 */
export function MobileCourseProgress({
  courseId,
  stats,
  allCourseTotalTimeSeconds,
}: MobileCourseProgressProps) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 12, width: 280 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Portal target (document.body) only exists after mount on the client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount flag
    setMounted(true);
  }, []);

  // Position the sheet centred under the ring, then clamp within the viewport so
  // it never bleeds off an edge (the ring sits near the left, so an un-clamped
  // centre would overflow left). Recompute on open and resize.
  useEffect(() => {
    if (!open) return;
    function recompute() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(window.innerWidth - margin * 2, 280);
      const ringCentre = rect.left + rect.width / 2;
      const left = Math.max(
        margin,
        Math.min(ringCentre - width / 2, window.innerWidth - width - margin)
      );
      setPanelPos({ top: rect.bottom + 8, left, width });
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Close on outside tap/click — touch has no mouseleave to lean on. The panel is
  // portalled out of the container, so check it separately.
  useEffect(() => {
    if (!open) return;
    function handlePointer(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  const percent = stats.courseProgressPercent ?? 0;
  const wordsMastered = stats.wordsMastered ?? 0;
  const totalWords = stats.totalWords ?? 0;
  const courseTotal = stats.totalTimeSeconds ?? 0;
  const allTotal = allCourseTotalTimeSeconds ?? courseTotal;

  // Words-per-day rate, mirroring the desktop popover: words learned per hour of
  // learning time, projected onto an 8-hour day.
  const wordsPerDay = stats.wordsPerDay ?? 0;
  const wordsLearned = stats.totalWordsLearned ?? 0;
  const hours = courseTotal / 3600;
  const perHour = (hours > 0 ? wordsLearned / hours : 0).toFixed(1);

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Course progress"
      style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
      className="fixed z-50 flex flex-col rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5"
    >
      {/* Completion */}
      <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
        {formatPercent(percent)} complete
      </span>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="bg-success h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
      <span className="text-muted-foreground mt-1.5 text-[13px] leading-[1.4]">
        <span className="text-foreground font-semibold">{formatNumber(wordsMastered)}</span> mastered / <span className="text-foreground font-semibold">{formatNumber(totalWords)}</span> total = {formatRatioPercent(wordsMastered, totalWords, { decimals: 1 })}
      </span>

      <div className="my-3 h-px bg-gray-100" />

      {/* Words per day rate */}
      <div className="flex items-center justify-between">
        <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
          Words per day rate
        </span>
        <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
          {formatNumber(wordsPerDay)}
        </span>
      </div>
      <div className="text-muted-foreground mt-1.5 flex flex-col gap-0.5 text-[13px] leading-[1.4]">
        <span>{formatNumber(wordsLearned)} words learned ÷ {formatDuration(courseTotal, { style: "hours" })}</span>
        <span>= {perHour} words/hour × 8-hour day</span>
        <span>= {formatNumber(wordsPerDay)} words/day</span>
      </div>

      <div className="my-3 h-px bg-gray-100" />

      {/* Study time */}
      <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
        Study time
      </span>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-muted-foreground text-[13px] leading-[1.4]">This course</span>
        <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
          {formatDuration(courseTotal)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-muted-foreground text-[13px] leading-[1.4]">All courses</span>
        <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
          {formatDuration(allTotal)}
        </span>
      </div>

      <Link href={`/course/${courseId}/progress`} prefetch onClick={close} className="mt-4">
        <Button className="w-full">View progress</Button>
      </Link>
    </div>
  );

  return (
    <div ref={containerRef} className="relative shrink-0 md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Course progress"
        className="flex items-center rounded-full"
      >
        <ProgressRingWithLabel value={percent} size={36} strokeWidth={3} />
      </button>

      {open && mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
