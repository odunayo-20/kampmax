import type { ArticleListItem } from "@/types/blog";
import { ArticleCard } from "./ArticleCard";

export function RelatedArticles({ articles }: { articles: ArticleListItem[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="related-heading">
      <h2 id="related-heading" className="text-xl font-bold tracking-tight text-kampmax-text">
        Keep reading
      </h2>
      <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((article) => (
          <li key={article.id}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </section>
  );
}
