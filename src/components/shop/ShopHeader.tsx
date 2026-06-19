import { Coins } from "lucide-react";

interface ShopHeaderProps {
  coinBalance: number;
}

export function ShopHeader({ coinBalance }: ShopHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-page-header text-foreground">Shop</h1>
        <p className="mt-1 text-[15px] leading-[1.4] text-muted-foreground">
          Spend the coins you earn from tests on power-ups and perks.
        </p>
      </div>

      {/* Coin balance — mirrors the tests/lessons summary-stat format:
          small label above, icon + value below (no chip). */}
      <div className="flex cursor-default flex-col items-start gap-1.5">
        <span className="text-xs text-muted-foreground">Coin balance</span>
        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-amber-500" strokeWidth={1.67} />
          <span className="text-regular-semibold text-foreground">
            {coinBalance}
          </span>
        </div>
      </div>
    </div>
  );
}
