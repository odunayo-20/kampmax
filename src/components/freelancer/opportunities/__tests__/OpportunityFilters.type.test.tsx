// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/taxonomy", () => ({
  TaxonomySelect: () => <select aria-label="category" />,
}));

import { OpportunityFilters, type OpportunityFilterValues } from "../OpportunityFilters";

afterEach(cleanup);

const values = (over: Partial<OpportunityFilterValues> = {}): OpportunityFilterValues => ({
  search: "",
  categoryId: "",
  experience: "",
  arrangement: "",
  sort: "newest",
  ...over,
});

const show = (v: OpportunityFilterValues, onTypeChange?: (t: string) => void) => {
  const noop = vi.fn();
  render(
    <OpportunityFilters
      values={v}
      onSearchChange={noop}
      onCategoryChange={noop}
      onExperienceChange={noop}
      onArrangementChange={noop}
      onSortChange={noop}
      onTypeChange={onTypeChange as never}
      onReset={noop}
    />
  );
};

describe("OpportunityFilters: kind of posting", () => {
  it("offers every kind, with All chosen by default", () => {
    show(values(), vi.fn());
    const labels = screen.getAllByRole("radio").map((r) => r.textContent);
    expect(labels).toEqual(["All", "Gigs", "Internships", "Full-time", "Part-time", "Contract"]);
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
  });

  it("marks the chosen kind", () => {
    show(values({ type: "internship" }), vi.fn());
    expect(screen.getByRole("radio", { name: "Internships" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("false");
  });

  it("reports the kind that was picked, and an empty one for All", () => {
    const onTypeChange = vi.fn();
    show(values({ type: "internship" }), onTypeChange);

    fireEvent.click(screen.getByRole("radio", { name: "Full-time" }));
    expect(onTypeChange).toHaveBeenLastCalledWith("full_time");

    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(onTypeChange).toHaveBeenLastCalledWith("");
  });

  it("is not shown where no one asked for it (the freelancer's gig-only Find Work)", () => {
    show(values());
    expect(screen.queryByRole("radiogroup", { name: "Kind of posting" })).toBeNull();
  });

  it("counts a chosen kind among the active filters", () => {
    show(values({ type: "internship", categoryId: "c1" }), vi.fn());
    expect(screen.getByRole("button", { name: /Filters/ }).textContent).toContain("2");
  });

  it("does not count the kind when the filter is not shown", () => {
    show(values({ type: "internship" }));
    expect(screen.getByRole("button", { name: /Filters/ }).textContent).not.toMatch(/\d/);
  });
});
