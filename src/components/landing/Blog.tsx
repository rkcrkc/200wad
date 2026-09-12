import Link from "next/link";

/** The three teaser posts. `href` points at the (future) article route; the cards
 *  are links so the whole card is tappable. */
const POSTS = [
  { title: "100 reasons to learn a language", href: "/blog" },
  { title: "Learning languages the 200 Words a Day way", href: "/blog" },
  { title: "The science behind why funny beats boring", href: "/blog" },
] as const;

/** One blog teaser: a thumbnail placeholder, an "Article" eyebrow and the title,
 *  in the shared bordered white card. The whole card is a link and presses into
 *  its shadow on hover (the same feel as the CTA buttons). */
function BlogCard({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start gap-5 rounded-[30px] border-[3px] border-[var(--ink)] bg-white p-6 !no-underline shadow-[5px_5px_0_var(--ink)] transition-[transform,box-shadow] duration-[80ms] ease-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_var(--ink)]"
    >
      <div className="h-[148px] w-full rounded-[10px] bg-[rgba(217,217,217,0.2)]" aria-hidden />
      <p className="eyebrow">Article</p>
      <h3 className="heading-s text-[var(--ink)]">{title}</h3>
    </Link>
  );
}

/**
 * Section 13 · Blog — a soft-pink band teasing the 200WAD blog: a centred eyebrow
 * + heading over three article cards. The cards sit in a three-up row on desktop
 * and stack to a single column below md.
 */
export function Blog() {
  return (
    <section id="blog" aria-label="From the blog" className="bg-[#ffeaf3] py-16 sm:py-24">
      <div className="container flex flex-col items-center gap-[30px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="eyebrow">200 WAD Blog</p>
          <h2 className="heading-l max-w-[600px] text-[var(--ink)]">
            Get into the language learning spirit
          </h2>
        </div>

        <div className="grid w-full grid-cols-1 items-start gap-[30px] md:grid-cols-3">
          {POSTS.map((p) => (
            <BlogCard key={p.title} title={p.title} href={p.href} />
          ))}
        </div>
      </div>
    </section>
  );
}
