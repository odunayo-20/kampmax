import { formatArticleDate, readingTimeLabel } from "@/lib/blog";
import type { ArticleListItem } from "@/types/blog";
import { cn } from "@/lib/utils";

interface ArticleMetaProps {
  article: Pick<ArticleListItem, "author" | "publishedAt" | "readingTimeMinutes">;
  /** Show the author's avatar/initials before the name. */
  withAvatar?: boolean;
  className?: string;
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kampmax-navy text-[11px] font-semibold text-white"
    >
      {initials || "K"}
    </span>
  );
}

/** Author, publication date and reading time. Semantic <time> for crawlers. */
export function ArticleMeta({ article, withAvatar, className }: ArticleMetaProps) {
  const reading = readingTimeLabel(article.readingTimeMinutes);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-kampmax-text-secondary", className)}>
      {withAvatar && <Initials name={article.author.name} />}
      <span className="font-medium text-kampmax-text">{article.author.name}</span>
      {article.publishedAt && (
        <>
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
        </>
      )}
      {reading && (
        <>
          <span aria-hidden>·</span>
          <span>{reading}</span>
        </>
      )}
    </div>
  );
}
