/**
 * Brand palette + spacing constants for React Email templates.
 *
 * Email clients don't support CSS custom properties, so we can't reference the
 * `--*` tokens from `globals.css` directly. Instead we mirror the same values
 * here as plain hex/px and feed them into the React Email `<Tailwind>` config so
 * templates stay on-palette without inventing new colours.
 *
 * Keep these in sync with the app-layer palette documented in CLAUDE.md /
 * `src/app/globals.css`.
 */

export const emailColors = {
  /** App background (warm off-white). */
  background: "#faf8f3",
  /** Card / inner surface. */
  surface: "#ffffff",
  /** Primary brand blue — buttons, links. */
  primary: "#0b6cff",
  primaryText: "#ffffff",
  success: "#00c950",
  warning: "#ff9224",
  destructive: "#fb2c36",
  /** Body copy. */
  foreground: "#1a1a1a",
  /** Muted / secondary copy (footer, meta). */
  muted: "#6b7280",
  /** Hairline borders. */
  border: "#e7e2d6",
} as const;

export const emailSpacing = {
  containerWidth: "600px",
  containerPadding: "32px",
} as const;

/**
 * Tailwind config passed to React Email's `<Tailwind>` wrapper. Exposes the
 * brand palette as `bg-*` / `text-*` / `border-*` utilities inside templates.
 */
export const emailTailwindConfig = {
  theme: {
    extend: {
      colors: {
        brand: {
          bg: emailColors.background,
          surface: emailColors.surface,
          primary: emailColors.primary,
          "primary-fg": emailColors.primaryText,
          success: emailColors.success,
          warning: emailColors.warning,
          destructive: emailColors.destructive,
          fg: emailColors.foreground,
          muted: emailColors.muted,
          border: emailColors.border,
        },
      },
    },
  },
} as const;
