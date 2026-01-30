import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  label: string;
}

export function BackButton({ href, label }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="mb-6 flex items-center gap-2 text-muted-foreground transition-all hover:text-foreground"
    >
      <ArrowLeft className="h-5 w-5" />
      {label}
    </Link>
  );
}
