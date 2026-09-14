import type { Metadata } from "next";
import { SiteNav } from "@/components/landing/SiteNav";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";
import "@/styles/site.css";

export const metadata: Metadata = {
  title: "Pricing — 200 Words a Day",
  description:
    "Simple plans for 200 Words a Day. Start free, then choose a single language or unlock every course. Monthly or annual billing.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <div className="site flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        <Pricing transparentBg />
      </main>

      <Footer />
    </div>
  );
}
