import { apiClient, type ApiError } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";
import type {
  AdminArticle,
  AdminArticleQuery,
  ArticleInput,
  ArticleListItem,
  BlogCategoryItem,
  BlogPage,
  BlogTagItem,
} from "@/types/blog";

/**
 * Admin blog client over /admin/blog/*. Every method throws an Error whose
 * message is safe to show to the operator (never a stack trace or raw payload).
 */

/** Validation failures keep their per-field messages so forms can show them. */
export class BlogApiValidationError extends Error {
  constructor(public readonly messages: string[]) {
    super(messages[0] ?? "Please check the form and try again.");
    this.name = "BlogApiValidationError";
  }
}

export function describeBlogError(error: ApiError | Error | unknown): Error {
  const err = error as ApiError | undefined;
  if (err?.status === 401) return new Error("Your session has expired. Sign in again to continue.");
  if (err?.status === 403) return new Error("You don't have permission to do that.");
  if (err?.status === 404) return new Error("That item no longer exists. Refresh and try again.");
  if (err?.status === 429) return new Error("Too many requests. Wait a moment and try again.");
  if (err?.status && err.status >= 500) return new Error("The server had a problem. Try again shortly.");

  const payload = err?.data as { message?: string | string[] } | undefined;
  if (Array.isArray(payload?.message)) return new BlogApiValidationError(payload.message);
  if (err?.status && err.message) return new Error(err.message);
  return new Error("Can't reach the server. Check your connection and try again.");
}

async function call<T>(run: () => Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  let result: { data: T; error: ApiError | null };
  try {
    result = await run();
  } catch {
    // fetch itself failed: offline, DNS, CORS.
    throw describeBlogError(undefined);
  }
  if (result.error) throw describeBlogError(result.error);
  return result.data;
}

function qs(params: object): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const BASE = "/admin/blog";

export const blogAdminApi = {
  // Articles
  listArticles: (query: AdminArticleQuery = {}) =>
    call(() => apiClient.get<BlogPage<ArticleListItem>>(`${BASE}/articles${qs(query)}`)),
  getArticle: (id: string) => call(() => apiClient.get<AdminArticle>(`${BASE}/articles/${id}`)),
  createArticle: (input: ArticleInput) =>
    call(() => apiClient.post<ArticleInput, AdminArticle>(`${BASE}/articles`, input)),
  updateArticle: (id: string, input: Partial<ArticleInput> & { expectedUpdatedAt?: string }) =>
    call(() => apiClient.patch<typeof input, AdminArticle>(`${BASE}/articles/${id}`, input)),
  publish: (id: string, publishAt?: string) =>
    call(() => apiClient.post<{ publishAt?: string }, AdminArticle>(`${BASE}/articles/${id}/publish`, { publishAt })),
  unpublish: (id: string) => call(() => apiClient.post<undefined, AdminArticle>(`${BASE}/articles/${id}/unpublish`)),
  archive: (id: string) => call(() => apiClient.post<undefined, AdminArticle>(`${BASE}/articles/${id}/archive`)),
  restore: (id: string) => call(() => apiClient.post<undefined, AdminArticle>(`${BASE}/articles/${id}/restore`)),
  feature: (id: string) => call(() => apiClient.post<undefined, AdminArticle>(`${BASE}/articles/${id}/feature`)),
  unfeature: (id: string) => call(() => apiClient.post<undefined, AdminArticle>(`${BASE}/articles/${id}/unfeature`)),
  remove: (id: string) => call(() => apiClient.delete<unknown>(`${BASE}/articles/${id}`)),
  preview: (content: string) =>
    call(() =>
      apiClient.post<{ content: string }, { html: string; readingTimeMinutes: number }>(`${BASE}/preview`, { content })
    ),

  /** Multipart upload: the browser sets the boundary, so this bypasses the JSON client. */
  async uploadCover(file: File): Promise<{ id: string; url: string }> {
    const body = new FormData();
    body.append("file", file);
    const token = getAccessToken();
    let response: Response;
    try {
      response = await fetch(new URL("/api/v1/admin/blog/media/cover", getApiBaseUrl()).toString(), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
    } catch {
      throw describeBlogError(undefined);
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const raw = json?.message;
      const detail = Array.isArray(raw) ? raw.join(", ") : raw;
      throw describeBlogError({ status: response.status, message: detail, data: json } as unknown as ApiError);
    }
    return (json.data ?? json) as { id: string; url: string };
  },

  /** Inline article images use the same validated upload as the cover image. */
  uploadImage(file: File): Promise<{ id: string; url: string }> {
    return blogAdminApi.uploadCover(file);
  },

  // Categories
  listCategories: () => call(() => apiClient.get<BlogCategoryItem[]>(`${BASE}/categories`)),
  createCategory: (input: { name: string; slug?: string; description?: string; isActive?: boolean; sortOrder?: number }) =>
    call(() => apiClient.post<typeof input, BlogCategoryItem>(`${BASE}/categories`, input)),
  updateCategory: (
    id: string,
    input: { name?: string; slug?: string; description?: string; isActive?: boolean; sortOrder?: number }
  ) => call(() => apiClient.patch<typeof input, BlogCategoryItem>(`${BASE}/categories/${id}`, input)),
  deleteCategory: (id: string) => call(() => apiClient.delete<unknown>(`${BASE}/categories/${id}`)),

  // Tags
  listTags: (params: { q?: string; page?: number; limit?: number } = {}) =>
    call(() => apiClient.get<BlogPage<BlogTagItem>>(`${BASE}/tags${qs(params)}`)),
  createTag: (input: { name: string; slug?: string; description?: string | null; isActive?: boolean }) =>
    call(() => apiClient.post<typeof input, BlogTagItem>(`${BASE}/tags`, input)),
  updateTag: (id: string, input: { name?: string; slug?: string; description?: string | null; isActive?: boolean }) =>
    call(() => apiClient.patch<typeof input, BlogTagItem>(`${BASE}/tags/${id}`, input)),
  deleteTag: (id: string) => call(() => apiClient.delete<unknown>(`${BASE}/tags/${id}`)),
};
