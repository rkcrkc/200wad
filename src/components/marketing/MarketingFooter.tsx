import Link from "next/link";
import { MARKETING_LANGUAGES } from "@/lib/marketing/content";
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton";

const productLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/learn", label: "Languages" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto max-w-content-lg px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/home" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-white">
                200
              </span>
              <span className="text-medium-semibold">Words a Day</span>
            </Link>
            <p className="mt-4 max-w-xs text-small-regular text-foreground/60">
              The memory layer for however you learn a language. Keep your app, keep your
              class — we make the words stick.
            </p>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn
            title="Learn"
            links={MARKETING_LANGUAGES.map((l) => ({
              href: `/learn/${l.slug}`,
              label: l.name,
            }))}
          />
          <FooterColumn title="Company" links={[...companyLinks, ...legalLinks]} />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-black/5 pt-6 sm:flex-row sm:items-center">
          <p className="text-small-regular text-foreground/50">
            © {new Date().getFullYear()} 200 Words a Day. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <CookieSettingsButton className="text-small-regular text-foreground/50 transition-colors hover:text-foreground" />
            <p className="text-small-regular text-foreground/50">
              Made for people who want to actually remember.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-small-semibold text-foreground">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-small-regular text-foreground/60 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
