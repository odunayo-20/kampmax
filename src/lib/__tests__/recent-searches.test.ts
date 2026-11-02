// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../recent-searches";

beforeEach(() => localStorage.clear());

describe("recent searches", () => {
  it("keeps the newest first, without repeats", () => {
    addRecentSearch("logo");
    addRecentSearch("laptop");
    addRecentSearch("logo");

    expect(getRecentSearches()).toEqual(["logo", "laptop"]);
  });

  it("ignores empty searches and trims the rest", () => {
    addRecentSearch("   ");
    addRecentSearch("  logo ");

    expect(getRecentSearches()).toEqual(["logo"]);
  });

  it("remembers only the ten latest", () => {
    for (let i = 1; i <= 12; i++) addRecentSearch(`search ${i}`);

    const searches = getRecentSearches();
    expect(searches).toHaveLength(10);
    expect(searches[0]).toBe("search 12");
  });

  it("can forget one search, or all of them", () => {
    addRecentSearch("a1");
    addRecentSearch("b2");

    removeRecentSearch("a1");
    expect(getRecentSearches()).toEqual(["b2"]);

    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });

  it("copes with damaged or unexpected stored data", () => {
    localStorage.setItem("kampmax_recent_searches", "not json");
    expect(getRecentSearches()).toEqual([]);

    localStorage.setItem("kampmax_recent_searches", JSON.stringify({ not: "a list" }));
    expect(getRecentSearches()).toEqual([]);

    localStorage.setItem("kampmax_recent_searches", JSON.stringify(["ok", 7, null]));
    expect(getRecentSearches()).toEqual(["ok"]);
  });
});
