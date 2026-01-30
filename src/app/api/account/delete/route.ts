import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Delete from auth.users (this will cascade to public.users via FK)
    const { error } = await adminClient.auth.admin.deleteUser(user.id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
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
