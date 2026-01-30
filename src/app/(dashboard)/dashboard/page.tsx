import { getLanguages } from "@/lib/queries";
import { LanguageCard } from "@/components/LanguageCard";
import { AddLanguageCard } from "@/components/AddLanguageCard";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";

export default async function DashboardPage() {
  const { languages, isGuest } = await getLanguages();

  return (
    <div>
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
    </div>
  );
}
