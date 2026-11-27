import { describe, expect, it } from "vitest";
import { barShare, latestNote, REVIEWS_EMPTY } from "./provider-reviews";

describe("provider reviews", () => {
  it("draws a bar as the real share of all reviews", () => {
    expect(barShare(1, 4)).toBe(25);
    expect(barShare(4, 4)).toBe(100);
    expect(barShare(0, 0)).toBe(0);
  });

  it("says when the list holds only the newest reviews", () => {
    expect(latestNote(40, 20)).toBe("Showing the latest 20 of 40 reviews.");
    expect(latestNote(7, 7)).toBeNull();
  });

  it("does not promise an approval step", () => {
    expect(REVIEWS_EMPTY.text).not.toMatch(/approv|publish/i);
  });
});
