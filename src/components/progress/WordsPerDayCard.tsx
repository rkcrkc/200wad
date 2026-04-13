import type { WordsPerDayRates } from "@/lib/queries/stats";

interface WordsPerDayCardProps {
  rates: WordsPerDayRates;
}

const periods = [
  { key: "thisWeek" as const, label: "This week" },
  { key: "thisMonth" as const, label: "This month" },
  { key: "thisYear" as const, label: "This year" },
  { key: "lifetime" as const, label: "Lifetime" },
];

export function WordsPerDayCard({ rates }: WordsPerDayCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Words Per Day
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {periods.map(({ key, label }) => (
          <div key={key} className="text-center">
            <p className="text-2xl font-semibold">{rates[key]}</p>
            <p className="text-xs text-muted-foreground">words/day</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
