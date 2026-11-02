import { describe, expect, it } from "vitest";
import { browseHref, parseFilters, showCategory, subtreeCount } from "../filters";

const tree = {
  id: "design",
  children: [
    { id: "logo", children: [] },
    { id: "ui", children: [] },
  ],
};

describe("category counts", () => {
  const counts = { design: 1, logo: 2 };

  it("adds a category's own services to those of its sub-categories", () => {
    expect(subtreeCount(tree, counts)).toBe(3);
    expect(subtreeCount(tree.children[1], counts)).toBe(0);
  });

  it("hides empty categories, but never the one you're in", () => {
    expect(showCategory(tree.children[0], counts, [])).toBe(true);
    expect(showCategory(tree.children[1], counts, [])).toBe(false);
    expect(showCategory(tree.children[1], counts, ["ui"])).toBe(true);
  });

  it("lists everything when counts are unavailable", () => {
    expect(showCategory(tree.children[1], null, [])).toBe(true);
  });
});

describe("parseFilters", () => {
  it("defaults to everything, newest first, page 1", () => {
    expect(parseFilters({})).toEqual({ q: "", category: "", pricing: "", sort: "newest", page: 1 });
  });

  it("ignores values it does not know", () => {
    const f = parseFilters({ sort: "random", pricing: "free", page: "-4" });
    expect(f).toMatchObject({ sort: "newest", pricing: "", page: 1 });
  });

  it("reads valid values and trims the search", () => {
    const f = parseFilters({ q: "  logo ", category: "design", pricing: "hourly", sort: "price_asc", page: "3" });
    expect(f).toEqual({ q: "logo", category: "design", pricing: "hourly", sort: "price_asc", page: 3 });
  });
});

describe("browseHref", () => {
  const base = parseFilters({ q: "logo", category: "design", page: "3" });

  it("keeps the other filters and goes back to page 1", () => {
    expect(browseHref(base, { pricing: "hourly" })).toBe(
      "/freelancers/services?q=logo&category=design&pricing=hourly"
    );
  });

  it("drops a filter that is cleared", () => {
    expect(browseHref(base, { category: "" })).toBe("/freelancers/services?q=logo");
  });

  it("can move between pages", () => {
    expect(browseHref(base, { page: 4 })).toContain("page=4");
  });

  it("is the plain page when nothing is set", () => {
    expect(browseHref(parseFilters({}))).toBe("/freelancers/services");
  });
});
