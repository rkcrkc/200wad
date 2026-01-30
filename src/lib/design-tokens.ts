/**
 * Design Tokens for 200 Words a Day
 * Central source of truth for all design values
 */

// ============================================================================
// LAYOUT & SPACING
// ============================================================================

export const maxWidth = {
  small: 840,
  medium: 1080,
  large: 1280,
} as const;

export type MaxWidthSize = keyof typeof maxWidth;

export const spacing = {
  // Component spacing
  xs: "6px",
  sm: "8px",
  md: "12px",
  lg: "15px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "30px",
  "4xl": "40px",
  "5xl": "60px",
} as const;

export const containerPadding = {
  page: "40px", // Main page container padding
  card: "20px", // Standard card padding
  cardLarge: "30px", // Large card padding
  tight: "15px", // Tight spacing (sidebar, buttons)
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  full: "9999px", // For pills and circular elements
} as const;

// ============================================================================
// BORDERS
// ============================================================================

export const borderWidth = {
  thin: "1px",
  default: "1.5px",
  thick: "2px",
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const boxShadow = {
  sm: "0px 5px 20px -15px rgba(0, 0, 0, 0.10)",
  md: "0px 8px 30px -10px rgba(0, 0, 0, 0.15)",
  lg: "0px 10px 40px -10px rgba(0, 0, 0, 0.20)",
  xl: "0px 20px 60px -15px rgba(0, 0, 0, 0.25)",
} as const;

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

export const button = {
  size: {
    sm: {
      padding: "6px 12px",
      fontSize: "13px",
      height: "32px",
    },
    md: {
      padding: "8px 15px",
      fontSize: "15px",
      height: "40px",
    },
    lg: {
      padding: "12px 16px",
      fontSize: "15px",
      height: "48px",
    },
  },
  variant: {
    primary: {
      bg: "#0B6CFF",
      bgHover: "#0056D9",
      color: "#FFFFFF",
      border: "none",
    },
    secondary: {
      bg: "transparent",
      bgHover: "#EFF6FF",
      color: "#0B6CFF",
      border: "1.5px solid #0B6CFF",
    },
    ghost: {
      bg: "transparent",
      bgHover: "#F2EAD9",
      color: "#141515",
      border: "none",
    },
    subtle: {
      bg: "#FAF8F3",
      bgHover: "#F2EAD9",
      color: "#141515",
      border: "none",
    },
    destructive: {
      bg: "#FB2C36",
      bgHover: "#DC1F28",
      color: "#FFFFFF",
      border: "none",
    },
  },
} as const;

// ============================================================================
// STATUS COLORS & STYLES
// ============================================================================

export const status = {
  mastered: {
    bg: "#E6F9F0",
    color: "#00C950",
    dotColor: "#00C950",
  },
  studying: {
    bg: "#FFF6DA",
    color: "#FF9224",
    dotColor: "#FF9224",
  },
  notStarted: {
    bg: "#F5F5F5",
    color: "rgba(20, 21, 21, 0.5)",
    dotColor: "rgba(20, 21, 21, 0.2)",
  },
  locked: {
    bg: "#F5F5F5",
    color: "rgba(20, 21, 21, 0.3)",
    icon: "🔒",
  },
} as const;

// ============================================================================
// PILL COMPONENT
// ============================================================================

export const pill = {
  padding: "4px 10px",
  borderRadius: borderRadius.full,
  fontSize: "13px",
  fontWeight: "500",
  bg: "#FAF8F3",
  color: "#141515",
} as const;

// ============================================================================
// INPUT STYLES
// ============================================================================

export const input = {
  size: {
    sm: {
      padding: "8px 12px",
      fontSize: "14px",
      height: "36px",
    },
    md: {
      padding: "12px 16px",
      fontSize: "15px",
      height: "48px",
    },
    lg: {
      padding: "16px 20px",
      fontSize: "16px",
      height: "56px",
    },
  },
  default: {
    bg: "#FAF8F3",
    border: "1px solid #E5E7EB",
    borderRadius: borderRadius.xl,
    focusRing: "2px solid #0B6CFF",
  },
} as const;

// ============================================================================
// CARD STYLES
// ============================================================================

export const card = {
  default: {
    bg: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: borderRadius["2xl"],
    padding: containerPadding.card,
    shadow: boxShadow.sm,
  },
  hover: {
    shadow: boxShadow.md,
  },
  interactive: {
    // For clickable cards
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transition = {
  fast: "150ms ease",
  default: "200ms ease",
  slow: "300ms ease",
  colors: "color, background-color, border-color",
  all: "all",
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get max-width class for container
 */
export function getMaxWidthClass(size: MaxWidthSize): string {
  return `max-w-[${maxWidth[size]}px]`;
}

/**
 * Get button classes based on variant and size
 */
export function getButtonClasses(
  variant: keyof typeof button.variant = "primary",
  size: keyof typeof button.size = "md"
): string {
  const v = button.variant[variant];
  const s = button.size[size];

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all";
  const sizeClasses = `px-[${s.padding.split(" ")[1]}] py-[${s.padding.split(" ")[0]}] text-[${s.fontSize}]`;

  let variantClasses = "";
  if (v.border && v.border !== "none") {
    variantClasses = `border-[${v.border.match(/\d+\.?\d*/)?.[0]}px]`;
  }

  return `${baseClasses} ${sizeClasses} ${variantClasses}`.trim();
}

/**
 * Get status pill classes
 */
export function getStatusClasses(statusType: keyof typeof status): string {
  const s = status[statusType];
  return `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs-medium`;
}

/**
 * Get status styles (for inline styles)
 */
export function getStatusStyles(statusType: keyof typeof status): {
  backgroundColor: string;
  color: string;
} {
  const s = status[statusType];
  return {
    backgroundColor: s.bg,
    color: s.color,
  };
}

/**
 * Get card classes
 */
export function getCardClasses(interactive: boolean = false): string {
  const baseClasses = `bg-white rounded-2xl border border-gray-200 transition-all`;
  const interactiveClasses = interactive ? "cursor-pointer hover:shadow-md" : "";
  return `${baseClasses} ${interactiveClasses}`.trim();
}
