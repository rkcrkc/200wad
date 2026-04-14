import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/queries/courses";
import { getProgressStats } from "@/lib/queries/stats";
import { SetCourseContext } from "@/components/SetCourseContext";
import { PageShell } from "@/components/PageShell";
import { ProgressClient } from "./ProgressClient";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/server";

interface ProgressPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function ProgressPage({ params }: ProgressPageProps) {
  const { courseId } = await params;

  const [{ course, language }, stats] = await Promise.all([
    getCourseById(courseId),
    getProgressStats(courseId),
  ]);

  if (!course) {
    notFound();
  }

  // Check if guest
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user;

  const languageFlag = getFlagFromCode(language?.code);

  return (
    <SetCourseContext
      languageId={language?.id}
      languageFlag={languageFlag}
      courseId={courseId}
      courseName={course.name}
    >
      <PageShell backLink={{ href: `/course/${courseId}/schedule`, label: "Schedule" }} withTopPadding={false} className="pt-8">
        <h1 className="text-page-header mb-6">Progress</h1>
        <ProgressClient stats={stats} isGuest={isGuest} />
      </PageShell>
    </SetCourseContext>
  );
}
