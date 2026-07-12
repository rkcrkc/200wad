import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function DELETE(request: NextRequest) {
  try {
    // Get the authenticated user from the regular client
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use admin client to delete the user
    const adminClient = createAdminClient();

    // Read the Stripe customer id BEFORE deleting: it lives on public.users,
    // which cascades away with the auth user, so we'd lose it otherwise.
    const { data: profile } = await adminClient
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    const stripeCustomerId = profile?.stripe_customer_id ?? null;

    // Delete from auth.users (this will cascade to public.users via FK).
    // This is the core erasure request, so do it first.
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Best-effort: delete the Stripe customer so no email/name/payment history
    // lingers there (GDPR erasure). The account is already gone, so a Stripe
    // failure must NOT fail the request — log it for manual cleanup instead.
    // Stripe still retains what it legally needs (e.g. invoices for tax) on its
    // side per its own retention policy.
    if (stripeCustomerId) {
      try {
        await getStripe().customers.del(stripeCustomerId);
      } catch (stripeError) {
        console.error(
          `Account ${user.id} deleted, but failed to delete Stripe customer ${stripeCustomerId}:`,
          stripeError
        );
      }
    }

    // Sign out the user on the regular client
    await supabase.auth.signOut();

    return NextResponse.json(
      { success: true, message: "Account deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error during account deletion:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
