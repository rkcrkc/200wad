/**
 * Author avatar. Renders the author's image when set, else a tan circle with their
 * initial. Uses a plain <img> (not next/image) because avatar hosts are arbitrary
 * external CMS URLs we don't want to enumerate in next.config remotePatterns.
 */
export function Avatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src: string | null;
  size?: number;
}) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={dimension}
        className="shrink-0 rounded-full border-2 border-[var(--ink)] object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={dimension}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--tan)] font-bold text-[var(--ink)]"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
