import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { PostHogPageView } from "@/components/providers/PostHogPageView";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "200 Words a Day",
  description: "Learn languages effectively with 200 words a day",
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
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("avatar_url")
      .eq("id", user.id)
      .single();
    avatarUrl = data?.avatar_url ?? null;
  }

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <PostHogProvider>
          <PostHogPageView />
          <UserProvider initialUser={user} initialAvatarUrl={avatarUrl}>
            {children}
          </UserProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
