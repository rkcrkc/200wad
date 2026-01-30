import Link from "next/link";
import { getUserSettings } from "@/lib/queries/settings";
import {
  ProfileSection,
  LearningLanguagesSection,
  SecuritySection,
  DangerZoneSection,
  ErrorState,
} from "@/components/settings";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const { settings, isGuest, error } = await getUserSettings();

  // Guest user prompt
  if (isGuest) {
    return (
      <div className="mx-auto max-w-4xl">
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
      </div>
    );
  }

  // Error state
  if (error || !settings) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-3xl font-semibold">Account Settings</h1>

      <ProfileSection settings={settings} />

      <LearningLanguagesSection languages={settings.learningLanguages} />

      <SecuritySection
        email={settings.email}
        twoFactorEnabled={settings.twoFactorEnabled}
      />

      <DangerZoneSection />
    </div>
  );
}
