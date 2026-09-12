import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

// Brand eyebrow/caption face for the marketing site (`.site` utilities read
// `--font-mono`). Loaded globally like the other brand fonts; only used under `.site`.
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});
import { UserProvider } from "@/context/UserContext";
import { ConsentProvider } from "@/context/ConsentContext";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { PostHogPageView } from "@/components/providers/PostHogPageView";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { FlagEmojiPolyfill } from "@/components/providers/FlagEmojiPolyfill";
import { createClient } from "@/lib/supabase/server";

// Resolve every page's relative `canonical`/OpenGraph URL against the apex
// marketing host in production — all indexable pages are marketing pages, and
// their canonicals (e.g. "/", "/pricing") must point at the apex, not the app
// subdomain. Falls back to the app origin, then to undefined in dev/"combined"
// (where Next resolves against the request origin).
const metadataBaseUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  ...(metadataBaseUrl ? { metadataBase: new URL(metadataBaseUrl) } : {}),
  title: "200 Words a Day",
  description: "Learn languages effectively with 200 words a day",
};

// `interactive-widget: resizes-content` makes the on-screen keyboard shrink the
// layout viewport (rather than overlay it) on Chromium/Android, so `position:
// fixed` bottom bars — like the study/test action bar — sit above the keyboard
// without JS. iOS Safari ignores this and still overlays, so the visual-viewport
// `useKeyboardInset` hook remains the fallback there.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Prefetch user + avatar server-side so UserProvider can hydrate without
  // a duplicate client-side `supabase.auth.getUser()` on every navigation.
  // Middleware already validates the session per request, so this is a
  // warm-cookie lookup; the win is removing the client round-trip + the
  // follow-up avatar fetch that previously ran on every page hydration.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let avatarUrl: string | null = null;
  let displayName: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("avatar_url, name")
      .eq("id", user.id)
      .single();
    avatarUrl = data?.avatar_url ?? null;
    displayName = data?.name ?? null;
  }

  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} ${splineMono.variable}`}>
      <body className="font-sans antialiased">
        <FlagEmojiPolyfill />
        <ConsentProvider>
          <PostHogProvider>
            <PostHogPageView />
            <UserProvider
              initialUser={user}
              initialAvatarUrl={avatarUrl}
              initialDisplayName={displayName}
            >
              {children}
            </UserProvider>
          </PostHogProvider>
          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
