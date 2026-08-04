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
   * like the lesson footer bar on mobile.
   */
  size?: "default" | "sm";
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
  const baseSize = compact ? "default" : "xl";
  const heightClass = compact ? "h-11" : "h-[52px]";
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
        <ChevronRight className={compact ? "ml-1.5 h-4 w-4" : "ml-2 h-5 w-5"} />
      ) : null}
    </>
  );

  if (isLink) {
    return (
      <Button
        asChild
        size={baseSize}
        variant={buttonVariant}
        className={cn(heightClass, widthClass, outlineClasses, className)}
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
      className={cn(heightClass, widthClass, outlineClasses, loading && "transition-none", className)}
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
    >
      {content}
    </Button>
  );
}
