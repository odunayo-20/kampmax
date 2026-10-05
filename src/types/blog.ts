/** Blog API contracts. Mirrors kampmax-backend/src/modules/blog/interfaces. */

export type ArticleStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export interface BlogTagSummary {
  id: string;
  name: string;
  slug: string;
}

export interface BlogCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  author: BlogAuthor;
  category: BlogCategorySummary | null;
  tags: BlogTagSummary[];
  status: ArticleStatus;
  isFeatured: boolean;
  publishedAt: string | null;
  readingTimeMinutes: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleDetail extends ArticleListItem {
  contentHtml: string;
  ogImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  related: ArticleListItem[];
}

export interface AdminArticle extends ArticleListItem {
  content: string | null;
  contentHtml: string;
  coverImageMediaId: string | null;
  ogImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
}

export interface ArticleLookup {
  article: ArticleDetail | null;
  redirectTo: string | null;
}

export interface BlogCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  articleCount: number;
}

export interface BlogTagItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  articleCount: number;
}

export interface BlogPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PublicArticleQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  sortBy?: "publishedAt" | "viewCount";
}

export interface AdminArticleQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: ArticleStatus;
  categoryId?: string;
  featured?: boolean;
  sortBy?: "updatedAt" | "publishedAt" | "createdAt" | "title" | "viewCount";
  sortOrder?: "ASC" | "DESC";
}

/** Editable fields sent to create/update. `null` clears a field. */
export interface ArticleInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  coverImage?: string | null;
  coverImageMediaId?: string | null;
  ogImage?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
}

export interface BlogSitemapEntry {
  slug: string;
  lastModified: string;
}
