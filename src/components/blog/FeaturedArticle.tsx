import Link from "next/link";
import { articlePath, categoryPath } from "@/lib/blog";
import type { ArticleListItem } from "@/types/blog";
import { ArticleMeta } from "./ArticleMeta";
import { BlogImage, BlogImagePlaceholder } from "./BlogImage";

/** The lead story on the blog landing page. */
export function FeaturedArticle({ article }: { article: ArticleListItem }) {
  return (
    <article className="group relative grid gap-5 md:grid-cols-5 md:items-center md:gap-8">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-kampmax-muted md:col-span-3">
        {article.coverImage ? (
          <BlogImage
            src={article.coverImage}
            alt=""
            sizes="(min-width: 1280px) 720px, (min-width: 768px) 60vw, 100vw"
            priority
          />
        ) : (
          <BlogImagePlaceholder label="" />
        )}
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="text-amber-700">Featured</span>
          {article.category && (
            <>
              <span aria-hidden className="text-kampmax-border-strong">/</span>
              <Link
                href={categoryPath(article.category.slug)}
                className="relative z-10 text-kampmax-blue hover:underline"
              >
                {article.category.name}
              </Link>
            </>
          )}
        </div>
        <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-kampmax-text sm:text-3xl">
          <Link
            href={articlePath(article.slug)}
            className="after:absolute after:inset-0 after:content-[''] hover:text-kampmax-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
          >
            {article.title}
          </Link>
        </h2>
        {article.excerpt && (
          <p className="mt-3 line-clamp-3 text-base leading-relaxed text-kampmax-text-secondary">
            {article.excerpt}
          </p>
        )}
        <ArticleMeta article={article} withAvatar className="mt-4" />
      </div>
    </article>
  );
}
