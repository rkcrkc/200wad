"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SocialLoginButtons } from "./SocialLoginButtons";
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

// Level emoji placeholders
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

interface OnboardingModalProps {
  languages: LanguageWithCourses[];
  defaultCourseId: string;
  freeLessons?: number;
}

type Step = "language" | "signup";
type AuthMode = "signup" | "signin";

export function OnboardingModal({ languages, defaultCourseId, freeLessons = 10 }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("language");
  // Pre-select first language by default
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    languages[0]?.id || null
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>(defaultCourseId);

  // Auth state
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const selectedLanguage = languages.find((l) => l.id === selectedLanguageId);

  // Disable body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleLanguageContinue = () => {
    if (!selectedLanguageId || !selectedLanguage) return;

    // Get the first course for this language
    const firstCourse = selectedLanguage.courses[0];
    if (firstCourse) {
      setSelectedCourseId(firstCourse.id);
      // Store selection for after signup
      localStorage.setItem(
        "onboarding_selection",
        JSON.stringify({
          languageId: selectedLanguageId,
          courseId: firstCourse.id,
        })
      );
    }

    setStep("signup");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/course/${selectedCourseId}/schedule`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If we got a session, redirect immediately (user can verify email later)
    if (data.session) {
      localStorage.removeItem("onboarding_selection");
      router.push(`/course/${selectedCourseId}/schedule`);
      router.refresh();
      return;
    }

    // Fallback to success screen if no session (requires email verification first)
    setSuccess(true);
    setLoading(false);
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Clear onboarding selection and refresh
    localStorage.removeItem("onboarding_selection");
    router.push(`/course/${selectedCourseId}/schedule`);
    router.refresh();
  };

  // Success state after signup
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
        <div className="flex w-full max-w-content-sm flex-col overflow-hidden rounded-3xl bg-white">
          <div className="bg-[#EDE8DF] px-8 py-12 text-center">
            <div className="bg-success/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-success h-8 w-8"
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
            </div>
            <h1 className="mb-2 text-3xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a confirmation link to <strong>{email}</strong>.
              <br />
              Click the link to start learning!
            </p>
          </div>
          <div className="px-8 py-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-base">🎓</span>
                <span>
                  <strong className="text-foreground">What&apos;s included free:</strong>{" "}
                  First {freeLessons} lessons{selectedLanguage ? ` in ${selectedLanguage.name}` : ""}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-base">✨</span>
                <span>Upgrade anytime for full access to all lessons</span>
              </div>
            </div>
            <a
              href="/account/subscriptions"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              View Plans
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Language Selection
  if (step === "language") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
        <div className="flex h-[720px] max-h-[90vh] w-full max-w-content-sm flex-col overflow-hidden rounded-3xl bg-white">
          {/* Header */}
          <div className="shrink-0 bg-[#EDE8DF] px-8 pt-8 pb-6 text-center">
            <h1 className="mb-2 text-3xl font-bold">Welcome to 200 Words a Day</h1>
            <p className="text-muted-foreground">
              What language do you want to study?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              First {freeLessons} lessons free in every course
            </p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto bg-bone p-8">
            <div className="space-y-3">
              {languages.map((language) => {
                const isSelected = selectedLanguageId === language.id;
                const flag = FLAG_MAP[language.code] || "🌐";

                return (
                  <button
                    key={language.id}
                    onClick={() => setSelectedLanguageId(language.id)}
                    className={`flex w-full flex-col rounded-xl border bg-white p-6 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{flag}</span>
                      <div className="flex-1">
                        <div className="text-xl-semibold text-foreground">
                          {language.name}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {language.courses.length}{" "}
                          {language.courses.length === 1 ? "course" : "courses"}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                          <svg
                            className="h-5 w-5 text-white"
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
                        </div>
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
          </div>

          {/* Fixed footer */}
          <div className="shrink-0 bg-bone px-8 py-6">
            <div className="flex flex-col items-center gap-3">
              <PrimaryButton
                onClick={handleLanguageContinue}
                disabled={!selectedLanguageId}
                fullWidth
              >
                {selectedLanguage ? `Start ${selectedLanguage.name}` : "Continue"}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setStep("signup");
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Already have an account? <span className="text-primary font-medium">Log in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Signup/Signin
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex h-[720px] max-h-[90vh] w-full max-w-content-sm flex-col overflow-hidden rounded-3xl bg-white">
        {/* Header */}
        <div className="shrink-0 bg-[#EDE8DF] px-8 pt-8 pb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold">
            {authMode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground">
            {authMode === "signup"
              ? "Sign up to save your progress"
              : "Sign in to continue learning"}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-bone p-8">
          <div className="mx-auto max-w-md space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="modal-email"
                  className="text-small-semibold text-foreground block"
                >
                  Email
                </label>
                <input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 mt-1 block w-full rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-password"
                  className="text-small-semibold text-foreground block"
                >
                  Password
                </label>
                <input
                  id="modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 mt-1 block w-full rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
                  placeholder="••••••••"
                />
                {authMode === "signin" && (
                  <div className="mt-1 text-right">
                    <a
                      href="/forgot-password"
                      className="text-primary text-sm hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                )}
              </div>

              {authMode === "signup" && (
                <div>
                  <label
                    htmlFor="modal-confirm-password"
                    className="text-small-semibold text-foreground block"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="modal-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 mt-1 block w-full rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-bone px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <SocialLoginButtons mode={authMode} />
          </div>
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 bg-bone px-8 py-6">
          <div className="flex flex-col items-center gap-3">
            <PrimaryButton
              onClick={authMode === "signup" ? handleSignup : handleSignin}
              loading={loading}
              fullWidth
            >
              {loading
                ? authMode === "signup"
                  ? "Creating account..."
                  : "Signing in..."
                : authMode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </PrimaryButton>
            <div className="flex w-full items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("language")}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <p className="text-muted-foreground">
                {authMode === "signup" ? (
                  <>
                    Have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("signin")}
                      className="text-primary font-medium hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Need an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className="text-primary font-medium hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseThumb({ course }: { course: CoursePreview }) {
  const emoji = getLevelEmoji(course.level);

  return (
    <div className="flex min-w-[80px] flex-col items-center rounded-lg bg-muted/50 p-2">
      {course.thumbnailUrl ? (
        <img
          src={course.thumbnailUrl}
          alt={course.name}
          className="h-8 w-8 rounded object-cover"
        />
      ) : (
        <span className="text-xl">{emoji}</span>
      )}
      <span className="mt-1 text-xs text-muted-foreground line-clamp-1">
        {course.name}
      </span>
    </div>
  );
}
