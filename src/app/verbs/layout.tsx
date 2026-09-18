import "@/styles/site.css";
import "./verb.css";
import { Footer } from "@/components/landing/Footer";
import { SiteNav } from "@/components/landing/SiteNav";

// Migrated legacy verb-conjugation pages live on the apex marketing host and wear the
// `.site` brand skin, sharing the marketing navbar + footer chrome (as the blog does).
export default function VerbsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
