import { createLucideIcon } from "lucide-react";

/**
 * Podium icon — back-ported from lucide-react v1.21.0 (ISC-licensed) because the
 * installed v0.563.0 predates it, and upgrading across the 0.x→1.x major bump for
 * a single glyph isn't worth the breakage risk. Built via `createLucideIcon`, so it
 * is a genuine `LucideIcon` and drops into anything typed for lucide icons.
 */
export const Podium = createLucideIcon("podium", [
  ["path", { d: "M12 6V2h-1", key: "1hv4eo" }],
  [
    "path",
    {
      d: "M9 15a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1",
      key: "1jvw5n",
    },
  ],
  ["path", { d: "M9 21V11a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10", key: "rgi5dp" }],
]);
