"use client";

import { usePageWidth } from "@/hooks/usePageWidth";
import { PageTopBar } from "@/components/PageTopBar";
import { PageContainer } from "@/components/PageContainer";

interface PageShellProps {
  backLink?: { href: string; label: string };
  greeting?: string;
  greetingTranslation?: string;
  className?: string;
  withTopPadding?: boolean;
  children: React.ReactNode;
}

export function PageShell({
  backLink,
  greeting,
  greetingTranslation,
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
        width={width}
        onToggleWidth={toggle}
        mounted={mounted}
      />
      {children}
    </PageContainer>
  );
}
