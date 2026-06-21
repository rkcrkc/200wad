"use client";

import { usePageWidth } from "@/hooks/usePageWidth";
import { PageTopBar, type TimeOfDay } from "@/components/PageTopBar";
import { PageContainer } from "@/components/PageContainer";

interface PageShellProps {
  backLink?: { href: string; label: string };
  greeting?: string;
  greetingTranslation?: string;
  greetingTimeOfDay?: TimeOfDay;
  className?: string;
  withTopPadding?: boolean;
  children: React.ReactNode;
}

export function PageShell({
  backLink,
  greeting,
  greetingTranslation,
  greetingTimeOfDay,
  className,
  withTopPadding,
  children,
}: PageShellProps) {
  const { width, toggle, mounted } = usePageWidth();

  return (
    <PageContainer size={width} className={className} withTopPadding={withTopPadding}>
      <PageTopBar
        backLink={backLink}
        greeting={greeting}
        greetingTranslation={greetingTranslation}
        greetingTimeOfDay={greetingTimeOfDay}
        width={width}
        onToggleWidth={toggle}
        mounted={mounted}
      />
      {children}
    </PageContainer>
  );
}
