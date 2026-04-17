import { getAllTips } from "@/lib/queries/tips";
import { TipsClient } from "./TipsClient";

export default async function AdminTipsPage() {
  const tips = await getAllTips();

  return (
    <div>
      <TipsClient tips={tips} />
    </div>
  );
}
