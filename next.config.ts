import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
