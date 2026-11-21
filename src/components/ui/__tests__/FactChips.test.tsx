// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FactChips } from "../FactChips";

afterEach(cleanup);

describe("FactChips", () => {
  it("shows each fact as its own chip", () => {
    render(<FactChips facts={["Replies within 3 hours", "80% answered"]} />);

    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Replies within 3 hours",
      "80% answered",
    ]);
  });

  it("draws nothing at all when there is nothing worth saying yet", () => {
    const { container } = render(<FactChips facts={[]} />);

    expect(container.innerHTML).toBe("");
  });

  it("can wear the positive tone", () => {
    render(<FactChips facts={["80% answered"]} tone="positive" />);

    expect(screen.getByText("80% answered").className).toContain("emerald");
  });
});
