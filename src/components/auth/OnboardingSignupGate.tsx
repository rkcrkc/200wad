"use client";

import { OnboardingModal } from "./OnboardingModal";
import type { LanguageWithCourses } from "@/lib/queries/onboarding";

interface OnboardingSignupGateProps {
  courseId: string;
  isGuest: boolean;
  languages: LanguageWithCourses[];
}

export function OnboardingSignupGate({
  courseId,
  isGuest,
  languages
}: OnboardingSignupGateProps) {
  // Only show for guests
  if (!isGuest) {
    return null;
  }

  return <OnboardingModal languages={languages} defaultCourseId={courseId} />;
}
