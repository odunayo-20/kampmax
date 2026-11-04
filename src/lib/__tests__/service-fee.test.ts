import { describe, expect, it } from "vitest";
import { describeFeeTerms, describeNet, describeReceived, formatFeeRate, splitServiceFee } from "../service-fee";

const ten = { rate: 10, minimum: 0 };

describe("splitServiceFee", () => {
  it("takes the rate off the payment, and the freelancer keeps the rest", () => {
    expect(splitServiceFee(50000, ten)).toEqual({ fee: 5000, net: 45000 });
  });

  it("charges nothing without a rate, whatever the minimum says", () => {
    expect(splitServiceFee(50000, { rate: 0, minimum: 500 })).toEqual({ fee: 0, net: 50000 });
  });

  it("charges the minimum on a payment too small for the rate to reach it", () => {
    expect(splitServiceFee(1000, { rate: 10, minimum: 150 })).toEqual({ fee: 150, net: 850 });
  });

  it("never takes more than the payment itself", () => {
    expect(splitServiceFee(80, { rate: 10, minimum: 500 })).toEqual({ fee: 80, net: 0 });
  });

  it("charges nothing on nothing, or on a number that is not a payment", () => {
    expect(splitServiceFee(0, ten)).toEqual({ fee: 0, net: 0 });
    expect(splitServiceFee(NaN, ten).fee).toBe(0);
  });

  // The same cases the backend's own tests pin down: the preview must agree with what is taken.
  it("rounds half up to the kobo, exactly as the server does", () => {
    expect(splitServiceFee(0.05, ten)).toEqual({ fee: 0.01, net: 0.04 });
    expect(splitServiceFee(33.33, { rate: 7.5, minimum: 0 })).toEqual({ fee: 2.5, net: 30.83 });
  });

  it("always adds back up to exactly what was paid", () => {
    for (const paid of [0.01, 1.99, 33.33, 100.07, 12345.67, 999999.99]) {
      for (const rate of [0.5, 2.5, 7.5, 10, 12.34, 30]) {
        const { fee, net } = splitServiceFee(paid, { rate, minimum: 0.5 });
        expect(Math.round(fee * 100) + Math.round(net * 100)).toBe(Math.round(paid * 100));
      }
    }
  });
});

describe("wording", () => {
  it("writes a rate without trailing zeros", () => {
    expect(formatFeeRate(10)).toBe("10%");
    expect(formatFeeRate(7.5)).toBe("7.5%");
    expect(formatFeeRate(12.34)).toBe("12.34%");
  });

  it("says what the freelancer receives, and nothing when there is no fee or no price", () => {
    expect(describeNet(50000, ten)).toBe("₦45,000 after the ₦5,000 service fee");
    expect(describeNet(50000, { rate: 0, minimum: 0 })).toBeNull();
    expect(describeNet(undefined, ten)).toBeNull();
    expect(describeNet(0, ten)).toBeNull();
  });

  it("explains the rule, mentioning the minimum only when there is one", () => {
    expect(describeFeeTerms({ rate: 10, minimum: 100 })).toContain("10% of each payment, at least ₦100 a payment");
    expect(describeFeeTerms(ten)).not.toContain("at least");
    expect(describeFeeTerms({ rate: 0, minimum: 100 })).toBeNull();
  });

  it("says what a paid milestone came to, and nothing when no fee was taken", () => {
    expect(describeReceived(50000, 5000)).toBe("₦45,000 received after the ₦5,000 service fee");
    expect(describeReceived(50000, 0)).toBeNull();
    expect(describeReceived(50000, null)).toBeNull();
  });
});
