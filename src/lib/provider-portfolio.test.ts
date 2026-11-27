import { describe, expect, it } from "vitest";
import { PORTFOLIO_FULL, portfolioProblems, portfolioSummary, UNVERIFIED_PORTFOLIO_NOTE } from "./provider-portfolio";

describe("provider portfolio", () => {
  it("needs a picture and a title that fits", () => {
    expect(portfolioProblems({ title: "Kitchen deep clean", hasPicture: true })).toEqual({});
    expect(portfolioProblems({ title: " ", hasPicture: false })).toEqual({
      title: "Give this piece of work a title.",
      picture: "Add a picture of the work.",
    });
    expect(portfolioProblems({ title: "x".repeat(151), hasPicture: true }).title).toMatch(/under 150/);
  });

  it("says how many pieces there are and who can see them", () => {
    expect(portfolioSummary(3, true)).toBe("3 of 10 pieces. Customers see these on your page.");
    expect(portfolioSummary(3, false)).toBe(`3 of 10 pieces. ${UNVERIFIED_PORTFOLIO_NOTE}`);
    expect(PORTFOLIO_FULL).toMatch(/full/);
  });
});
