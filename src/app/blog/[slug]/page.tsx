import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import {
  absoluteUrl,
  articleJsonLd,
  articlePath,
  breadcrumbJsonLd,
  categoryPath,
  jsonLdString,
  BLOG_BASE_PATH,
} from "@/lib/blog";
import { getArticle } from "@/services/blog";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ArticleMeta } from "@/components/blog/ArticleMeta";
import { BlogCTA } from "@/components/blog/BlogCTA";
import { BlogImage } from "@/components/blog/BlogImage";
import { RelatedArticles } from "@/components/blog/RelatedArticles";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { TagList } from "@/components/blog/TagList";
import { ViewTracker } from "@/components/blog/ViewTracker";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// Deduplicates the fetch between generateMetadata and the page render.
const loadArticle = cache(getArticle);

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await loadArticle(slug);
  const article = lookup?.article;
  if (!article) return { title: "Article not found", robots: { index: false, follow: false } };

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || undefined;
  const canonical = article.canonicalUrl || absoluteUrl(articlePath(article.slug));
  const image = article.ogImage || article.coverImage;

  return {
    title,
    description,
    alternates: { canonical },
    authors: [{ name: article.author.name }],
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: "Kampmax",
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      authors: [article.author.name],
      section: article.category?.name,
      tags: article.tags.map((t) => t.name),
      images: image ? [{ url: image, alt: article.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const lookup = await loadArticle(slug);
  if (!lookup) notFound();
  if (lookup.redirectTo) permanentRedirect(articlePath(lookup.redirectTo));
  const article = lookup.article;
  if (!article) notFound();

  const url = absoluteUrl(articlePath(article.slug));

  return (
    <article className="py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString([articleJsonLd(article), breadcrumbJsonLd(article)]) }}
      />

      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-kampmax-text-secondary">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href={BLOG_BASE_PATH} className="hover:text-kampmax-blue">Blog</Link>
            </li>
            {article.category && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={categoryPath(article.category.slug)} className="hover:text-kampmax-blue">
                    {article.category.name}
                  </Link>
                </li>
              </>
            )}
          </ol>
        </nav>

        <header className="mt-5">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-kampmax-navy sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-kampmax-text-secondary sm:text-xl">{article.excerpt}</p>
          )}
          <ArticleMeta article={article} withAvatar className="mt-5" />
        </header>
      </div>

      {article.coverImage && (
        <figure className="mx-auto mt-8 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-kampmax-muted">
            <BlogImage
              src={article.coverImage}
              alt={article.title}
              sizes="(min-width: 1024px) 1024px, 100vw"
              priority
            />
          </div>
        </figure>
      )}

      <div className="mt-10">
        <ArticleContent html={article.contentHtml} />
      </div>

      <div className="mx-auto mt-12 max-w-[68ch] space-y-8">
        <TagList tags={article.tags} />
        <ShareButtons url={url} title={article.title} />
        <BlogCTA categorySlug={article.category?.slug} />
      </div>

      <div className="mt-16 border-t border-kampmax-border pt-12">
        <RelatedArticles articles={article.related} />
      </div>

      <ViewTracker slug={article.slug} />
    </article>
  );
}
