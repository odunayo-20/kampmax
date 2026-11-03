import { describe, expect, it } from "vitest";
import { describeClearing } from "../wallet-clearing";

// Midday on 3 Nov 2026, in the viewer's own timezone.
const NOW = new Date(2026, 10, 3, 12, 0);
const at = (days: number, hour = 9) => new Date(2026, 10, 3 + days, hour, 0).toISOString();

describe("describeClearing", () => {
  it("has nothing to say when nothing is clearing", () => {
    expect(describeClearing(0, [], NOW)).toBeNull();
    expect(describeClearing(-5, [], NOW)).toBeNull();
  });

  it("says how much is clearing and when the soonest part becomes available", () => {
    expect(describeClearing(300, [{ amount: 100, releaseAt: at(2) }, { amount: 200, releaseAt: at(4) }], NOW)).toMatch(
      /^₦300 clearing · ₦100 available on 5\s+Nov$/
    );
  });

  it("uses the earliest date even when the list is out of order", () => {
    expect(describeClearing(300, [{ amount: 200, releaseAt: at(4) }, { amount: 100, releaseAt: at(1) }], NOW)).toMatch(
      /₦100 available tomorrow/
    );
  });

  it("says today for money clearing later the same day, or already due", () => {
    expect(describeClearing(100, [{ amount: 100, releaseAt: at(0, 18) }], NOW)).toMatch(/available today/);
    expect(describeClearing(100, [{ amount: 100, releaseAt: at(-1) }], NOW)).toMatch(/available today/);
  });

  it("still says how much is clearing when the dates are not known", () => {
    expect(describeClearing(250, undefined, NOW)).toBe("₦250 clearing");
    expect(describeClearing(250, [], NOW)).toBe("₦250 clearing");
  });
});
