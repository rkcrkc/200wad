import { createClient } from "@/lib/supabase/server";
import { LanguagesClient } from "./LanguagesClient";

async function getLanguages() {
  const supabase = await createClient();

  const { data: languages, error } = await supabase
    .from("languages")
    .select(`
      *,
      courses:courses(count)
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching languages:", error);
    return [];
  }

  // Transform the count from the nested query
  return languages.map((lang) => ({
    ...lang,
    courseCount: ((lang as any).courses as any)?.[0]?.count || 0,
  }));
}

export default async function LanguagesPage() {
  const languages = await getLanguages();

  return (
    <div>
      <LanguagesClient languages={languages} />
    </div>
  );
}
