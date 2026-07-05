/**
 * Design Tokens for 200 Words a Day
 *
 * Runtime color tokens for word highlighting (by grammatical gender) and
 * word-progress status indicators. Layout tokens (spacing, radius, shadows,
 * z-index) are NOT defined here — they live in `src/app/globals.css` as the
 * single source of truth (Tailwind theme + utilities).
 */

// ============================================================================
// GENDER COLORS (for word highlighting)
// ============================================================================

export const genderColor: Record<string, string> = {
  f: "#fb2c36",   // Red - feminine
  m: "#001EFF",   // Blue - masculine
  n: "#FF8000",   // Orange - neuter
  mf: "#00C950",  // Green - mixed gender
  mn: "#8000FF",  // Purple - masculine/neuter (German der/das)
} as const;

/** Darker shades for audio playback highlighting */
export const genderColorDark: Record<string, string> = {
  f: "#C9232B",   // Dark red - feminine
  m: "#0018CC",   // Dark blue - masculine
  n: "#CC6600",   // Dark orange - neuter
  mf: "#00A040",  // Dark green - mixed gender
  mn: "#6600CC",  // Dark purple - masculine/neuter (German der/das)
} as const;

/** Default highlight color when no gender applies */
export const defaultHighlightColor = "#00C950"; // Green

/** Default dark highlight color for audio playback when no gender applies */
export const defaultHighlightColorDark = "#00A040"; // Dark green

// ============================================================================
// STATUS COLORS & STYLES
// ============================================================================

export const status = {
  mastered: {
    bg: "#00C950",
    color: "#FFFFFF",
    inlineColor: "#00C950",
    icon: "star" as const,
  },
  learned: {
    bg: "#D5F3E5",
    color: "#06AB48",
    inlineColor: "#06AB48",
    icon: "check" as const,
  },
  learning: {
    bg: "#FFF6DA",
    color: "#FF9224",
    dotColor: "#FF9224",
  },
  notStarted: {
    bg: "#FAF8F3",
    color: "rgba(20, 21, 21, 0.5)",
    dotColor: "rgba(20, 21, 21, 0.2)",
  },
  locked: {
    bg: "#F5F5F5",
    color: "rgba(20, 21, 21, 0.3)",
    icon: "🔒",
  },
} as const;
