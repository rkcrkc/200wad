import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-border bg-input-background text-foreground file:text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 flex h-12 w-full rounded-lg border px-4 py-3 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
