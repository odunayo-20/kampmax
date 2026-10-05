import type { BlogCategoryItem, BlogPage, ArticleListItem } from "@/types/blog";
import { ArticleGrid } from "./ArticleGrid";
import { BlogEmptyState } from "./BlogStates";
import { BlogPagination } from "./BlogPagination";
import { BlogSearch } from "./BlogSearch";
import { CategoryNav } from "./CategoryNav";
import { BlogCTA } from "./BlogCTA";

interface ArticleListingViewProps {
  title: string;
  description?: string;
  /** Path used for pagination links, e.g. /blog/category/career. */
  basePath: string;
  data: BlogPage<ArticleListItem>;
  categories: BlogCategoryItem[];
  activeCategorySlug?: string;
  q?: string;
  emptyMessage: string;
  /** Show the search box (landing results and category pages; not tag pages). */
  searchable?: boolean;
}

/** Shared listing layout for search results, category pages and tag pages. */
export function ArticleListingView({
  title,
  description,
  basePath,
  data,
  categories,
  activeCategorySlug,
  q,
  emptyMessage,
  searchable = true,
}: ArticleListingViewProps) {
  const { items, meta } = data;
  return (
    <div className="py-8 sm:py-10">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-kampmax-navy sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 text-base leading-relaxed text-kampmax-text-secondary">{description}</p>
        )}
        {meta.total > 0 && (
          <p className="mt-2 text-sm text-kampmax-text-muted" role="status">
            {meta.total} {meta.total === 1 ? "article" : "articles"}
          </p>
        )}
      </header>

      <div className="mt-6 space-y-4">
        {searchable && (
          <div className="max-w-xl">
            <BlogSearch defaultValue={q} />
          </div>
        )}
        <CategoryNav categories={categories} activeSlug={activeCategorySlug} />
      </div>

      <div className="mt-8">
        {items.length === 0 ? (
          <BlogEmptyState message={emptyMessage} clearHref={q ? basePath : undefined} />
        ) : (
          <>
            <ArticleGrid articles={items} priorityCount={3} />
            <BlogPagination page={meta.page} totalPages={meta.totalPages} basePath={basePath} q={q} />
          </>
        )}
      </div>

      <div className="mt-16">
        <BlogCTA categorySlug={activeCategorySlug} />
      </div>
    </div>
  );
}
