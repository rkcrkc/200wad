import { getAllLevelsAdmin } from "@/lib/queries/levels";
import { LevelsClient } from "./LevelsClient";

export default async function AdminLevelsPage() {
  const levels = await getAllLevelsAdmin();

  return (
    <div>
      <LevelsClient levels={levels} />
    </div>
  );
}
