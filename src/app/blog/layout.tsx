import type { Metadata } from "next";
import "@/styles/site.css";
import "./blog.css";
import { Footer } from "@/components/landing/Footer";
import { SiteNav } from "@/components/landing/SiteNav";

// The blog lives on the apex marketing host and wears the `.site` brand skin, so it
// shares the marketing navbar + footer chrome. The Footer already renders the
// word-of-the-day email capture, so we don't add it separately here.
export const metadata: Metadata = {
  title: { default: "Blog", template: "%s · 200 Words a Day" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
