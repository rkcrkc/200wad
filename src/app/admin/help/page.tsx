import { getHelpEntriesAdmin } from "@/lib/queries/help";
import { createAdminClient } from "@/lib/supabase/admin";
import { HelpClient } from "./HelpClient";

export default async function AdminHelpPage() {
  const entries = await getHelpEntriesAdmin();

  const supabase = createAdminClient();
  const { data: languages } = await supabase
    .from("languages")
    .select("code, name")
    .order("sort_order");

  return (
    <div>
      <HelpClient entries={entries} languages={languages ?? []} />
    </div>
  );
}
