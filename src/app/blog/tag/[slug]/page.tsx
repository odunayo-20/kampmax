import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BLOG_PAGE_SIZE, absoluteUrl, parsePage, tagPath } from "@/lib/blog";
import { getBlogCategories, getBlogTags, listArticles } from "@/services/blog";
import { ArticleListingView } from "@/components/blog/ArticleListingView";

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

const loadTag = cache(async (slug: string) => {
  // The tags endpoint matches name or slug, so this stays correct beyond any page size.
  const tags = await getBlogTags(20, slug);
  return tags.items.find((t) => t.slug === slug) ?? null;
});

export async function generateMetadata({ params, searchParams }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const tag = await loadTag(slug);
  if (!tag) return { title: "Tag not found", robots: { index: false } };

  const title = page > 1 ? `#${tag.name} articles, page ${page}` : `#${tag.name} articles`;
  const description = tag.description ?? `Kampmax blog articles tagged ${tag.name}.`;
  const canonical = absoluteUrl(tagPath(slug));
  return {
    title,
    description,
    alternates: { canonical: page > 1 ? `${canonical}?page=${page}` : canonical },
    openGraph: { title: `${title} | Kampmax`, description, url: canonical, siteName: "Kampmax", type: "website" },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const tag = await loadTag(slug);
  if (!tag) notFound();

  const [data, categories] = await Promise.all([
    listArticles({ tag: slug, page, limit: BLOG_PAGE_SIZE }),
    getBlogCategories(),
  ]);
  return (
    <ArticleListingView
      title={`#${tag.name}`}
      description={tag.description ?? undefined}
      basePath={tagPath(slug)}
      data={data}
      categories={categories}
      emptyMessage="No articles with this tag yet."
      searchable={false}
    />
  );
}
