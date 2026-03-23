"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { recordReferralSignup } from "@/lib/mutations/referrals";
import type { LanguageWithCourses, CoursePreview } from "@/lib/queries/onboarding";

// Flag emoji mapping by language code
const FLAG_MAP: Record<string, string> = {
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇧🇷",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  ru: "🇷🇺",
  ar: "🇸🇦",
  hi: "🇮🇳",
  nl: "🇳🇱",
  sv: "🇸🇪",
  pl: "🇵🇱",
  tr: "🇹🇷",
  vi: "🇻🇳",
  th: "🇹🇭",
  id: "🇮🇩",
  el: "🇬🇷",
  he: "🇮🇱",
};

// Level emoji placeholders (until real thumbnails are added)
const LEVEL_EMOJI: Record<string, string> = {
  beginner: "🌱",
  intermediate: "🌿",
  advanced: "🌳",
  default: "📚",
};

function getLevelEmoji(level: string | null): string {
  if (!level) return LEVEL_EMOJI.default;
  const normalized = level.toLowerCase();
  if (normalized.includes("beginner") || normalized.includes("1")) return LEVEL_EMOJI.beginner;
  if (normalized.includes("intermediate") || normalized.includes("2")) return LEVEL_EMOJI.intermediate;
  if (normalized.includes("advanced") || normalized.includes("3")) return LEVEL_EMOJI.advanced;
  return LEVEL_EMOJI.default;
}

interface OnboardingClientProps {
  languages: LanguageWithCourses[];
}

export function OnboardingClient({ languages }: OnboardingClientProps) {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const referralRecorded = useRef(false);

  // Record referral signup if a referral code was stored during signup
  useEffect(() => {
    if (referralRecorded.current) return;
    const code = localStorage.getItem("referral_code");
    if (code) {
      referralRecorded.current = true;
      recordReferralSignup(code).then(() => {
        localStorage.removeItem("referral_code");
      });
    }
  }, []);

  const selectedLanguage = languages.find((l) => l.id === selectedLanguageId);

  const handleContinue = async () => {
    if (!selectedLanguageId || !selectedLanguage) return;

    setLoading(true);

    // Get the first course for this language
    const firstCourse = selectedLanguage.courses[0];
    if (!firstCourse) {
      setLoading(false);
      return;
    }

    // Store selection in localStorage for guest users
    localStorage.setItem(
      "onboarding_selection",
      JSON.stringify({
        languageId: selectedLanguageId,
        courseId: firstCourse.id,
      })
    );

    // Navigate to schedule page (modal will appear there)
    router.push(`/course/${firstCourse.id}/schedule`);
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-page-header text-foreground">
            What language are you learning?
          </h1>
          <p className="text-muted-foreground mt-2">
            You can explore more languages later
          </p>
        </div>

        <div className="space-y-3">
          {languages.map((language) => {
            const isSelected = selectedLanguageId === language.id;
            const flag = FLAG_MAP[language.code] || "🌐";

            return (
              <button
                key={language.id}
                onClick={() => setSelectedLanguageId(language.id)}
                className={`flex w-full flex-col rounded-xl border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{flag}</span>
                  <div className="flex-1">
                    <div className="text-large-semibold text-foreground">
                      {language.name}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {language.courses.length}{" "}
                      {language.courses.length === 1 ? "course" : "courses"}
                    </div>
                  </div>
                  {isSelected && (
                    <svg
                      className="text-primary h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                {/* Course previews */}
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {language.courses.map((course) => (
                    <CourseThumb key={course.id} course={course} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedLanguageId || loading}
          className="w-full"
          size="lg"
        >
          {loading ? "Loading..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function CourseThumb({ course }: { course: CoursePreview }) {
  const emoji = getLevelEmoji(course.level);

  return (
    <div className="flex min-w-[100px] flex-col items-center rounded-lg bg-muted/50 p-2">
      {course.thumbnailUrl ? (
        <img
          src={course.thumbnailUrl}
          alt={course.name}
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <span className="text-2xl">{emoji}</span>
      )}
      <span className="mt-1 text-xs text-muted-foreground line-clamp-1">
        {course.name}
      </span>
    </div>
  );
}
