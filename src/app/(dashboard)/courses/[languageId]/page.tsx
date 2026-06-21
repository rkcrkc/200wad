import { BackButton } from "@/components/ui/back-button";
import { getCourses } from "@/lib/queries";
import { CourseCard } from "@/components/CourseCard";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { UnlockBundlePromo } from "@/components/UnlockBundlePromo";
import { PageContainer } from "@/components/PageContainer";
import { notFound } from "next/navigation";
import { getFlagFromCode } from "@/lib/utils/flags";
import { hasActiveSubscription, getActivePricingPlans } from "@/lib/queries/subscriptions";
import { getDefaultFreeLessons } from "@/lib/utils/accessControl";
import { createClient } from "@/lib/supabase/server";

interface CoursesPageProps {
  params: Promise<{ languageId: string }>;
}

export default async function CoursesPage({ params }: CoursesPageProps) {
  const { languageId } = await params;
  const { language, courses, isGuest, currentCourseId } = await getCourses(languageId);

  if (!language) {
    notFound();
  }

  // Fetch pricing and access info in parallel
  const [plansResult, freeLessons, accessInfo] = await Promise.all([
    getActivePricingPlans("language"),
    getDefaultFreeLessons(),
    (async () => {
      if (isGuest) return false;
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const [langAccess, allAccess] = await Promise.all([
        hasActiveSubscription(user.id, "language", languageId),
        hasActiveSubscription(user.id, "all-languages"),
      ]);
      return langAccess || allAccess;
    })(),
  ]);
  const hasAccess = accessInfo;

  // Calculate total words across all courses
  const totalWords = courses.reduce((sum, course) => sum + course.actualWordCount, 0);

  const languageFlag = getFlagFromCode(language.code);

  return (
    <SetCourseContext languageId={languageId} languageFlag={languageFlag} languageName={language.name}>
    <PageContainer size="sm">
      {/* Back Button */}
      <BackButton href="/dashboard?pick=true" label="All Languages" />

      {/* Header with Language Flag */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-4xl">
          {languageFlag}
        </div>
        <div>
          <h1 className="mb-1 text-page-header">{language.name} Courses</h1>
          <p className="text-muted-foreground">
            First {freeLessons} lessons free in every course
          </p>
        </div>
      </div>

      {/* Unlock Bundle Promo */}
      {courses.length > 0 && !hasAccess && (
        <UnlockBundlePromo
          languageName={language.name}
          courseCount={courses.length}
          totalWords={totalWords}
          plans={plansResult.plans}
        />
      )}

      {/* Courses Grid - 2 Columns */}
      {courses.length === 0 ? (
        <EmptyState
          title={`No courses available yet for ${language.name}.`}
          description="Courses will appear here once added."
        />
      ) : (
        <div className="flex flex-col gap-6 pb-8">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isActive={course.id === currentCourseId}
            />
          ))}
        </div>
      )}

      {/* Guest CTA */}
      {isGuest && courses.length > 0 && (
        <GuestCTA
          title="Sign up to track your progress across all courses"
          className="mt-4"
        />
      )}
    </PageContainer>
    </SetCourseContext>
  );
}
