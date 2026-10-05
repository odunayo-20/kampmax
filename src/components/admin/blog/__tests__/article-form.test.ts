import { describe, expect, it } from "vitest";
import { EMPTY_FORM, isDirty, publishBlockers, toInput, validateForm, withTitle } from "../article-form";
import { fromLocalInputValue, slugifyTitle, toLocalInputValue } from "../blog-meta";

describe("slug generation", () => {
  it("auto-generates the slug from the title for new articles", () => {
    const form = withTitle(EMPTY_FORM, "How to Win Scholarships in Nigeria!", true);
    expect(form.slug).toBe("how-to-win-scholarships-in-nigeria");
  });

  it("stops following the title once the slug was edited by hand", () => {
    const edited = { ...EMPTY_FORM, slug: "custom", slugTouched: true };
    expect(withTitle(edited, "Another title", true).slug).toBe("custom");
  });

  it("never rewrites the slug of an existing article when the title changes", () => {
    const existing = { ...EMPTY_FORM, slug: "keep-me", slugTouched: true };
    expect(withTitle(existing, "Changed", false).slug).toBe("keep-me");
  });

  it("slugifyTitle strips symbols and edge hyphens", () => {
    expect(slugifyTitle("  --Hello, World!--  ")).toBe("hello-world");
  });
});

describe("toInput", () => {
  const filled = { ...EMPTY_FORM, title: " My title ", content: "Body", categoryId: "cat-1", tagIds: ["t1"] };

  it("omits the slug on create unless one was typed", () => {
    expect(toInput({ ...filled, slug: "auto" }, { isNew: true })).not.toHaveProperty("slug");
    expect(toInput({ ...filled, slug: "typed", slugTouched: true }, { isNew: true }).slug).toBe("typed");
  });

  it("only sends a changed slug on update", () => {
    expect(toInput({ ...filled, slug: "same" }, { isNew: false, originalSlug: "same" })).not.toHaveProperty("slug");
    expect(toInput({ ...filled, slug: "new" }, { isNew: false, originalSlug: "old" }).slug).toBe("new");
  });

  it("sends nulls for emptied optional fields so they can be cleared", () => {
    const input = toInput(filled, { isNew: false, originalSlug: "x" });
    expect(input.title).toBe("My title");
    expect(input.excerpt).toBeNull();
    expect(input.seoTitle).toBeNull();
    expect(input.canonicalUrl).toBeNull();
    expect(input.categoryId).toBe("cat-1");
  });
});

describe("validateForm", () => {
  it("accepts a valid form", () => {
    expect(validateForm({ ...EMPTY_FORM, title: "Valid title", slug: "valid-title" })).toEqual({});
  });

  it("flags a short title, bad slug, long fields and a bad canonical URL", () => {
    const errors = validateForm({
      ...EMPTY_FORM,
      title: "Hi",
      slug: "Bad Slug",
      seoTitle: "x".repeat(161),
      canonicalUrl: "javascript:alert(1)",
    });
    expect(Object.keys(errors).sort()).toEqual(["canonicalUrl", "seoTitle", "slug", "title"]);
  });
});

describe("publishBlockers", () => {
  it("lists everything missing", () => {
    expect(publishBlockers(EMPTY_FORM)).toEqual(["a title", "article content", "a category"]);
  });
  it("is empty when ready", () => {
    expect(publishBlockers({ ...EMPTY_FORM, title: "Ready", content: "Body", categoryId: "c" })).toEqual([]);
  });
});

describe("isDirty", () => {
  it("ignores slugTouched and detects real edits", () => {
    const base = { ...EMPTY_FORM, title: "A" };
    expect(isDirty({ ...base, slugTouched: true }, base)).toBe(false);
    expect(isDirty({ ...base, excerpt: "changed" }, base)).toBe(true);
  });
});

describe("datetime-local helpers", () => {
  it("round-trips an ISO date at minute precision", () => {
    const iso = "2026-03-14T09:30:00.000Z";
    expect(fromLocalInputValue(toLocalInputValue(iso))).toBe(iso);
  });
  it("returns null for empty or invalid input", () => {
    expect(fromLocalInputValue("")).toBeNull();
    expect(fromLocalInputValue("not-a-date")).toBeNull();
    expect(toLocalInputValue(null)).toBe("");
  });
});

describe("image alt text", () => {
  const ready = { ...EMPTY_FORM, title: "Ready", categoryId: "c" };

  it("counts images with empty or placeholder alt", async () => {
    const { countImagesMissingAlt } = await import("../markdown-actions");
    expect(countImagesMissingAlt("![](a.png) ![Describe the image](b.png) ![A real description](c.png)")).toBe(2);
    expect(countImagesMissingAlt("no images, [a link](x)")).toBe(0);
  });

  it("blocks publishing until every image has alt text", () => {
    expect(publishBlockers({ ...ready, content: "![](https://x/a.png)" })).toEqual(["alt text for 1 image"]);
    expect(publishBlockers({ ...ready, content: "![Students at OAU](https://x/a.png)" })).toEqual([]);
  });
});
