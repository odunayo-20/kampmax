import Link from "next/link";
import { tagPath } from "@/lib/blog";
import type { BlogTagSummary } from "@/types/blog";

export function TagList({ tags, label = "Tags" }: { tags: BlogTagSummary[]; label?: string }) {
  if (tags.length === 0) return null;
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li key={tag.id}>
            <Link
              href={tagPath(tag.slug)}
              className="inline-flex h-8 items-center rounded-md bg-kampmax-muted px-3 text-sm text-kampmax-text-secondary transition-colors hover:bg-primary-100 hover:text-kampmax-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
            >
              #{tag.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
