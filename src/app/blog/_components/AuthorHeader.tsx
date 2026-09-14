import type { BlogAuthor } from "@/types/database";
import { Avatar } from "./Avatar";

/**
 * Author page header — large avatar, name, role, and bio. Centred on mobile,
 * left-aligned from sm up.
 */
export function AuthorHeader({ author }: { author: BlogAuthor }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
      <Avatar name={author.name} src={author.avatar_url} size={96} />
      <div className="flex flex-col gap-2">
        {author.role && <p className="eyebrow">{author.role}</p>}
        <h1 className="heading-l text-[var(--ink)]">{author.name}</h1>
        {author.bio && (
          <p className="max-w-[640px] text-[16px] leading-[1.6] text-[var(--ink-soft)]">
            {author.bio}
          </p>
        )}
      </div>
    </div>
  );
}
