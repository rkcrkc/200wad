"use client";

import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface TipCardProps {
  tipId: string;
  title: string | null;
  body: string;
  emoji: string | null;
  onDismiss: (tipId: string) => void;
}

export function TipCard({ tipId, title, body, emoji, onDismiss }: TipCardProps) {
  return (
    <div className="w-full rounded-2xl border-[1.5px] border-[#F0C878] bg-[#FFF9E6] px-5 py-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {title && (
            <p className="mb-2 text-small-semibold text-foreground">{emoji || "💡"} {title}</p>
          )}
          <div className="text-small-regular text-foreground/80 prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => {
                  const url = href && !/^https?:\/\//.test(href) ? `https://${href}` : href;
                  return (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                },
              }}
            >{body}</ReactMarkdown>
          </div>
        </div>
        <button
          onClick={() => onDismiss(tipId)}
          className="mt-0.5 shrink-0 rounded-lg p-1 text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground/70"
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
