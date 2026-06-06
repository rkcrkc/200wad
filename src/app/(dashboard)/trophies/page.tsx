import { PageContainer } from "@/components/PageContainer";
import { getAchievementsForUser } from "@/lib/queries/achievements";
import type {
  AchievementCategory,
  AchievementForList,
} from "@/lib/queries/achievements";
import { TrophiesHeader } from "@/components/trophies/TrophiesHeader";
import { TrophyCategorySection } from "@/components/trophies/TrophyCategorySection";

interface CategoryConfig {
  key: AchievementCategory;
  title: string;
  description?: string;
}

// Render order. 'progress' surfaces lesson milestones, 'mastery' surfaces
// word-level milestones — see the seed for the split.
const CATEGORIES: CategoryConfig[] = [
  { key: "mastery", title: "Mastery" },
  { key: "progress", title: "Progress" },
  { key: "streak", title: "Streaks" },
  { key: "social", title: "Social" },
  {
    key: "special",
    title: "Special",
    description: "Hidden trophies — unlock to reveal.",
  },
];

export default async function TrophiesPage() {
  const { achievements, userAggregates } = await getAchievementsForUser();

  const grouped = new Map<AchievementCategory, AchievementForList[]>();
  for (const row of achievements) {
    const list = grouped.get(row.category) ?? [];
    list.push(row);
    grouped.set(row.category, list);
  }

  return (
    <PageContainer size="md">
      <TrophiesHeader aggregates={userAggregates} />
      {CATEGORIES.map((cat) => (
        <TrophyCategorySection
          key={cat.key}
          title={cat.title}
          description={cat.description}
          rows={grouped.get(cat.key) ?? []}
        />
      ))}
    </PageContainer>
  );
}
