/**
 * Public blog data access for Server Components.
 *
 * Uses plain `fetch` (not the browser ApiClient, which depends on
 * localStorage tokens) so pages render on the server and are cached with
 * time-based revalidation. Everything here is unauthenticated and public.
 */
import { API_BASE_URL } from "@/lib/api-config";
import type {
  ArticleLookup,
  BlogCategoryItem,
  BlogPage,
  BlogSitemapEntry,
  BlogTagItem,
  ArticleListItem,
  PublicArticleQuery,
} from "@/types/blog";

export const BLOG_REVALIDATE_SECONDS = 60;
export const BLOG_CACHE_TAG = "blog";

export class BlogApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "BlogApiError";
  }
}

interface Envelope<T> {
  data: T;
}

async function get<T>(path: string, revalidate = BLOG_REVALIDATE_SECONDS): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate, tags: [BLOG_CACHE_TAG] },
    });
  } catch {
    throw new BlogApiError("The blog is temporarily unavailable.", 503);
  }
  if (!response.ok) {
    throw new BlogApiError(
      response.status === 404 ? "Not found" : "The blog is temporarily unavailable.",
      response.status
    );
  }
  const body = (await response.json()) as Envelope<T>;
  return body.data;
}

function toQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function listArticles(query: PublicArticleQuery = {}): Promise<BlogPage<ArticleListItem>> {
  return get(`/blog/articles${toQueryString(query)}`);
}

export function getFeaturedArticles(limit = 1): Promise<ArticleListItem[]> {
  return get(`/blog/articles/featured?limit=${limit}`);
}

/** Resolves to `null` when the article does not exist (or is not public). */
export async function getArticle(slug: string): Promise<ArticleLookup | null> {
  try {
    return await get<ArticleLookup>(`/blog/articles/slug/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof BlogApiError && error.status === 404) return null;
    throw error;
  }
}

export function getBlogCategories(): Promise<BlogCategoryItem[]> {
  return get("/blog/categories");
}

export function getBlogTags(limit = 30, q?: string): Promise<BlogPage<BlogTagItem>> {
  return get(`/blog/tags${toQueryString({ limit, q })}`);
}

export function getBlogSitemap(): Promise<BlogSitemapEntry[]> {
  return get("/blog/articles/sitemap", 3600);
}
