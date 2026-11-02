// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { addRecentSearch, getRecentSearches } from "@/lib/recent-searches";
import { HomeSearch } from "../HomeSearch";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("HomeSearch", () => {
  it("is a real search that sends the typed words to Explore", () => {
    render(<HomeSearch />);

    const input = screen.getByLabelText("Search Kampmax") as HTMLInputElement;
    const form = input.closest("form")!;
    expect(form.getAttribute("action")).toBe("/explore");
    expect(form.method).toBe("get");
    expect(input.name).toBe("q");
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });

  it("offers popular searches to a newcomer, each opening Explore already searching", () => {
    render(<HomeSearch />);

    const chip = screen.getByRole("link", { name: "Logo design" });
    expect(chip.getAttribute("href")).toBe("/explore?q=Logo%20design");
    expect(screen.getByRole("list", { name: "Popular searches" })).toBeTruthy();
  });

  it("remembers what was searched, once the form is submitted", () => {
    render(<HomeSearch />);

    fireEvent.change(screen.getByLabelText("Search Kampmax"), { target: { value: "  wig braiding " } });
    fireEvent.submit(screen.getByRole("search"));

    expect(getRecentSearches()).toEqual(["wig braiding"]);
  });

  it("offers the person's own recent searches instead of the generic ones", () => {
    addRecentSearch("ankara fabric");
    render(<HomeSearch />);

    expect(screen.getByRole("list", { name: "Your recent searches" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ankara fabric" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Logo design" })).toBeNull();
  });

  it("clears the recent searches on request, going back to the popular ones", () => {
    addRecentSearch("ankara fabric");
    render(<HomeSearch />);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(getRecentSearches()).toEqual([]);
    expect(screen.getByRole("link", { name: "Logo design" })).toBeTruthy();
  });
});
