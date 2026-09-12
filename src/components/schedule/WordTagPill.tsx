export function WordTagPill({ word }: { word: string }) {
  return (
    <span className="max-w-[180px] shrink-0 cursor-default truncate rounded-md bg-bone px-3 py-1.5 text-xs font-medium text-foreground/80 md:text-sm">
      {word}
    </span>
  );
}
