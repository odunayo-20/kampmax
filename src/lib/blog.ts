import { getSiteBaseUrl } from "@/lib/utils";
import type { ArticleDetail, ArticleListItem } from "@/types/blog";

export const BLOG_BASE_PATH = "/blog";
export const BLOG_TITLE = "Kampmax Blog";
export const BLOG_TAGLINE = "Ideas, opportunities and stories for the next generation of campus builders.";
export const BLOG_PAGE_SIZE = 12;

export function articlePath(slug: string): string {
  return `${BLOG_BASE_PATH}/${slug}`;
}

export function categoryPath(slug: string): string {
  return `${BLOG_BASE_PATH}/category/${slug}`;
}

export function tagPath(slug: string): string {
  return `${BLOG_BASE_PATH}/tag/${slug}`;
}

export function absoluteUrl(path: string): string {
  return `${getSiteBaseUrl()}${path}`;
}

export function formatArticleDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function readingTimeLabel(minutes: number): string {
  return minutes > 0 ? `${minutes} min read` : "";
}

/** Page number from a raw search param; anything invalid is page 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 1;
}

/** `/blog/category/x?q=..&page=2`, omitting empty/default params. */
export function listingHref(
  base: string,
  params: { q?: string; page?: number }
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

// ── Contextual calls to action ─────────────────────────────

export interface BlogCtaConfig {
  heading: string;
  body: string;
  href: string;
  label: string;
}

const DEFAULT_CTA: BlogCtaConfig = {
  heading: "Everything campus, in one place",
  body: "Shop from student vendors, find services and discover opportunities near you.",
  href: "/marketplace",
  label: "Explore Kampmax",
};

/** Matches a category slug to the Kampmax feature a reader would most plausibly want next. */
const CTA_BY_CATEGORY: { match: RegExp; cta: BlogCtaConfig }[] = [
  {
    match: /freelanc|skill|tech/,
    cta: {
      heading: "Turn your skills into income",
      body: "Create a freelancer profile and get found by students, vendors and employers on campus.",
      href: "/onboarding/freelancer",
      label: "Become a freelancer",
    },
  },
  {
    match: /business|market|vendor|sell/,
    cta: {
      heading: "Sell to students on your campus",
      body: "Open a Kampmax store and reach thousands of students looking for what you make.",
      href: "/onboarding/vendor",
      label: "Start selling",
    },
  },
  {
    match: /career|opportunit|job|intern/,
    cta: {
      heading: "Find your next opportunity",
      body: "Browse jobs, gigs and internships from employers hiring students.",
      href: "/jobs",
      label: "Browse jobs",
    },
  },
  {
    match: /event|campus|student-life|news/,
    cta: {
      heading: "See what is happening on campus",
      body: "Discover events, get tickets and connect with your campus community.",
      href: "/events",
      label: "Explore events",
    },
  },
];

export function ctaForCategory(categorySlug: string | null | undefined): BlogCtaConfig {
  if (!categorySlug) return DEFAULT_CTA;
  return CTA_BY_CATEGORY.find((c) => c.match.test(categorySlug))?.cta ?? DEFAULT_CTA;
}

// ── Sharing ────────────────────────────────────────────────

export interface ShareTargets {
  whatsapp: string;
  facebook: string;
  x: string;
  linkedin: string;
}

export function shareLinks(url: string, title: string): ShareTargets {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  };
}

// ── Structured data ────────────────────────────────────────

/** Serialises JSON-LD safely for inline <script> use. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function articleJsonLd(article: ArticleDetail) {
  const url = absoluteUrl(articlePath(article.slug));
  const image = article.ogImage ?? article.coverImage;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt || undefined,
    image: image ? [image] : undefined,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt,
    author: { "@type": "Person", name: article.author.name },
    publisher: { "@type": "Organization", name: "Kampmax" },
    mainEntityOfPage: { "@type": "WebPage", "@id": article.canonicalUrl || url },
    articleSection: article.category?.name,
    keywords: article.tags.map((t) => t.name).join(", ") || undefined,
  };
}

export function breadcrumbJsonLd(article: ArticleListItem) {
  const items = [
    { name: "Blog", path: BLOG_BASE_PATH },
    ...(article.category
      ? [{ name: article.category.name, path: categoryPath(article.category.slug) }]
      : []),
    { name: article.title, path: articlePath(article.slug) },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

// ── Images ─────────────────────────────────────────────────

const OPTIMIZABLE_HOSTS = new Set(["images.unsplash.com", "res.cloudinary.com", "localhost"]);

/** True when next/image is configured to optimise this source (see next.config.ts). */
export function isOptimizableImage(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZABLE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}
