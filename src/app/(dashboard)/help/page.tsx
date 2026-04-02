import { getHelpEntries } from "@/lib/queries/help";
import { getCurrentCourse } from "@/lib/queries";
import { HelpPageClient } from "./HelpPageClient";

export default async function HelpPage() {
  const { language } = await getCurrentCourse();
  const entries = await getHelpEntries(language?.code);

  return <HelpPageClient entries={entries} />;
}
