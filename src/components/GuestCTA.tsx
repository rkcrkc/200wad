interface GuestCTAProps {
  title?: string;
  description?: string;
  className?: string;
}

export function GuestCTA({
  title = "Create an account to save your progress",
  description,
  className = "mt-8",
}: GuestCTAProps) {
  return (
    <div className={`rounded-2xl bg-secondary/50 p-6 text-center ${className}`}>
      <p className="text-regular-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
