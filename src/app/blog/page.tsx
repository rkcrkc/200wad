import type { Metadata } from "next";
import { getBlogIndex } from "@/lib/queries/blog";
import { FilterBar } from "./_components/FilterBar";
import { FeaturedCard } from "./_components/FeaturedCard";
import { PostCard } from "./_components/PostCard";
import { ProductUpdates } from "./_components/ProductUpdates";

export const metadata: Metadata = {
  title: "Blog — 200 Words a Day",
  description:
    "Language-learning motivation, method, and science from the 200 Words a Day team.",
  alternates: { canonical: "/blog" },
  robots: { index: true, follow: true },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; lang?: string }>;
}) {
  const { category, lang } = await searchParams;
  const { featured, posts, productUpdates, filters, activeCategory, activeLang } =
    await getBlogIndex({ category, lang });

  const hasResults = Boolean(featured) || posts.length > 0;

  return (
    <div className="container py-14 sm:py-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <p className="eyebrow">200 WAD Blog</p>
        <h1 className="heading-xl max-w-[640px] text-[var(--ink)]">
          Get into the language learning spirit
        </h1>
      </div>

      {/* Filters */}
      <div className="mt-8">
        <FilterBar
          filters={filters}
          activeCategory={activeCategory}
          activeLang={activeLang}
        />
      </div>

      {/* Featured + Product updates — featured spans two of three columns on
          desktop, with the product-updates list in the third. */}
      {featured && (
        <div className="mt-10 grid grid-cols-1 items-stretch gap-[30px] lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeaturedCard post={featured} />
          </div>
          {productUpdates.length > 0 && (
            <div className="hidden lg:block">
              <ProductUpdates posts={productUpdates} />
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {posts.length > 0 && (
        <div className="mt-10 grid grid-cols-1 items-stretch gap-[30px] md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Product updates — below the grid on tablet/mobile (shown in the featured
          row on desktop). */}
      {productUpdates.length > 0 && (
        <div className="mt-10 lg:hidden">
          <ProductUpdates posts={productUpdates} />
        </div>
      )}

      {/* Empty */}
      {!hasResults && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="heading-s text-[var(--ink)]">No posts here yet</p>
          <p className="text-[16px] text-[var(--ink-soft)]">
            Try clearing the filters to see everything we&rsquo;ve written.
          </p>
        </div>
      )}
    </div>
  );
}
