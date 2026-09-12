import { NextResponse, type NextRequest } from "next/server";
import { classifyHost } from "@/lib/host";

// TEMPORARY diagnostic — remove after verifying the apex/app host split.
// Values are NEXT_PUBLIC (already exposed to the browser), so printing them is safe.
export function GET(request: NextRequest) {
  const host = request.headers.get("host");
  return NextResponse.json({
    incomingHost: host,
    classified: classifyHost(host),
    NEXT_PUBLIC_MARKETING_URL: process.env.NEXT_PUBLIC_MARKETING_URL ?? null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? null,
  });
}
