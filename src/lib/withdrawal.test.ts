import { describe, expect, it } from "vitest";
import {
  checkWithdrawal,
  describeLookupError,
  describeWithdrawError,
  identityBlock,
  identityPhase,
  maskAccount,
  newIdempotencyKey,
  withdrawDisabledReason,
} from "./withdrawal";

describe("withdrawal", () => {
  it("checks the amount against the minimum, the maximum and the balance", () => {
    expect(checkWithdrawal("", 5000)).toEqual({ ok: false, error: "Enter how much you want to withdraw." });
    expect(checkWithdrawal("12abc", 5000).ok).toBe(false);
    expect(checkWithdrawal("50", 5000)).toEqual({ ok: false, error: "The minimum payout is ₦100." });
    expect(checkWithdrawal("6,000", 5000)).toEqual({ ok: false, error: "You only have ₦5,000 available." });
    expect(checkWithdrawal("6000000", 9_000_000)).toEqual({ ok: false, error: "The most you can withdraw at once is ₦5,000,000." });
    expect(checkWithdrawal("₦1,500.50", 5000)).toEqual({ ok: true, amount: 1500.5 });
    expect(checkWithdrawal("12.345", 5000).ok).toBe(false);
  });

  it("makes a key the server accepts, different each time", () => {
    const key = newIdempotencyKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(newIdempotencyKey(() => 0.1, () => 1)).not.toBe(newIdempotencyKey(() => 0.9, () => 1));
  });

  it("holds the first step until the identity check has passed, and says why", () => {
    expect(identityPhase("KYC_VERIFIED")).toBe("verified");
    expect(identityPhase("KYC_PENDING")).toBe("checking");
    expect(identityPhase("KYC_FAILED")).toBe("failed");
    expect(identityPhase(undefined)).toBe("start");
    expect(identityBlock("verified")).toBeNull();
    expect(identityBlock("start")).toMatch(/Verify your identity once/);
    expect(identityBlock("checking")).toMatch(/checking/);
    expect(identityBlock("failed", "BVN does not match.")).toBe("BVN does not match.");
  });

  it("says why Withdraw is off", () => {
    expect(withdrawDisabledReason(50)).toBe("You need at least ₦100 available to withdraw.");
    expect(withdrawDisabledReason(100)).toBeNull();
    expect(withdrawDisabledReason(undefined)).toBeNull();
    expect(maskAccount("0123456789")).toBe("••••6789");
  });

  it("turns each failure into what the person should do", () => {
    expect(describeWithdrawError({ status: 409 })).toEqual({ kind: "duplicate", message: "This withdrawal was already received." });
    expect(describeWithdrawError({ code: "NETWORK_ERROR" }).kind).toBe("unclear");
    expect(describeWithdrawError({ status: 500, message: "QueryFailedError" }).kind).toBe("unclear");
    expect(describeWithdrawError({ status: 503, message: "We could not check this account right now." }).kind).toBe("refused");
    expect(describeWithdrawError({ status: 429 }).kind).toBe("rate");
    expect(describeWithdrawError({ status: 403, message: "Verify your identity first" }).kind).toBe("needs-identity");
    expect(describeWithdrawError({ status: 400, message: "Amount is below the minimum." }).message).toBe("Amount is below the minimum.");
    expect(describeWithdrawError({ status: 400, message: "x".repeat(300) }).message).toMatch(/wasn't accepted/);
    expect(describeLookupError({ status: 404 })).toMatch(/couldn't find that bank account/);
    expect(describeLookupError({ code: "NETWORK_ERROR" })).toMatch(/couldn't reach the bank/);
  });
});
