// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_JOB_FILTERS, JobFilters, type JobFilterState } from "../JobFilters";
import { OpportunityTypeBadge } from "@/components/employer/jobs/OpportunityTypeBadge";

afterEach(cleanup);

const show = (filters: JobFilterState = DEFAULT_JOB_FILTERS) => {
  const onChange = vi.fn();
  render(<JobFilters filters={filters} counts={null} facets={null} onChange={onChange} />);
  return { onChange };
};

describe("admin job filters: kind of posting", () => {
  it("is off by default", () => {
    expect(DEFAULT_JOB_FILTERS.opportunityType).toBe("all");
  });

  it("offers every kind of posting", () => {
    show();
    const select = screen.getByLabelText("Filter by type") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      "Any type",
      "Gig",
      "Internship",
      "Full-time",
      "Part-time",
      "Contract",
    ]);
  });

  it("reports the kind that was picked", () => {
    const { onChange } = show();
    fireEvent.change(screen.getByLabelText("Filter by type"), { target: { value: "internship" } });
    expect(onChange).toHaveBeenCalledWith({ opportunityType: "internship" });
  });

  it("offers to clear once a kind is chosen, and clearing puts it back to any", () => {
    const { onChange } = show({ ...DEFAULT_JOB_FILTERS, opportunityType: "full_time" });
    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ opportunityType: "all" }));
  });

  it("does not offer to clear when nothing is filtered", () => {
    show();
    expect(screen.queryByRole("button", { name: /Clear/ })).toBeNull();
  });
});

describe("OpportunityTypeBadge", () => {
  it("names each kind of posting", () => {
    for (const [type, label] of [
      ["gig", "Gig"],
      ["internship", "Internship"],
      ["full_time", "Full-time"],
      ["part_time", "Part-time"],
      ["contract", "Contract"],
    ] as const) {
      const { unmount } = render(<OpportunityTypeBadge type={type} />);
      expect(screen.getByText(label)).toBeTruthy();
      unmount();
    }
  });
});
