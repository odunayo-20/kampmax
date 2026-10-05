import type { MetadataRoute } from "next";
import { absoluteUrl, articlePath, BLOG_BASE_PATH, categoryPath } from "@/lib/blog";
import { getBlogCategories, getBlogSitemap } from "@/services/blog";

/** /blog/sitemap.xml — the blog index, category pages and every live article. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, categories] = await Promise.all([getBlogSitemap(), getBlogCategories()]).catch(
    () => [[], []] as [Awaited<ReturnType<typeof getBlogSitemap>>, Awaited<ReturnType<typeof getBlogCategories>>]
  );
  return [
    { url: absoluteUrl(BLOG_BASE_PATH), changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({
      url: absoluteUrl(categoryPath(c.slug)),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(articlePath(a.slug)),
      lastModified: new Date(a.lastModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
