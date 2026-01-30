"use client";

import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function ComingSoon({
  title,
  description = "We're working hard to bring you this feature. Check back soon!",
  icon,
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
        {icon || <Construction className="h-10 w-10 text-warning" />}
      </div>

      {/* Title */}
      <h1 className="mb-3 text-2xl font-bold text-foreground">{title}</h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-muted-foreground">{description}</p>

      {/* Back button */}
      <Link href="/dashboard">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
