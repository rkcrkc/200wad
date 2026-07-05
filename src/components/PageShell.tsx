"use client";

import { usePageWidth } from "@/hooks/usePageWidth";
import { PageTopBar, type TimeOfDay } from "@/components/PageTopBar";
import { PageContainer } from "@/components/PageContainer";
import type { LanguageGreetings } from "@/types/database";

interface PageShellProps {
  backLink?: { href: string; label: string };
  greetings?: LanguageGreetings | null;
  greetingUserName?: string | null;
  initialTimeOfDay?: TimeOfDay;
  className?: string;
  withTopPadding?: boolean;
  children: React.ReactNode;
}

export function PageShell({
  backLink,
  greetings,
  greetingUserName,
  initialTimeOfDay,
  className,
  withTopPadding,
  children,
}: PageShellProps) {
  const { width, toggle, mounted } = usePageWidth();

  return (
    <PageContainer size={width} className={className} withTopPadding={withTopPadding}>
      <PageTopBar
        backLink={backLink}
        greetings={greetings}
        greetingUserName={greetingUserName}
        initialTimeOfDay={initialTimeOfDay}
        width={width}
        onToggleWidth={toggle}
        mounted={mounted}
      />
      {children}
    </PageContainer>
  );
}
