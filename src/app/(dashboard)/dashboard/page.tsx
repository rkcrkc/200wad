import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLanguages } from "@/lib/queries";
import { LanguageCard } from "@/components/LanguageCard";
import { AddLanguageCard } from "@/components/AddLanguageCard";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageContainer } from "@/components/PageContainer";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pick?: string }>;
}) {
  const { pick } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to current course schedule if user has one set
  // Skip redirect when ?pick=true so the user can switch language
  if (user && pick !== "true") {
    const { data: userData } = await supabase
      .from("users")
      .select("current_course_id")
      .eq("id", user.id)
      .single();

    if (userData?.current_course_id) {
      redirect(`/course/${userData.current_course_id}/schedule`);
    }
  }

  // No current course - show My Languages to pick one
  const { languages, isGuest } = await getLanguages();

  return (
    <PageContainer size="md">
      <div className="mb-8">
        <h1 className="mb-2 text-page-header text-foreground">My Languages</h1>
        <p className="text-muted-foreground">
          Select a language to continue learning or add a new one
        </p>
      </div>

      {/* Languages Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {languages.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No languages available yet."
              description="Languages will appear here once added by an admin."
            />
          </div>
        ) : (
          <>
            {languages.map((language) => (
              <LanguageCard
                key={language.id}
                language={language}
                isActive={language.isCurrentLanguage}
              />
            ))}
            <AddLanguageCard />
          </>
        )}
      </div>

      {/* Guest CTA */}
      {isGuest && languages.length > 0 && (
        <GuestCTA description="Your learning progress will be saved when you sign up." />
      )}
    </PageContainer>
  );
}
