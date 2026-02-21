import { ComingSoon } from "@/components/ComingSoon";
import { PageContainer } from "@/components/PageContainer";
import { BookMarked } from "lucide-react";

export default function DictionaryPage() {
  return (
    <PageContainer size="md">
      <ComingSoon
        title="Dictionary Coming Soon"
        description="Browse all the words you've learned and look up new ones. We're building your personal dictionary!"
        icon={<BookMarked className="h-10 w-10 text-warning" />}
      />
    </PageContainer>
  );
}
