// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HomeSearch } from "../HomeSearch";

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

  it("offers popular searches that open Explore already searching", () => {
    render(<HomeSearch />);

    const chip = screen.getByRole("link", { name: "Logo design" });
    expect(chip.getAttribute("href")).toBe("/explore?q=Logo%20design");
  });
});
