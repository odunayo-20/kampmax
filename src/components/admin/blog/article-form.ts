import type { AdminArticle, ArticleInput } from "@/types/blog";
import { SLUG_PATTERN, slugifyTitle } from "./blog-meta";
import { countImagesMissingAlt, findHeadingIssues } from "@/components/editor/content-utils";

export interface ArticleFormState {
  title: string;
  slug: string;
  /** True once the editor typed in the slug field; stops auto-slugging from the title. */
  slugTouched: boolean;
  excerpt: string;
  content: string;
  coverImage: string | null;
  coverImageMediaId: string | null;
  ogImage: string | null;
  categoryId: string;
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
}

export const EMPTY_FORM: ArticleFormState = {
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  content: "",
  coverImage: null,
  coverImageMediaId: null,
  ogImage: null,
  categoryId: "",
  tagIds: [],
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
};

export function formFromArticle(article: AdminArticle): ArticleFormState {
  return {
    title: article.title,
    slug: article.slug,
    slugTouched: true,
    excerpt: article.excerpt ?? "",
    content: article.content ?? "",
    coverImage: article.coverImage,
    coverImageMediaId: article.coverImageMediaId,
    ogImage: article.ogImage,
    categoryId: article.category?.id ?? "",
    tagIds: article.tags.map((t) => t.id),
    seoTitle: article.seoTitle ?? "",
    seoDescription: article.seoDescription ?? "",
    canonicalUrl: article.canonicalUrl ?? "",
  };
}

/** Title edits drive the slug until the editor takes the slug over. */
export function withTitle(form: ArticleFormState, title: string, isNew: boolean): ArticleFormState {
  return {
    ...form,
    title,
    slug: isNew && !form.slugTouched ? slugifyTitle(title) : form.slug,
  };
}

const orNull = (value: string): string | null => (value.trim() ? value.trim() : null);

/** Payload for create/update. Empty optional fields are sent as null so they can be cleared. */
export function toInput(form: ArticleFormState, opts: { isNew: boolean; originalSlug?: string }): ArticleInput {
  const input: ArticleInput = {
    title: form.title.trim(),
    excerpt: orNull(form.excerpt),
    content: form.content.trim() ? form.content : null,
    coverImage: form.coverImage,
    coverImageMediaId: form.coverImageMediaId,
    ogImage: form.ogImage,
    categoryId: form.categoryId || null,
    tagIds: form.tagIds,
    seoTitle: orNull(form.seoTitle),
    seoDescription: orNull(form.seoDescription),
    canonicalUrl: orNull(form.canonicalUrl),
  };
  const slug = form.slug.trim();
  // New articles let the server generate a unique slug unless one was typed.
  if (opts.isNew ? form.slugTouched && slug : slug && slug !== opts.originalSlug) input.slug = slug;
  return input;
}

export type FormErrors = Partial<Record<"title" | "slug" | "excerpt" | "seoTitle" | "seoDescription" | "canonicalUrl", string>>;

export function validateForm(form: ArticleFormState): FormErrors {
  const errors: FormErrors = {};
  const title = form.title.trim();
  if (title.length < 3) errors.title = "Enter a title of at least 3 characters.";
  else if (title.length > 200) errors.title = "Keep the title under 200 characters.";
  if (form.slug.trim() && !SLUG_PATTERN.test(form.slug.trim())) {
    errors.slug = "Use lowercase letters and numbers separated by hyphens.";
  }
  if (form.excerpt.length > 320) errors.excerpt = "Keep the excerpt under 320 characters.";
  if (form.seoTitle.length > 160) errors.seoTitle = "Keep the SEO title under 160 characters.";
  if (form.seoDescription.length > 320) errors.seoDescription = "Keep the meta description under 320 characters.";
  if (form.canonicalUrl.trim()) {
    try {
      const url = new URL(form.canonicalUrl.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      errors.canonicalUrl = "Enter a full URL starting with https://";
    }
  }
  return errors;
}

/** What is still missing before the article may be published (mirrors the server rules). */
export function publishBlockers(form: ArticleFormState): string[] {
  const missing: string[] = [];
  if (form.title.trim().length < 3) missing.push("a title");
  if (!form.content.trim()) missing.push("article content");
  if (!form.categoryId) missing.push("a category");
  const noAlt = countImagesMissingAlt(form.content);
  if (noAlt > 0) missing.push(`alt text for ${noAlt} image${noAlt === 1 ? "" : "s"}`);
  const headingIssues = findHeadingIssues(form.content);
  if (headingIssues.length > 0) missing.push(`a fix to the heading order (${headingIssues[0]})`);
  return missing;
}

export function isDirty(form: ArticleFormState, baseline: ArticleFormState): boolean {
  const { slugTouched: _a, ...current } = form;
  const { slugTouched: _b, ...initial } = baseline;
  void _a;
  void _b;
  return JSON.stringify(current) !== JSON.stringify(initial);
}
