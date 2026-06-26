import Link from "next/link";
import { getUserSettings } from "@/lib/queries/settings";
import { getUserLevel } from "@/lib/queries/levels";
import { ProfileSection, ErrorState } from "@/components/settings";
import { LevelCard } from "@/components/levels/LevelCard";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
  const [{ settings, isGuest, error }, levelData] = await Promise.all([
    getUserSettings(),
    getUserLevel(),
  ]);

  // Guest user prompt
  if (isGuest) {
    return (
      <PageContainer size="sm">
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <h1 className="mb-4 text-3xl font-semibold">Create an Account</h1>
          <p className="mb-6 text-gray-600">
            Sign up to save your progress and access your profile from any
            device.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (error || !settings) {
    return (
      <PageContainer size="sm">
        <ErrorState error={error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="sm">
      <h1 className="mb-8 text-3xl font-semibold">Profile</h1>

      <ProfileSection settings={settings} />

      {levelData && (
        <div className="mb-6">
          <LevelCard data={levelData} />
        </div>
      )}
    </PageContainer>
  );
}
