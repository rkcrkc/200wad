"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

/** Brand-skinned FAQ accordion for Concept E. First item open by default. */
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="grid gap-3">
      {items.map((item, i) => {
        const isOpen = i === open;
        return (
          <div key={item.q} className="card card-sm overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[16px] font-bold">{item.q}</span>
              <Plus
                className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`}
              />
            </button>
            <div
              className={`grid transition-all ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[15px] ink-soft">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
