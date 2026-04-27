/**
 * Cron entry point for the notification dispatcher.
 *
 * Vercel Cron sends a Bearer token in the Authorization header (set in
 * vercel.json + the CRON_SECRET env var). We reject unauthenticated calls
 * so the route can't be triggered externally.
 *
 * Schedule: see vercel.json. Recommended cadence is once per minute so
 * scheduled broadcasts go out within ~60s of their target time.
 */

import { NextResponse } from "next/server";
import { dispatchScheduledBroadcasts } from "@/lib/notifications/dispatcher";

export const runtime = "nodejs";
// Cron should never be cached.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchScheduledBroadcasts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("dispatchScheduledBroadcasts failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
