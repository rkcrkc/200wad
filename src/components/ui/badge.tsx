import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "xs" | "sm" | "default";
  variant?: "default" | "success" | "warning" | "white" | "outline" | "beige";
}

const variantStyles = {
  default: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-600",
  warning: "bg-orange-100 text-orange-600",
  white: "bg-white text-gray-600",
  outline: "border border-gray-300 text-gray-600",
  beige: "bg-bone text-gray-600",
};

const sizeStyles = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
  default: "px-3 py-1 text-xs",
};

export function Badge({ size = "default", variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
