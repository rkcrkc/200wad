import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FinalCTAProps {
  heading?: string;
  sub?: string;
}

/** Reusable closing call-to-action used on the home + hub pages. */
export function FinalCTA({
  heading = "Start remembering, not just studying.",
  sub = "First 10 lessons free. No card. Works alongside whatever you already use.",
}: FinalCTAProps) {
  return (
    <div className="mx-auto max-w-content-ms px-5 sm:px-8">
      <div className="rounded-3xl bg-foreground px-6 py-14 text-center sm:px-12 sm:py-20">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-large-medium text-white/70">{sub}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="xl">
            <Link href="/signup">Start free — no card</Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
