import Image from "next/image";

interface WordThumbnailProps {
  /** Effective image URL (e.g. word.memory_trigger_image_url). */
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * Compact word concept-pic thumbnail for admin tables. Renders the image when
 * present, otherwise a muted neutral placeholder tile.
 */
export function WordThumbnail({ src, alt, className }: WordThumbnailProps) {
  return (
    <div
      className={`relative h-9 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 ${className ?? ""}`}
    >
      {src && (
        <Image src={src} alt={alt} fill className="object-cover" sizes="48px" />
      )}
    </div>
  );
}
