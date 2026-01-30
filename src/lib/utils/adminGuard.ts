/**
 * Admin guard utility for server actions
 * Ensures only admin users can perform privileged operations
 */

import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  userId: string;
  email: string;
}

/**
 * Verifies the current user is an admin
 * Throws an error if not authenticated or not an admin
 * Call this at the start of every admin server action
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  const isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return {
    userId: user.id,
    email: user.email || "",
  };
}

/**
 * Checks if the current user is an admin without throwing
 * Useful for conditional rendering or soft checks
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets admin user info if authenticated and admin, null otherwise
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}
