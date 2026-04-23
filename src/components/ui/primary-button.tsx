"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BaseProps = {
  variant?: "primary" | "outline";
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
  const { variant = "primary", className, children, fullWidth } = props;
  const buttonVariant = variant === "outline" ? "outline" : "default";
  const heightClass = "h-[52px]";
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
      {showChevron ? <ChevronRight className="ml-2 h-5 w-5" /> : null}
    </>
  );

  if (isLink) {
    return (
      <Button
        asChild
        size="xl"
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
      size="xl"
      variant={buttonVariant}
      className={cn(heightClass, widthClass, outlineClasses, className)}
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
    >
      {content}
    </Button>
  );
}
