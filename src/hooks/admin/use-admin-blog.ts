"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blogAdminApi } from "@/services/admin/blog-management.api";
import type { AdminArticleQuery, ArticleInput } from "@/types/blog";

/** Query keys for the blog console. Everything lives under one root so a mutation can refresh all of it. */
export const blogAdminKeys = {
  all: ["admin", "blog"] as const,
  articles: (query: AdminArticleQuery) => ["admin", "blog", "articles", query] as const,
  article: (id: string) => ["admin", "blog", "article", id] as const,
  categories: ["admin", "blog", "categories"] as const,
  tags: (q: string) => ["admin", "blog", "tags", q] as const,
};

export function useAdminArticles(query: AdminArticleQuery) {
  return useQuery({
    queryKey: blogAdminKeys.articles(query),
    queryFn: () => blogAdminApi.listArticles(query),
    placeholderData: (previous) => previous,
  });
}

export function useAdminArticle(id: string | null) {
  return useQuery({
    queryKey: blogAdminKeys.article(id ?? ""),
    queryFn: () => blogAdminApi.getArticle(id as string),
    enabled: !!id,
  });
}

export function useBlogCategories() {
  return useQuery({ queryKey: blogAdminKeys.categories, queryFn: () => blogAdminApi.listCategories() });
}

export function useBlogTags(q = "") {
  return useQuery({
    queryKey: blogAdminKeys.tags(q),
    queryFn: () => blogAdminApi.listTags({ q: q || undefined, limit: 100 }),
  });
}

/** Lifecycle and editing mutations; each refreshes every blog query on success. */
export function useBlogMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: blogAdminKeys.all });

  return {
    create: useMutation({ mutationFn: (input: ArticleInput) => blogAdminApi.createArticle(input), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<ArticleInput> & { expectedUpdatedAt?: string } }) =>
        blogAdminApi.updateArticle(id, input),
      onSuccess: refresh,
    }),
    publish: useMutation({
      mutationFn: ({ id, publishAt }: { id: string; publishAt?: string }) => blogAdminApi.publish(id, publishAt),
      onSuccess: refresh,
    }),
    unpublish: useMutation({ mutationFn: (id: string) => blogAdminApi.unpublish(id), onSuccess: refresh }),
    archive: useMutation({ mutationFn: (id: string) => blogAdminApi.archive(id), onSuccess: refresh }),
    restore: useMutation({ mutationFn: (id: string) => blogAdminApi.restore(id), onSuccess: refresh }),
    feature: useMutation({
      mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
        featured ? blogAdminApi.feature(id) : blogAdminApi.unfeature(id),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => blogAdminApi.remove(id), onSuccess: refresh }),
  };
}

/** Tag CRUD. Invalidates the whole blog tree (tag names also appear on article rows). */
export function useBlogTagMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: blogAdminKeys.all });
  return {
    create: useMutation({
      mutationFn: (input: { name: string; slug?: string; description?: string | null; isActive?: boolean }) => blogAdminApi.createTag(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: { name?: string; slug?: string; description?: string | null; isActive?: boolean } }) =>
        blogAdminApi.updateTag(id, input),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => blogAdminApi.deleteTag(id), onSuccess: refresh }),
  };
}

/** Category CRUD (blog taxonomy rows). */
export function useBlogCategoryMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: blogAdminKeys.all });
  type CategoryInput = { name?: string; slug?: string; description?: string; isActive?: boolean; sortOrder?: number };
  return {
    create: useMutation({
      mutationFn: (input: CategoryInput & { name: string }) => blogAdminApi.createCategory(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: CategoryInput }) => blogAdminApi.updateCategory(id, input),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => blogAdminApi.deleteCategory(id), onSuccess: refresh }),
  };
}
