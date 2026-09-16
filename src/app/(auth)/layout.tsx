import { SiteNav } from "@/components/landing/SiteNav";
import { Footer } from "@/components/landing/Footer";
import "@/styles/site.css";

// Auth pages wear the marketing `.site` brand skin, so they share the marketing
// navbar + footer chrome (same pattern as the blog/contact pages). The `.site`
// wrapper scopes the brand tokens + utilities the cards rely on.
//
// These pages live on the app subdomain, so `crossHost` makes the nav/footer's
// marketing links resolve straight to the apex marketing site (via marketingUrl())
// instead of pointing at the app host and 307-redirecting.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site flex min-h-screen flex-col">
      <SiteNav crossHost />
      <main className="container flex flex-1 items-center justify-center py-14 sm:py-20">
        {children}
      </main>
      <Footer crossHost />
    </div>
  );
}
