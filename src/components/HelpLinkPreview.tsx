"use client";

import { useRouter } from "next/navigation";

interface HelpLinkPreviewProps {
  slug: string;
  title: string;
  preview: string;
  children: React.ReactNode;
}

export function HelpLinkPreview({ slug, title, preview, children }: HelpLinkPreviewProps) {
  const router = useRouter();

  return (
    <span className="group/help relative inline">
      {children}
      <span
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/help/${slug}`);
        }}
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 cursor-pointer rounded-xl bg-white p-4 opacity-0 shadow-xl ring-1 ring-black/5 transition-opacity group-hover/help:pointer-events-auto group-hover/help:opacity-100"
      >
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-gray-500">{preview}</span>
      </span>
    </span>
  );
}
