import { describe, expect, it } from "vitest";
import { RELOCK_AFTER_MS, shouldRelock } from "@/lib/device-lock";

describe("shouldRelock", () => {
  it("does not lock when the page never left", () => {
    expect(shouldRelock(null, 1_000_000)).toBe(false);
  });
  it("stays open for a short trip away", () => {
    expect(shouldRelock(1_000, 1_000 + RELOCK_AFTER_MS)).toBe(false);
  });
  it("locks after a long one", () => {
    expect(shouldRelock(1_000, 1_001 + RELOCK_AFTER_MS)).toBe(true);
  });
});
