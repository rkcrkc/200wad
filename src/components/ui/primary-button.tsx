"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BaseProps = {
  variant?: "primary" | "outline";
  /**
   * `default` is the full-size CTA (52px, generous padding). `sm` is a compact
   * variant (44px, tighter padding, smaller chevron) for space-constrained rows
   * like the lesson footer bar on mobile. `responsive` renders `sm` on mobile
   * and `default` from the `md` breakpoint up.
   */
  size?: "default" | "sm" | "responsive";
  className?: string;
  children: React.ReactNode;
  /** Stretch to fill container width. Shortcut for `w-full`. */
  fullWidth?: boolean;
};

type AsLinkProps = BaseProps & {
  href: string;
  onClick?: never;
  loading?: never;
  disabled?: never;
  type?: never;
};

type AsButtonProps = BaseProps & {
  href?: never;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** Shows a leading spinner and hides the trailing chevron. */
  loading?: boolean;
};

export type PrimaryButtonProps = AsLinkProps | AsButtonProps;

export function PrimaryButton(props: PrimaryButtonProps) {
  const { variant = "primary", size = "default", className, children, fullWidth } = props;
  const buttonVariant = variant === "outline" ? "outline" : "default";
  const compact = size === "sm";
  const responsive = size === "responsive";
  // Underlying Button size: the `responsive` case starts from the compact
  // `default` bundle and layers desktop overrides via `responsiveClass`.
  const baseSize = compact || responsive ? "default" : "xl";
  const heightClass = responsive
    ? "h-11 md:h-[52px]"
    : compact
      ? "h-11"
      : "h-[52px]";
  // Desktop overrides that re-inflate the compact base to the full CTA at `md`:
  // padding, text size and the xl hover expansion.
  const responsiveClass = responsive
    ? "md:px-8 md:text-base md:hover:gap-3 md:hover:px-[30px]"
    : "";
  const widthClass = fullWidth ? "w-full" : "";
  const outlineClasses =
    variant === "outline" ? "border-primary text-primary" : "";

  const isLink = "href" in props && !!props.href;
  const loading = !isLink && (props as AsButtonProps).loading;
  const disabled = !isLink && (props as AsButtonProps).disabled;
  const showChevron = !loading && !disabled;

  const content = (
    <>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
      {showChevron ? (
        <ChevronRight
          className={
            responsive
              ? "ml-1.5 h-4 w-4 md:ml-2 md:h-5 md:w-5"
              : compact
                ? "ml-1.5 h-4 w-4"
                : "ml-2 h-5 w-5"
          }
        />
      ) : null}
    </>
  );

  if (isLink) {
    return (
      <Button
        asChild
        size={baseSize}
        variant={buttonVariant}
        className={cn(heightClass, responsiveClass, widthClass, outlineClasses, className)}
      >
        <Link href={(props as AsLinkProps).href}>{content}</Link>
      </Button>
    );
  }

  const { onClick, type = "button" } = props as AsButtonProps;
  return (
    <Button
      size={baseSize}
      variant={buttonVariant}
      // While loading the button also becomes disabled; the base Button's
      // `transition-all` would otherwise crossfade the `disabled:opacity-50`
      // change at the same moment the label swaps to "…ing", leaving a ghosted
      // double-text paint on mobile Safari. Snap instantly during loading.
      className={cn(heightClass, responsiveClass, widthClass, outlineClasses, loading && "transition-none", className)}
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
    >
      {content}
    </Button>
  );
}
