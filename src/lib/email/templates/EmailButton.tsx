/**
 * Branded call-to-action button shared across email templates. Uses inline
 * styles (email clients ignore most CSS) with the brand primary colour.
 */

import { Button } from "@react-email/components";
import { emailColors } from "@/lib/email/theme";

export interface EmailButtonProps {
  href: string;
  label: string;
  /** Destructive/critical variant uses the destructive palette colour. */
  variant?: "primary" | "critical";
}

export function EmailButton({
  href,
  label,
  variant = "primary",
}: EmailButtonProps) {
  const background =
    variant === "critical" ? emailColors.destructive : emailColors.primary;
  return (
    <Button
      href={href}
      style={{
        backgroundColor: background,
        color: emailColors.primaryText,
        borderRadius: "8px",
        fontSize: "15px",
        fontWeight: 600,
        textDecoration: "none",
        textAlign: "center",
        display: "inline-block",
        padding: "12px 24px",
      }}
    >
      {label}
    </Button>
  );
}
