import { PageContainer } from "@/components/PageContainer";
import { getStreakPageData } from "@/lib/queries/streaks";
import { StreakHeader } from "@/components/streak/StreakHeader";
import { StreakActivityHeatmap } from "@/components/streak/StreakActivityHeatmap";
import { FreezeToggleCard } from "@/components/streak/FreezeToggleCard";

export default async function StreakPage() {
  const data = await getStreakPageData();

  return (
    <PageContainer size="md">
      <StreakHeader summary={data.summary} recover={data.recover} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <StreakActivityHeatmap
            days={data.heatmap}
            currentStreak={data.summary.currentStreak}
          />
        </div>
        <div className="self-start">
          <FreezeToggleCard
            freezesAvailable={data.summary.freezesAvailable}
            initialAuto={data.summary.freezeAuto}
          />
        </div>
      </div>
    </PageContainer>
  );
}
