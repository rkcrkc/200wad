import { getAdminSettingsData } from "@/lib/queries/admin";
import { AdminSettingsClient } from "@/components/admin/settings/AdminSettingsClient";

export default async function AdminSettingsPage() {
  const { data, error } = await getAdminSettingsData();

  if (error || !data) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">
            {error || "Unable to load settings data."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage pricing plans, platform configuration, and subscription settings.
        </p>
      </div>
      <AdminSettingsClient data={data} />
    </div>
  );
}
