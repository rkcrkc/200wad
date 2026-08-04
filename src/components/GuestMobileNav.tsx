"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useCourseContext } from "@/context/CourseContext";
import { cn } from "@/lib/utils";

interface GuestMobileNavProps {
  /** Layout/placement classes from the parent (height, padding, md:hidden, etc). */
  className?: string;
}

/**
 * Placeholder marketing-style top bar for the guest/onboarding flow on mobile:
 * the 200WAD logo on the left and a (currently dead) hamburger on the right.
 * Background-less so it reads as part of whatever surface it sits on; the real
 * marketing navbar replaces this later. Reused by the Header preview bar and the
 * full-screen onboarding page so the two stay in sync.
 */
export function GuestMobileNav({ className }: GuestMobileNavProps) {
  const { languageId, courseId } = useCourseContext();
  const pathname = usePathname();

  const isInsideCourse =
    pathname.startsWith("/course/") || pathname.startsWith("/lesson/");
  const homeHref = (() => {
    if (!courseId) return "/dashboard";
    if (isInsideCourse && languageId) return `/courses/${languageId}`;
    return `/course/${courseId}/schedule`;
  })();

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-1">
        {/* Hamburger — leading (far left) so it matches the app header. */}
        <button
          type="button"
          className="hover:bg-bone-hover flex h-10 w-10 items-center justify-center rounded-[10px] transition-all"
          aria-label="Open menu"
        >
          <Menu className="text-foreground h-6 w-6" />
        </button>
        <Link href={homeHref} className="flex items-center" aria-label="200 Words a Day home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-placeholder.svg" alt="200 Words a Day" className="h-9 w-auto" />
        </Link>
      </div>
      <Link
        href="/login"
        className="text-regular-semibold text-foreground hover:bg-bone-hover flex h-10 items-center rounded-[10px] px-3 transition-all"
      >
        Sign in
      </Link>
    </div>
  );
}
