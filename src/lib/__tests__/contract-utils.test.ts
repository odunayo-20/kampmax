import { describe, expect, it } from "vitest";
import { getReviewWindowInfo } from "../contract-utils";

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const at = (ms: number) => new Date(NOW + ms).toISOString();
const HOUR = 3_600_000;

describe("getReviewWindowInfo", () => {
  it.each([
    [6.5 * 24 * HOUR, "in 6 days"],
    [24 * HOUR, "in 1 day"],
    [5 * HOUR, "in 5 hours"],
    [HOUR, "in 1 hour"],
    [20 * 60_000, "within the hour"],
    [0, "shortly"],
    [-HOUR, "shortly"],
  ])("describes %s ms away as %s", (offset, expected) => {
    expect(getReviewWindowInfo(at(offset), NOW).relative).toBe(expected);
  });

  it("is urgent only for the final 48 hours", () => {
    expect(getReviewWindowInfo(at(3 * 24 * HOUR), NOW).urgent).toBe(false);
    expect(getReviewWindowInfo(at(48 * HOUR + 1), NOW).urgent).toBe(false);
    expect(getReviewWindowInfo(at(48 * HOUR), NOW).urgent).toBe(true);
    expect(getReviewWindowInfo(at(HOUR), NOW).urgent).toBe(true);
  });

  it("gives an absolute date to show alongside the countdown", () => {
    expect(getReviewWindowInfo(at(2 * 24 * HOUR), NOW).absolute).toMatch(/Nov/);
  });
});
