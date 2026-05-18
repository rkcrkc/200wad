import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * Static (anonymous, no-cookie) Supabase client.
 *
 * Safe to call from inside `unstable_cache()` callbacks, which run outside
 * the per-request scope and therefore cannot read cookies or headers.
 *
 * Only use for queries against publicly-readable tables — e.g.
 * `pricing_plans`, `platform_config`. Anything that depends on the
 * current user's session must use `createClient()` from `./server`.
 */
export function createStaticClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
