interface SubBadgeProps {
  children: React.ReactNode;
  /** "row" = bone-hover bg (table rows), "header" = beige bg (column headers / stats) */
  variant?: "row" | "header";
  className?: string;
}

export function SubBadge({ children, variant = "row", className }: SubBadgeProps) {
  const bg = variant === "header" ? "bg-beige" : "bg-bone-hover";
  return (
    <span
      className={`cursor-default rounded-full px-2 py-0.5 text-[11px] font-semibold text-foreground ${bg} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
