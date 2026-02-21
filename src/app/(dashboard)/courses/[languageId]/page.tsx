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
import { setCurrentLanguage } from "@/lib/mutations/settings";

interface CoursesPageProps {
  params: Promise<{ languageId: string }>;
}

export default async function CoursesPage({ params }: CoursesPageProps) {
  const { languageId } = await params;
  const { language, courses, isGuest } = await getCourses(languageId);

  if (!language) {
    notFound();
  }

  // Update the user's current language preference when they navigate here
  // This is a "fire and forget" operation - we don't await or handle errors
  if (!isGuest) {
    setCurrentLanguage(languageId);
  }

  // Calculate total words across all courses
  const totalWords = courses.reduce((sum, course) => sum + course.actualWordCount, 0);

  const languageFlag = getFlagFromCode(language.code);

  return (
    <SetCourseContext languageId={languageId} languageFlag={languageFlag} languageName={language.name}>
    <PageContainer size="sm">
      {/* Back Button */}
      <BackButton href="/dashboard" label="All Languages" />

      {/* Header with Language Flag */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-4xl">
          {languageFlag}
        </div>
        <div>
          <h1 className="mb-1 text-page-header">{language.name} Courses</h1>
          <p className="text-muted-foreground">
            First 10 lessons free in every course
          </p>
        </div>
      </div>

      {/* Unlock Bundle Promo */}
      {courses.length > 0 && (
        <UnlockBundlePromo
          languageName={language.name}
          courseCount={courses.length}
          totalWords={totalWords}
        />
      )}

      {/* Courses Grid - 2 Columns */}
      {courses.length === 0 ? (
        <EmptyState
          title={`No courses available yet for ${language.name}.`}
          description="Courses will appear here once added."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
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
