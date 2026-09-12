"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

/** Q&A copy. The first answer is the Figma-supplied one; the rest are drawn from
 *  the product's actual behaviour, kept in the same reassuring, casual voice. */
const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I have to stop using Duolingo or my class?",
    a: "No - that's the whole point. 200 Words a Day is the memory layer that sits alongside whatever you already use. Keep your app, keep your class; we make the vocabulary stick.",
  },
  {
    q: "How is this different from flashcards?",
    a: "Flashcards make you grind the same cards over and over. We hook every word onto an absurd cartoon and memory trigger, so it sticks after a single look instead of dozens of reviews.",
  },
  {
    q: "What does “mastered” actually mean?",
    a: "A word counts as mastered once you've tested it perfectly - no mistakes and no clues - three times in a row. That's our bar for “you'll actually remember this.”",
  },
  {
    q: "Which languages can I learn?",
    a: "French is live today, with Spanish, German and Italian on the way. Your first 10 lessons in every language are always free.",
  },
  {
    q: "Is it really free to start?",
    a: "Yes. You get the first 10 lessons of every language free, with no credit card required. Upgrade only when you want the full course.",
  },
  {
    q: "How much time does it take?",
    a: "Lessons take about 5 minutes, so you can learn a fresh batch of words on a coffee break. Do one a day or binge a dozen - it's up to you.",
  },
  {
    q: "I bought your course before - is it the same?",
    a: "It's the same memory-hook method you loved, rebuilt as a faster, mobile-friendly app with built-in testing and progress tracking.",
  },
];

/**
 * Section 9 · FAQs — a single-open accordion of seven questions on the off-white
 * band. Each row is a soft tan-paper card; the tapped question's answer expands
 * beneath it and its plus icon rotates into a close (×). The first item opens by
 * default, matching the Figma.
 */
export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" aria-label="Frequently asked questions" className="bg-[#fffdf7] px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-[768px] flex-col items-center gap-10">
        <h2 className="text-center font-[family-name:var(--font-bricolage)] text-[32px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[var(--ink)] sm:text-[36px]">
          Frequently asked questions
        </h2>

        <div className="flex w-full flex-col gap-3">
          {FAQS.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={f.q} className="rounded-[16px] bg-[var(--paper)]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-trigger-${i}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <span className="flex-1 text-[16px] font-semibold leading-[1.4] tracking-[-0.01em] text-[var(--ink)]">
                    {f.q}
                  </span>
                  <Plus
                    className={`h-5 w-5 shrink-0 text-[var(--ink)] transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${i}`}
                    className="px-5 pb-5"
                  >
                    <p className="text-[16px] leading-[1.5] tracking-[-0.01em] text-[var(--ink)]">
                      {f.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
