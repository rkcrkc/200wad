import type { ShopItemForList } from "@/lib/queries/shop";
import { ShopItemCard } from "./ShopItemCard";

interface ShopCategorySectionProps {
  title: string;
  description?: string;
  items: ShopItemForList[];
}

export function ShopCategorySection({
  title,
  description,
  items,
}: ShopCategorySectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xl-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-[14px] leading-[1.4] text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ShopItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
