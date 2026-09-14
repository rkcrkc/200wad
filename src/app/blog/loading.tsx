/** Index/article loading skeleton — mirrors the header + card grid rhythm. */
export default function BlogLoading() {
  return (
    <div className="container py-14 sm:py-20" aria-hidden>
      <div className="flex flex-col gap-4">
        <div className="h-4 w-28 rounded bg-[var(--tan)]" />
        <div className="h-10 w-[min(640px,90%)] rounded bg-[var(--tan)]" />
      </div>

      <div className="mt-8 flex flex-wrap gap-2.5">
        {[80, 96, 72, 88].map((w, i) => (
          <div key={i} style={{ width: w }} className="h-9 rounded-full bg-[var(--tan)]" />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-[30px] md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-[30px] border-[3px] border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_var(--ink)]"
          >
            <div className="h-[148px] w-full rounded-[10px] bg-[var(--tan)]" />
            <div className="h-3 w-20 rounded bg-[var(--tan)]" />
            <div className="h-6 w-3/4 rounded bg-[var(--tan)]" />
            <div className="h-4 w-full rounded bg-[var(--tan)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
