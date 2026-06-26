import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getLanguages,
  getUserSubscriptions,
  getActivePricingPlans,
  getPricingTierCopy,
} from "@/lib/queries";
import { getEnabledTiers, getDefaultFreeLessons } from "@/lib/utils/accessControl";
import { getFlagFromCode } from "@/lib/utils/flags";
import { getLanguageCourseBundles } from "@/lib/queries/languageCourses";
import {
  LanguageCardStack,
  type LanguageCardItem,
} from "@/components/languages/LanguageCardStack";
import { LanguagesUpgradeProvider } from "@/components/languages/LanguagesUpgradeProvider";
import { UnlockAllLanguagesCallout } from "@/components/languages/UnlockAllLanguagesCallout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { GuestCTA } from "@/components/GuestCTA";
import { PageContainer } from "@/components/PageContainer";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pick?: string }>;
}) {
  const { pick } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve the user's selected course. Redirect straight to its schedule
  // unless ?pick=true, which lets the user stay here to manage languages.
  let currentCourseId: string | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("current_course_id")
      .eq("id", user.id)
      .single();
    currentCourseId = userData?.current_course_id ?? null;

    if (currentCourseId && pick !== "true") {
      redirect(`/course/${currentCourseId}/schedule`);
    }
  }

  const { languages, isGuest } = await getLanguages();

  // Upgrade flow data: plans + enabled tiers feed the shared UpgradeModal, and
  // the user's effective subscriptions decide which languages are already
  // unlocked (so their "Upgrade plan" button is hidden).
  const [subsResult, { plans }, enabledTiers, defaultFreeLessons, copy] =
    await Promise.all([
      user
        ? getUserSubscriptions()
        : Promise.resolve({ subscriptions: [], error: null }),
      getActivePricingPlans(),
      getEnabledTiers(),
      getDefaultFreeLessons(),
      getPricingTierCopy(),
    ]);

  const effectiveSubs = subsResult.subscriptions.filter((s) => s.isEffective);
  const hasAllAccess = effectiveSubs.some((s) => s.type === "all-languages");

  // Promote the all-languages plan to signed-in users who don't already have it.
  const showUnlockAll =
    !isGuest && !hasAllAccess && enabledTiers.includes("all-languages");

  // Enrolled languages form the "My Languages" group; the rest are browsable
  // under "Available Languages". Guests have no enrolled set, so everything
  // shows as available and they keep the sign-up CTA. The language currently
  // being studied is surfaced first.
  const myLanguages = languages
    .filter((l) => l.isEnrolled)
    .sort((a, b) => Number(b.isCurrentLanguage) - Number(a.isCurrentLanguage));
  const availableLanguages = languages.filter((l) => !l.isEnrolled);
  const currentLanguageId =
    myLanguages.find((l) => l.isCurrentLanguage)?.id ?? null;

  // Single-language upgrade picker: offer every language the user hasn't already
  // unlocked via an effective language subscription.
  const unlockedLanguageIds = new Set(
    effectiveSubs
      .filter((s) => s.type === "language" && s.target_id)
      .map((s) => s.target_id as string)
  );

  // Eagerly load every shown language's courses (with lesson/word expansions)
  // so selecting a language's card paints its courses instantly — no round-trip.
  const bundleEntries = await Promise.all(
    [...myLanguages, ...availableLanguages].map(
      async (l) => [l.id, await getLanguageCourseBundles(l.id)] as const
    )
  );
  const coursesByLanguage = new Map(bundleEntries);

  // Lesson totals come from the eagerly-loaded course bundles; course/word
  // totals are already computed per language by getLanguages().
  const lessonsForLanguage = (languageId: string) =>
    (coursesByLanguage.get(languageId) ?? []).reduce(
      (sum, b) => sum + b.course.totalLessons,
      0
    );

  // Upgrade cards quote real content totals so the value is concrete. The
  // single-language picker defaults to the current course's language so the
  // modal opens pre-targeted.
  const upgradeLanguages = languages
    .filter((l) => !unlockedLanguageIds.has(l.id))
    .map((l) => ({
      id: l.id,
      name: l.name,
      flag: getFlagFromCode(l.code),
      courses: l.courseCount,
      lessons: lessonsForLanguage(l.id),
      words: l.totalWords,
    }));
  const upgradeDefaultLanguageId =
    upgradeLanguages.find((l) => l.id === currentLanguageId)?.id ??
    upgradeLanguages[0]?.id;

  // All-languages card totals span every language we offer.
  const allLanguagesStats = {
    languages: languages.length,
    courses: languages.reduce((sum, l) => sum + l.courseCount, 0),
    lessons: languages.reduce((sum, l) => sum + lessonsForLanguage(l.id), 0),
    words: languages.reduce((sum, l) => sum + l.totalWords, 0),
  };

  const myItems: LanguageCardItem[] = myLanguages.map((language) => ({
    language,
    courses: coursesByLanguage.get(language.id) ?? [],
  }));
  const availableItems: LanguageCardItem[] = availableLanguages.map(
    (language) => ({
      language,
      courses: coursesByLanguage.get(language.id) ?? [],
    })
  );

  return (
    <PageContainer size="md">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-page-header text-foreground">
            Courses
          </h1>
          <p className="text-muted-foreground">
            Select a language to continue learning or add a new one
          </p>
        </div>
        {!isGuest && (
          <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
            <Link href="/account/subscriptions">
              Manage subscriptions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {languages.length === 0 ? (
        <EmptyState
          title="No languages available yet."
          description="Languages will appear here once added by an admin."
        />
      ) : (
        <LanguagesUpgradeProvider
          plans={plans}
          enabledTiers={enabledTiers}
          freeLessons={defaultFreeLessons}
          languages={upgradeLanguages}
          defaultLanguageId={upgradeDefaultLanguageId}
          allLanguagesStats={allLanguagesStats}
          copy={copy}
        >
          <div className="space-y-8">
          {/* Unlock all languages promo */}
          {showUnlockAll && <UnlockAllLanguagesCallout />}

          {/* My Languages */}
          <section>
            <h2 className="mb-5 text-xl-semibold text-foreground">
              My Languages
            </h2>
            {isGuest ? (
              <EmptyState
                title="You're not learning any languages yet."
                description="Sign up to start learning a language."
              />
            ) : (
              <LanguageCardStack
                items={myItems}
                defaultSelectedId={currentLanguageId}
                manageLanguages={languages}
              />
            )}
          </section>

          {/* Available Languages */}
          <section>
            <h2 className="mb-5 text-xl-semibold text-foreground">
              Available Languages
            </h2>
            {availableLanguages.length > 0 ? (
              <LanguageCardStack items={availableItems} />
            ) : (
              <EmptyState
                title="No other languages available."
                description="You're already learning every available language."
              />
            )}
          </section>
          </div>
        </LanguagesUpgradeProvider>
      )}

      {isGuest && languages.length > 0 && (
        <GuestCTA description="Your learning progress will be saved when you sign up." />
      )}
    </PageContainer>
  );
}
