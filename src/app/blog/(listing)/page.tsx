import type { Metadata } from "next";
import Link from "next/link";
import {
  BLOG_BASE_PATH,
  BLOG_PAGE_SIZE,
  BLOG_TAGLINE,
  absoluteUrl,
  parsePage,
} from "@/lib/blog";
import { getBlogCategories, getFeaturedArticles, listArticles } from "@/services/blog";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { ArticleGrid } from "@/components/blog/ArticleGrid";
import { ArticleListingView } from "@/components/blog/ArticleListingView";
import { BlogCTA } from "@/components/blog/BlogCTA";
import { BlogEmptyState } from "@/components/blog/BlogStates";
import { BlogHero } from "@/components/blog/BlogHero";
import { CategoryNav } from "@/components/blog/CategoryNav";
import { FeaturedArticle } from "@/components/blog/FeaturedArticle";

interface BlogPageProps {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}

function readQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().slice(0, 100);
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const page = parsePage(sp.page);
  const canonical = absoluteUrl(BLOG_BASE_PATH);

  if (q) {
    // Internal search results are thin, endless URLs: keep them out of the index.
    return {
      title: `Search: ${q}`,
      robots: { index: false, follow: true },
      alternates: { canonical },
    };
  }
  return {
    title: page > 1 ? `Latest articles, page ${page}` : "Kampmax Blog — Ideas, opportunities & stories for students",
    description: BLOG_TAGLINE,
    alternates: { canonical: page > 1 ? `${canonical}?page=${page}` : canonical },
    openGraph: {
      title: "Kampmax Blog",
      description: BLOG_TAGLINE,
      url: canonical,
      siteName: "Kampmax",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: "Kampmax Blog", description: BLOG_TAGLINE },
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const page = parsePage(sp.page);

  // Search results and deeper pages share the plain listing layout.
  if (q || page > 1) {
    const [data, categories] = await Promise.all([
      listArticles({ q: q || undefined, page, limit: BLOG_PAGE_SIZE }),
      getBlogCategories(),
    ]);
    return (
      <ArticleListingView
        title={q ? `Results for “${q}”` : "All articles"}
        basePath={BLOG_BASE_PATH}
        data={data}
        categories={categories}
        q={q || undefined}
        emptyMessage={
          q ? "Nothing matched your search. Try a different word or browse a category." : "There are no articles on this page."
        }
      />
    );
  }

  const [latest, featured, categories, popular] = await Promise.all([
    listArticles({ page: 1, limit: BLOG_PAGE_SIZE }),
    getFeaturedArticles(1),
    getBlogCategories(),
    listArticles({ sortBy: "viewCount", limit: 4 }),
  ]);

  if (latest.meta.total === 0) {
    return (
      <>
        <BlogHero />
        <BlogEmptyState
          title="Articles are on the way"
          message="We're preparing guides and stories for students, vendors and freelancers. Check back soon."
        />
      </>
    );
  }

  const lead = featured[0] ?? latest.items[0];
  const rest = latest.items.filter((a) => a.id !== lead.id);
  const trending = popular.items.filter((a) => a.viewCount > 0 && a.id !== lead.id).slice(0, 4);

  return (
    <>
      <BlogHero />
      <div className="space-y-14 pb-4">
        <CategoryNav categories={categories} />

        <FeaturedArticle article={lead} />

        {rest.length > 0 && (
          <section aria-labelledby="latest-heading">
            <h2 id="latest-heading" className="text-xl font-bold tracking-tight text-kampmax-text">
              Latest articles
            </h2>
            <div className="mt-6">
              <ArticleGrid articles={rest} />
            </div>
            {latest.meta.totalPages > 1 && (
              <div className="mt-10 text-center">
                <Link
                  href={`${BLOG_BASE_PATH}?page=2`}
                  className="inline-flex h-11 items-center rounded-md border border-kampmax-border bg-white px-5 text-sm font-medium text-kampmax-text hover:bg-kampmax-muted"
                >
                  More articles
                </Link>
              </div>
            )}
          </section>
        )}

        {trending.length >= 2 && (
          <section aria-labelledby="popular-heading">
            <h2 id="popular-heading" className="text-xl font-bold tracking-tight text-kampmax-text">
              Popular right now
            </h2>
            <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {trending.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} badge="Popular" />
                </li>
              ))}
            </ul>
          </section>
        )}

        <BlogCTA />
      </div>
    </>
  );
}
