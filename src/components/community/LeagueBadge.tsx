const LEAGUE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  bronze: { label: "Bronze", color: "text-amber-800", bg: "bg-amber-100", border: "border-amber-300" },
  silver: { label: "Silver", color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-300" },
  gold: { label: "Gold", color: "text-yellow-700", bg: "bg-yellow-100", border: "border-yellow-400" },
  diamond: { label: "Diamond", color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-400" },
};

export function LeagueBadge({
  league,
  size = "sm",
}: {
  league: string;
  size?: "sm" | "md";
}) {
  const config = LEAGUE_CONFIG[league] || LEAGUE_CONFIG.bronze;

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${config.color} ${config.bg} ${config.border}`}>
        {config.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${config.color} ${config.bg} ${config.border}`}>
      {config.label}
    </span>
  );
}
