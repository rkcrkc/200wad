import Link from "next/link";
import { getUserSettings } from "@/lib/queries/settings";
import {
  ProfileSection,
  LearningLanguagesSection,
  SecuritySection,
  DangerZoneSection,
  ErrorState,
} from "@/components/settings";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const { settings, isGuest, error } = await getUserSettings();

  // Guest user prompt
  if (isGuest) {
    return (
      <PageContainer size="sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="mb-4 text-3xl font-semibold">Create an Account</h1>
          <p className="mb-6 text-gray-600">
            Sign up to save your progress and access your settings from any
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
      <h1 className="mb-8 text-3xl font-semibold">Account Settings</h1>

      <ProfileSection settings={settings} />

      <LearningLanguagesSection languages={settings.learningLanguages} />

      <SecuritySection
        email={settings.email}
        twoFactorEnabled={settings.twoFactorEnabled}
      />

      <DangerZoneSection />
    </PageContainer>
  );
}
