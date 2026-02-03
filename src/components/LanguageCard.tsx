import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { ProgressRingWithLabel } from "@/components/ui/progress-ring-with-label";
import { LanguageWithProgress } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { getFlagFromCode } from "@/lib/utils/flags";

interface LanguageCardProps {
  language: LanguageWithProgress;
  isActive?: boolean;
}

export function LanguageCard({ language, isActive = false }: LanguageCardProps) {
  return (
    <Link
      href={`/courses/${language.id}`}
      className={cn(
        "block rounded-2xl border-2 bg-white p-6 transition-all hover:shadow-lg",
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : "border-gray-200 hover:border-primary/50"
      )}
    >
      {/* Language Flag & Name */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-3xl">
          {getFlagFromCode(language.code)}
        </div>
        <div className="flex-1">
          <h3 className="mb-1 text-2xl font-semibold">{language.name}</h3>
          <p className="text-sm text-muted-foreground">
            {language.courseCount} {language.courseCount === 1 ? "course" : "courses"}
          </p>
        </div>
      </div>

      {/* Progress Ring */}
      <div className="mb-4 flex items-center justify-center">
        <ProgressRingWithLabel
          value={language.progressPercent}
          size={128}
          strokeWidth={8}
          secondaryLabel={`${language.wordsLearned}/${language.totalWords} words`}
        />
      </div>

      {/* Continue Button */}
      <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-white transition-all hover:bg-primary/90">
        <BookOpen className="h-5 w-5" />
        View
        <ChevronRight className="h-5 w-5" />
      </div>
    </Link>
  );
}
