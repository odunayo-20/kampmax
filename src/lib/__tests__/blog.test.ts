import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  ctaForCategory,
  isOptimizableImage,
  jsonLdString,
  listingHref,
  parsePage,
  shareLinks,
} from "@/lib/blog";
import type { ArticleDetail } from "@/types/blog";

const article: ArticleDetail = {
  id: "1",
  title: "How to win scholarships",
  slug: "how-to-win-scholarships",
  excerpt: "Practical steps.",
  coverImage: "https://res.cloudinary.com/x/cover.jpg",
  author: { id: "u1", name: "Ada Obi", avatar: null },
  category: { id: "c1", name: "Career", slug: "career" },
  tags: [{ id: "t1", name: "Scholarships", slug: "scholarships" }],
  status: "PUBLISHED",
  isFeatured: false,
  publishedAt: "2026-03-01T10:00:00.000Z",
  readingTimeMinutes: 4,
  viewCount: 0,
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-02T09:00:00.000Z",
  contentHtml: "<p>Hi</p>",
  ogImage: null,
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
  related: [],
};

describe("parsePage", () => {
  it("defaults to 1 for missing or invalid values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
  });
  it("accepts positive integers, using the first of repeated params, and caps runaway values", () => {
    expect(parsePage("4")).toBe(4);
    expect(parsePage(["2", "9"])).toBe(2);
    expect(parsePage("999999")).toBe(1000);
  });
});

describe("listingHref", () => {
  it("omits default and empty params", () => {
    expect(listingHref("/blog", {})).toBe("/blog");
    expect(listingHref("/blog", { page: 1 })).toBe("/blog");
  });
  it("encodes the query and page", () => {
    expect(listingHref("/blog", { q: "jobs & gigs", page: 3 })).toBe("/blog?q=jobs+%26+gigs&page=3");
  });
});

describe("ctaForCategory", () => {
  it("routes freelancing/skills readers to freelancer onboarding", () => {
    expect(ctaForCategory("freelancing").href).toBe("/onboarding/freelancer");
    expect(ctaForCategory("skills").href).toBe("/onboarding/freelancer");
  });
  it("routes business/marketplace readers to vendor onboarding", () => {
    expect(ctaForCategory("business").href).toBe("/onboarding/vendor");
    expect(ctaForCategory("marketplace").href).toBe("/onboarding/vendor");
  });
  it("routes career/opportunity readers to jobs, and event/campus readers to events", () => {
    expect(ctaForCategory("career").href).toBe("/jobs");
    expect(ctaForCategory("opportunities").href).toBe("/jobs");
    expect(ctaForCategory("events").href).toBe("/events");
  });
  it("falls back to a generic CTA for new or missing categories", () => {
    expect(ctaForCategory("brand-new-category").href).toBe("/marketplace");
    expect(ctaForCategory(null).href).toBe("/marketplace");
  });
});

describe("shareLinks", () => {
  it("encodes the URL and title for every network", () => {
    const links = shareLinks("https://kampmax.example/blog/a b", "Win & Learn");
    expect(links.whatsapp).toContain("wa.me/?text=Win%20%26%20Learn%20https%3A%2F%2Fkampmax.example%2Fblog%2Fa%20b");
    expect(links.facebook).toContain("u=https%3A%2F%2Fkampmax.example%2Fblog%2Fa%20b");
    expect(links.x).toContain("text=Win%20%26%20Learn");
    expect(links.linkedin).toContain("share-offsite/?url=");
  });
});

describe("structured data", () => {
  it("builds Article JSON-LD from the article", () => {
    const ld = articleJsonLd(article);
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("How to win scholarships");
    expect(ld.author.name).toBe("Ada Obi");
    expect(ld.keywords).toBe("Scholarships");
    expect(ld.datePublished).toBe("2026-03-01T10:00:00.000Z");
  });

  it("prefers the SEO overrides", () => {
    const ld = articleJsonLd({ ...article, seoTitle: "Custom", seoDescription: "Desc", canonicalUrl: "https://x.test/a" });
    expect(ld.headline).toBe("Custom");
    expect(ld.description).toBe("Desc");
    expect(ld.mainEntityOfPage["@id"]).toBe("https://x.test/a");
  });

  it("builds breadcrumbs Blog > Category > Article", () => {
    const names = breadcrumbJsonLd(article).itemListElement.map((i) => i.name);
    expect(names).toEqual(["Blog", "Career", "How to win scholarships"]);
  });

  it("escapes < so JSON-LD cannot break out of its script tag", () => {
    expect(jsonLdString({ name: "</script><script>alert(1)" })).not.toContain("</script>");
  });
});

describe("isOptimizableImage", () => {
  it("allows configured hosts and site paths only", () => {
    expect(isOptimizableImage("https://res.cloudinary.com/a.jpg")).toBe(true);
    expect(isOptimizableImage("/uploads/a.jpg")).toBe(true);
    expect(isOptimizableImage("https://random.example/a.jpg")).toBe(false);
    expect(isOptimizableImage("not a url")).toBe(false);
  });
});
