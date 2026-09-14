import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/landing/SiteNav";
import { Footer } from "@/components/landing/Footer";
import { ContactForm } from "@/components/landing/ContactForm";
import { CONTACT_EMAIL } from "@/lib/legal/company";
import "@/styles/site.css";

export const metadata: Metadata = {
  title: "Contact us — 200 Words a Day",
  description:
    "Get in touch with the 200 Words a Day team about your account, billing, bugs, partnerships, or anything else.",
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
};

/** Handy jump-links shown beside the form. */
const HELP_LINKS = [
  { href: "/pricing", label: "Pricing & plans" },
  { href: "/about", label: "About us" },
  { href: "/blog", label: "Read the blog" },
];

export default function ContactPage() {
  return (
    <div className="site flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        <section aria-label="Contact us" className="container py-14 sm:py-20">
          {/* Details aside (header + contact info) + form, split 1:2 on desktop */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <aside className="flex flex-col gap-8">
              {/* Header */}
              <div className="flex flex-col gap-4">
                <p className="eyebrow">Contact</p>
                <h1 className="heading-xl text-[var(--ink)]">Get in touch</h1>
                <p className="body text-[var(--ink-soft)]">
                  Questions, feedback, a bug to report, or just want to say hello? Fill in the
                  form and we&rsquo;ll get back to you by email.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="eyebrow">Email us</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="heading-xs text-[var(--ink)] underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  {CONTACT_EMAIL}
                </a>
                <p className="text-[14px] leading-[1.5] text-[var(--ink-soft)]">
                  We usually reply within a couple of working days.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="eyebrow">Looking for&hellip;</p>
                <ul className="flex flex-col gap-2">
                  {HELP_LINKS.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="label-heavy text-[var(--ink)] !no-underline hover:opacity-70"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <div className="rounded-[28px] border-2 border-[var(--ink)] bg-[var(--paper-2)] p-8 shadow-[5px_5px_0_var(--ink)] sm:p-12">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
