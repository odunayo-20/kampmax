import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BLOG_PAGE_SIZE, absoluteUrl, categoryPath, parsePage } from "@/lib/blog";
import { getBlogCategories, listArticles } from "@/services/blog";
import { ArticleListingView } from "@/components/blog/ArticleListingView";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

const loadCategories = cache(getBlogCategories);

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const category = (await loadCategories()).find((c) => c.slug === slug);
  if (!category) return { title: "Category not found", robots: { index: false } };

  const title = page > 1 ? `${category.name} articles, page ${page}` : `${category.name} articles`;
  const description =
    category.description ?? `Guides and stories about ${category.name.toLowerCase()} from the Kampmax blog.`;
  const canonical = absoluteUrl(categoryPath(slug));
  return {
    title,
    description,
    alternates: { canonical: page > 1 ? `${canonical}?page=${page}` : canonical },
    openGraph: { title: `${title} | Kampmax`, description, url: canonical, siteName: "Kampmax", type: "website" },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const categories = await loadCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const data = await listArticles({ category: slug, page, limit: BLOG_PAGE_SIZE });
  return (
    <ArticleListingView
      title={category.name}
      description={category.description ?? undefined}
      basePath={categoryPath(slug)}
      data={data}
      categories={categories}
      activeCategorySlug={slug}
      emptyMessage="No articles in this category yet."
      searchable={false}
    />
  );
}
