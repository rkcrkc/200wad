import Link from "next/link";

/** Branded 404 for unknown post/author slugs — renders inside the blog chrome. */
export default function BlogNotFound() {
  return (
    <div className="container flex flex-col items-center gap-5 py-24 text-center sm:py-32">
      <p className="eyebrow">404</p>
      <h1 className="heading-l text-[var(--ink)]">We couldn&rsquo;t find that page</h1>
      <p className="max-w-[480px] text-[16px] leading-[1.6] text-[var(--ink-soft)]">
        The post you&rsquo;re after may have moved or never existed. Head back to the
        blog to find something to read.
      </p>
      <Link href="/blog" className="btn">
        Back to the blog
      </Link>
    </div>
  );
}
