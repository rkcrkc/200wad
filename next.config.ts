import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Legacy landing URLs → the live homepage. Landing G is now `/` on the apex
  // host; the old `(marketing)/home` and the `(concepts)/home/{b…g}` previews are
  // archived out of the route tree, so 301 every legacy path to `/` (preserves any
  // external deep links and avoids duplicate-content indexing). These run before
  // the host middleware, so they apply on every host; on apex `/` is Landing G,
  // on the app host `/` is the authenticated root redirect. www → apex is handled
  // at the Vercel/DNS layer (see docs plan §8 / Task 11).
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/home/:path*", destination: "/", permanent: true },
    ];
  },
  images: {
    // Skip Vercel's image optimizer; serve source files directly from
    // Supabase Storage. See docs/technical-questions.md (#1) for the
    // trade-offs and the decision to revisit before launch.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xfauulfdbxageerwqnvo.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
