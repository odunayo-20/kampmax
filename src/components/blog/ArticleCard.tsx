import Link from "next/link";
import { articlePath, categoryPath, formatArticleDate, readingTimeLabel } from "@/lib/blog";
import type { ArticleListItem } from "@/types/blog";
import { cn } from "@/lib/utils";
import { BlogImage, BlogImagePlaceholder } from "./BlogImage";

interface ArticleCardProps {
  article: ArticleListItem;
  /** Eagerly load the cover (use for above-the-fold cards). */
  priority?: boolean;
  /** Small marker shown next to the category, e.g. "Featured" or "Popular". */
  badge?: string;
  className?: string;
}

/**
 * The one article card used on every blog listing. The whole card is a single
 * link target (the title link stretched over the card) so there is one tab
 * stop per article; the category link sits above it.
 */
export function ArticleCard({ article, priority, badge, className }: ArticleCardProps) {
  const reading = readingTimeLabel(article.readingTimeMinutes);
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-kampmax-muted">
        {article.coverImage ? (
          <BlogImage
            src={article.coverImage}
            alt=""
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <BlogImagePlaceholder label="" />
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs font-medium">
        {article.category && (
          <Link
            href={categoryPath(article.category.slug)}
            className="relative z-10 text-kampmax-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
          >
            {article.category.name}
          </Link>
        )}
        {badge && (
          <span className="rounded bg-kampmax-gold/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
            {badge}
          </span>
        )}
      </div>

      <h3 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-kampmax-text">
        <Link
          href={articlePath(article.slug)}
          className="after:absolute after:inset-0 after:content-[''] hover:text-kampmax-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
        >
          {article.title}
        </Link>
      </h3>

      {article.excerpt && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-kampmax-text-secondary">
          {article.excerpt}
        </p>
      )}

      <p className="mt-3 text-xs text-kampmax-text-muted">
        {article.author.name}
        {article.publishedAt && (
          <>
            {" · "}
            <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
          </>
        )}
        {reading && ` · ${reading}`}
      </p>
    </article>
  );
}
