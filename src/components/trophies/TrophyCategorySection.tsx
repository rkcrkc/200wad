import type { AchievementForList } from "@/lib/queries/achievements";
import { TrophyCard } from "./TrophyCard";

interface TrophyCategorySectionProps {
  title: string;
  description?: string;
  rows: AchievementForList[];
}

export function TrophyCategorySection({
  title,
  description,
  rows,
}: TrophyCategorySectionProps) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-[14px] leading-[1.4] text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <TrophyCard key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}
