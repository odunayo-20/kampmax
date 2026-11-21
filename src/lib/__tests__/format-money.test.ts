import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/utils";

describe("formatMoney", () => {
  it("writes naira by default, with no kobo", () => {
    expect(formatMoney(450000)).toBe("₦450,000");
  });

  it("writes another currency in its own symbol", () => {
    expect(formatMoney(2500, "USD")).toContain("2,500");
    expect(formatMoney(2500, "USD")).not.toContain("₦");
  });
});
