import Link from "next/link";
import { BLOG_BASE_PATH, categoryPath } from "@/lib/blog";
import type { BlogCategoryItem } from "@/types/blog";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  categories: BlogCategoryItem[];
  /** Slug of the current category; omit for the "All" view. */
  activeSlug?: string;
}

/**
 * Category discovery as a single scrollable row of links, so any number of
 * database-driven categories stays compact on mobile.
 */
export function CategoryNav({ categories, activeSlug }: CategoryNavProps) {
  if (categories.length === 0) return null;
  const pill = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue",
      active
        ? "border-kampmax-navy bg-kampmax-navy text-white"
        : "border-kampmax-border bg-white text-kampmax-text hover:border-kampmax-border-strong hover:bg-kampmax-muted"
    );
  return (
    <nav aria-label="Blog categories">
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <li>
          <Link href={BLOG_BASE_PATH} aria-current={!activeSlug ? "page" : undefined} className={pill(!activeSlug)}>
            All
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={categoryPath(category.slug)}
              aria-current={activeSlug === category.slug ? "page" : undefined}
              className={pill(activeSlug === category.slug)}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
