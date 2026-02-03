"use client";

import { cn } from "@/lib/utils";

interface AdminFormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminFormField({
  label,
  name,
  error,
  required,
  hint,
  children,
  className,
}: AdminFormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================================
// TEXT INPUT
// ============================================================================

interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function AdminInput({ error, className, ...props }: AdminInputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        error
          ? "border-red-300 bg-red-50"
          : "border-gray-300 bg-white hover:border-gray-400",
        props.disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// TEXTAREA
// ============================================================================

interface AdminTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function AdminTextarea({
  error,
  className,
  ...props
}: AdminTextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        "min-h-[80px] resize-y",
        error
          ? "border-red-300 bg-red-50"
          : "border-gray-300 bg-white hover:border-gray-400",
        props.disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// SELECT
// ============================================================================

interface AdminSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function AdminSelect({
  error,
  options,
  placeholder,
  className,
  ...props
}: AdminSelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        error
          ? "border-red-300 bg-red-50"
          : "border-gray-300 bg-white hover:border-gray-400",
        props.disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
