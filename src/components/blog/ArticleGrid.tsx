import type { ArticleListItem } from "@/types/blog";
import { ArticleCard } from "./ArticleCard";

interface ArticleGridProps {
  articles: ArticleListItem[];
  /** Number of leading cards to load eagerly (above the fold). */
  priorityCount?: number;
}

export function ArticleGrid({ articles, priorityCount = 0 }: ArticleGridProps) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, index) => (
        <li key={article.id}>
          <ArticleCard article={article} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
