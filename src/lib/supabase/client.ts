import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export function createClient() {
  // Share the auth session across apex + app subdomains. Set to `.200wad.com` in
  // production; unset locally and on previews (localhost can't use that domain).
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
  );
}
