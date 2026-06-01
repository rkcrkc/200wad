import { PageContainer } from "@/components/PageContainer";
import { getStreakPageData } from "@/lib/queries/streaks";
import { StreakHeader } from "@/components/streak/StreakHeader";
import { RecoverStreakBanner } from "@/components/streak/RecoverStreakBanner";
import { StreakActivityHeatmap } from "@/components/streak/StreakActivityHeatmap";

export default async function StreakPage() {
  const data = await getStreakPageData();

  return (
    <PageContainer size="md">
      <StreakHeader summary={data.summary} />
      <RecoverStreakBanner recover={data.recover} />
      <StreakActivityHeatmap days={data.heatmap} />
    </PageContainer>
  );
}
