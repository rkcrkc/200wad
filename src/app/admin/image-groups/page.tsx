import { getAllImageGroupsAdmin } from "@/lib/queries/imageGroups";
import { ImageGroupsClient } from "./ImageGroupsClient";

export default async function AdminImageGroupsPage() {
  const groups = await getAllImageGroupsAdmin();

  return (
    <div>
      <ImageGroupsClient groups={groups} />
    </div>
  );
}
