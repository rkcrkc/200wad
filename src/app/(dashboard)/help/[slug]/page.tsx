import { getHelpEntries } from "@/lib/queries/help";
import { getCurrentCourse } from "@/lib/queries";
import { HelpPageClient } from "../HelpPageClient";

interface HelpEntryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function HelpEntryPage({ params }: HelpEntryPageProps) {
  const { slug } = await params;
  const { language } = await getCurrentCourse();
  const entries = await getHelpEntries(language?.code);

  return <HelpPageClient entries={entries} initialSlug={slug} />;
}
