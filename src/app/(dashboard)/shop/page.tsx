import { PageContainer } from "@/components/PageContainer";
import { getShopData } from "@/lib/queries/shop";
import type { ShopCategory, ShopItemForList } from "@/lib/queries/shop";
import { getCoinHistory, getCoinTotals } from "@/lib/queries/coins";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { ShopCategorySection } from "@/components/shop/ShopCategorySection";
import { LearningResourcesSection } from "@/components/shop/LearningResourcesSection";

interface CategoryConfig {
  key: ShopCategory;
  title: string;
  description?: string;
}

// Render order. v1b ships the Powers category; Stuff / Access / Status are
// scaffolded in the catalogue and will surface here as their items go active.
const CATEGORIES: CategoryConfig[] = [
  {
    key: "powers",
    title: "Powers",
    description: "Power-ups that protect your streak and boost your earnings.",
  },
  { key: "stuff", title: "Stuff" },
  { key: "access", title: "Access" },
  { key: "status", title: "Status" },
];

export default async function ShopPage() {
  const [{ coinBalance, items }, history, historyTotals] = await Promise.all([
    getShopData(),
    getCoinHistory(),
    getCoinTotals(),
  ]);

  const grouped = new Map<ShopCategory, ShopItemForList[]>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return (
    <PageContainer size="md">
      <ShopHeader coinBalance={coinBalance} />
      <ShopTabs
        initialHistory={history.entries}
        historyHasMore={history.hasMore}
        historyTotals={historyTotals}
      >
        {CATEGORIES.map((cat) => (
          <ShopCategorySection
            key={cat.key}
            title={cat.title}
            description={cat.description}
            items={grouped.get(cat.key) ?? []}
          />
        ))}
        <LearningResourcesSection />
      </ShopTabs>
    </PageContainer>
  );
}
