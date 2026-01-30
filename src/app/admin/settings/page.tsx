import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Admin configuration and preferences.
        </p>
      </div>

      {/* Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Settings className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500">
          Settings will be available here soon.
        </p>
      </div>
    </div>
  );
}
