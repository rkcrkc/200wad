import type { MetadataRoute } from "next";
import { getAllVerbPaths } from "@/lib/queries/verbs";
import { marketingUrl } from "@/lib/host";

// Migrated verb-conjugation pages live on the apex marketing host at their literal
// `.html` URLs. `marketingUrl()` resolves each to an absolute apex URL in production
// (and a relative path in combined/dev mode, which is fine for local checks).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await getAllVerbPaths();
  return paths.map((path) => ({
    url: marketingUrl(path),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
}
