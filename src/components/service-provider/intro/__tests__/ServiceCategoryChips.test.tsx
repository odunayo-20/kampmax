// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const taxonomy: { data?: unknown[]; isPending: boolean; isError: boolean } = {
  data: [],
  isPending: false,
  isError: false,
};
vi.mock("@/hooks/use-taxonomy", () => ({ useCategoryTree: () => taxonomy }));

import { ServiceCategoryChips } from "../ServiceCategoryChips";

afterEach(cleanup);

describe("ServiceCategoryChips", () => {
  it("lists the real categories", () => {
    taxonomy.isPending = false;
    taxonomy.isError = false;
    taxonomy.data = [
      { id: "1", name: "Tech & IT", icon: "💻", children: [] },
      { id: "2", name: "Tutoring", icon: null, children: [] },
    ];
    render(<ServiceCategoryChips />);

    expect(screen.getByText("Tech & IT")).toBeTruthy();
    expect(screen.getByText("Tutoring")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /what can you offer/i })).toBeTruthy();
  });

  it("holds the space with placeholders while loading", () => {
    taxonomy.isPending = true;
    taxonomy.isError = false;
    taxonomy.data = undefined;
    render(<ServiceCategoryChips />);

    expect(screen.getByRole("status", { name: /loading categories/i })).toBeTruthy();
  });

  it("is left out entirely when the categories can't be loaded", () => {
    taxonomy.isPending = false;
    taxonomy.isError = true;
    taxonomy.data = undefined;
    const { container } = render(<ServiceCategoryChips />);

    expect(container.innerHTML).toBe("");
  });

  it("is left out entirely when there are no categories", () => {
    taxonomy.isPending = false;
    taxonomy.isError = false;
    taxonomy.data = [];
    const { container } = render(<ServiceCategoryChips />);

    expect(container.innerHTML).toBe("");
  });
});
