import { listBroadcasts } from "@/lib/queries/notifications";
import {
  listNotificationTypes,
  listNotificationTemplates,
} from "@/lib/queries/notification-config";
import { NotificationsTabs } from "./NotificationsTabs";

export default async function AdminNotificationsPage() {
  const [broadcasts, types, templates] = await Promise.all([
    listBroadcasts(),
    listNotificationTypes(),
    listNotificationTemplates(),
  ]);

  return (
    <div>
      <NotificationsTabs
        broadcasts={broadcasts}
        types={types}
        templates={templates}
      />
    </div>
  );
}
