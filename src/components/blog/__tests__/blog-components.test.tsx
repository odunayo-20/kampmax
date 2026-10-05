// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ArticleListItem, BlogCategoryItem } from "@/types/blog";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

import { ArticleCard } from "../ArticleCard";
import { ArticleGrid } from "../ArticleGrid";
import { BlogCTA } from "../BlogCTA";
import { BlogEmptyState, BlogErrorState } from "../BlogStates";
import { BlogPagination } from "../BlogPagination";
import { BlogSearch } from "../BlogSearch";
import { CategoryNav } from "../CategoryNav";
import { ShareButtons } from "../ShareButtons";
import { TagList } from "../TagList";

afterEach(cleanup);

const article = (over: Partial<ArticleListItem> = {}): ArticleListItem => ({
  id: "a1",
  title: "How to win scholarships",
  slug: "how-to-win-scholarships",
  excerpt: "Practical steps for students.",
  coverImage: null,
  author: { id: "u1", name: "Ada Obi", avatar: null },
  category: { id: "c1", name: "Career", slug: "career" },
  tags: [],
  status: "PUBLISHED",
  isFeatured: false,
  publishedAt: "2026-03-01T10:00:00.000Z",
  readingTimeMinutes: 4,
  viewCount: 0,
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-01T09:00:00.000Z",
  ...over,
});

describe("ArticleCard", () => {
  it("links the title to the article and the category to its page", () => {
    render(<ArticleCard article={article()} />);
    expect(screen.getByRole("link", { name: "How to win scholarships" }).getAttribute("href")).toBe("/blog/how-to-win-scholarships");
    expect(screen.getByRole("link", { name: "Career" }).getAttribute("href")).toBe("/blog/category/career");
    expect(screen.getByText(/4 min read/)).toBeTruthy();
    expect(screen.getByText("Practical steps for students.")).toBeTruthy();
  });

  it("renders a placeholder (not a broken image) when there is no cover", () => {
    const { container } = render(<ArticleCard article={article({ coverImage: null })} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("uses a decorative empty alt for the cover so screen readers do not read the title twice", () => {
    const { container } = render(<ArticleCard article={article({ coverImage: "https://res.cloudinary.com/x/c.jpg" })} />);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("shows an optional badge", () => {
    render(<ArticleCard article={article()} badge="Popular" />);
    expect(screen.getByText("Popular")).toBeTruthy();
  });
});

describe("ArticleGrid", () => {
  it("renders one list item per article", () => {
    render(<ArticleGrid articles={[article({ id: "1" }), article({ id: "2", slug: "two", title: "Second" })]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("CategoryNav", () => {
  const categories: BlogCategoryItem[] = [
    { id: "1", name: "Career", slug: "career", description: null, isActive: true, sortOrder: 0, articleCount: 3 },
    { id: "2", name: "Business", slug: "business", description: null, isActive: true, sortOrder: 1, articleCount: 2 },
  ];

  it("lists categories from data and marks the active one", () => {
    render(<CategoryNav categories={categories} activeSlug="business" />);
    expect(screen.getByRole("link", { name: "Business" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Career" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "All" }).getAttribute("href")).toBe("/blog");
  });

  it("marks All as current when no category is active", () => {
    render(<CategoryNav categories={categories} />);
    expect(screen.getByRole("link", { name: "All" }).getAttribute("aria-current")).toBe("page");
  });

  it("renders nothing without categories", () => {
    const { container } = render(<CategoryNav categories={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("BlogSearch", () => {
  it("is a labelled GET form to /blog with a q field", () => {
    const { container } = render(<BlogSearch defaultValue="jobs" />);
    const form = container.querySelector("form")!;
    expect(form.getAttribute("action")).toBe("/blog");
    expect(form.getAttribute("method")).toBe("get");
    const input = screen.getByLabelText("Search articles") as HTMLInputElement;
    expect(input.name).toBe("q");
    expect(input.value).toBe("jobs");
  });
});

describe("BlogPagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<BlogPagination page={1} totalPages={1} basePath="/blog" />);
    expect(container.firstChild).toBeNull();
  });

  it("links to neighbouring pages and keeps the search term", () => {
    render(<BlogPagination page={2} totalPages={3} basePath="/blog" q="jobs" />);
    expect(screen.getByRole("link", { name: /previous/i }).getAttribute("href")).toBe("/blog?q=jobs");
    expect(screen.getByRole("link", { name: /next/i }).getAttribute("href")).toBe("/blog?q=jobs&page=3");
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  });

  it("has no Previous link on the first page", () => {
    render(<BlogPagination page={1} totalPages={3} basePath="/blog/category/career" />);
    expect(screen.queryByRole("link", { name: /previous/i })).toBeNull();
    expect(screen.getByRole("link", { name: /next/i }).getAttribute("href")).toBe("/blog/category/career?page=2");
  });
});

describe("TagList", () => {
  it("links each tag to its page and renders nothing when empty", () => {
    const { rerender, container } = render(<TagList tags={[{ id: "t", name: "Scholarships", slug: "scholarships" }]} />);
    expect(screen.getByRole("link", { name: "#Scholarships" }).getAttribute("href")).toBe("/blog/tag/scholarships");
    rerender(<TagList tags={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("BlogCTA", () => {
  it("points readers of a freelancing article at freelancer onboarding", () => {
    render(<BlogCTA categorySlug="freelancing" />);
    expect(screen.getByRole("link", { name: /become a freelancer/i }).getAttribute("href")).toBe("/onboarding/freelancer");
  });
  it("falls back to a general next step", () => {
    render(<BlogCTA />);
    expect(screen.getByRole("link", { name: /explore kampmax/i }).getAttribute("href")).toBe("/marketplace");
  });
});

describe("States", () => {
  it("empty state offers a way out", () => {
    render(<BlogEmptyState message="No articles in this category yet." />);
    expect(screen.getByText("No articles in this category yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /browse all articles/i }).getAttribute("href")).toBe("/blog");
  });

  it("empty search state offers to clear the search", () => {
    render(<BlogEmptyState message="Nothing matched." clearHref="/blog" />);
    expect(screen.getByRole("link", { name: /clear search/i })).toBeTruthy();
  });

  it("error state exposes a retry action and announces itself", () => {
    const retry = vi.fn();
    render(<BlogErrorState onRetry={retry} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("ShareButtons", () => {
  const props = { url: "https://kampmax.example/blog/a", title: "A title" };

  it("renders safe external links for each network", () => {
    render(<ShareButtons {...props} />);
    for (const name of ["WhatsApp", "Facebook", "X", "LinkedIn"]) {
      const link = screen.getByRole("link", { name });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });

  it("copies the link and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareButtons {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/copied/i));
    expect(writeText).toHaveBeenCalledWith(props.url);
  });

  it("reports a failed copy instead of failing silently", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<ShareButtons {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/could not copy/i));
  });
});
