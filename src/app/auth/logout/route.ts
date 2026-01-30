import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Sign out the user
  await supabase.auth.signOut();

  // Redirect to login page
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  });
}

// Also support GET for simple logout links
export async function GET(request: Request) {
  return POST(request);
}
