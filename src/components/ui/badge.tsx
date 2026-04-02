import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "default";
  variant?: "default" | "success" | "white" | "outline" | "beige";
}

const variantStyles = {
  default: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-600",
  white: "bg-white text-gray-600",
  outline: "border border-gray-300 text-gray-600",
  beige: "bg-[#FAF8F3] text-gray-600",
};

export function Badge({ size = "default", variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full text-xs font-medium",
        variantStyles[variant],
        size === "sm" ? "px-2 py-0.5" : "px-3 py-1",
        className
      )}
      {...props}
    />
  );
}
