import { describe, expect, it } from "vitest";
import { contractMoneyTimeline, orderMoneyTimeline } from "../money-steps";

const order = (over: Record<string, unknown> = {}) =>
  ({ status: "confirmed", total: 12500, dispute: undefined, settled: false, ...over }) as Parameters<typeof orderMoneyTimeline>[0];

const states = (m: ReturnType<typeof orderMoneyTimeline>) => m.steps.map((s) => s.state);

describe("orderMoneyTimeline", () => {
  it("says nothing has moved before payment, and promises no hidden fees", () => {
    const m = orderMoneyTimeline(order({ status: "placed" }));
    expect(m.headline).toMatch(/haven't paid/i);
    expect(m.steps[0].state).toBe("current");
    expect(m.steps[0].detail).toMatch(/no extra fees/i);
    expect(m.steps[0].detail).toContain("12,500");
  });

  it("says the money is held (vendor not paid) once paid", () => {
    const m = orderMoneyTimeline(order({ status: "preparing" }));
    expect(m.headline).toMatch(/held safely/i);
    expect(m.headline).toMatch(/not paid/i);
    expect(states(m)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("explains that confirming receipt is what pays the vendor", () => {
    const m = orderMoneyTimeline(order({ status: "out_for_delivery" }));
    expect(m.steps.find((s) => s.id === "confirm")?.detail).toMatch(/vendor is paid/i);
    expect(m.steps.find((s) => s.id === "handover")?.state).toBe("current");
  });

  it("only says the vendor was paid when the server says it settled", () => {
    const delivered = orderMoneyTimeline(order({ status: "delivered", settled: false }));
    expect(delivered.headline).toMatch(/confirm receipt|still held/i);
    expect(states(delivered)).not.toContain("blocked");
    const settled = orderMoneyTimeline(order({ status: "delivered", settled: true }));
    expect(settled.headline).toMatch(/vendor has been paid/i);
    expect(states(settled).every((s) => s === "done")).toBe(true);
  });

  it("freezes the payout step while a dispute is open", () => {
    const m = orderMoneyTimeline(
      order({ status: "delivered", dispute: { openedAt: "2026-11-01T00:00:00Z", reason: "x" } })
    );
    expect(m.headline).toMatch(/not been paid/i);
    expect(m.steps.find((s) => s.state === "blocked")?.title).toMatch(/payout on hold/i);
    expect(m.steps.at(-1)?.state).toBe("upcoming");
  });

  it("does not promise a refund for a cancelled order, only where to look", () => {
    const m = orderMoneyTimeline(order({ status: "cancelled" }));
    expect(m.steps).toHaveLength(1);
    expect(m.steps[0].detail).toMatch(/if you had already paid/i);
    expect(m.steps[0].detail).toMatch(/contact support/i);
  });
});

const contract = (over: Record<string, unknown> = {}) =>
  ({
    status: "IN_PROGRESS",
    agreedAmount: 80000,
    paymentType: "FIXED",
    feeRate: 10,
    autoReleaseAt: null,
    milestones: [],
    currentMilestonePosition: 1,
    ...over,
  }) as Parameters<typeof contractMoneyTimeline>[0];

describe("contractMoneyTimeline", () => {
  it("tells an employer nothing is charged until they fund", () => {
    const m = contractMoneyTimeline(contract({ status: "PENDING_PAYMENT" }), "employer");
    expect(m.headline).toMatch(/nothing has been charged/i);
  });

  it("tells a freelancer not to start before funding", () => {
    const m = contractMoneyTimeline(contract({ status: "PENDING_PAYMENT" }), "freelancer");
    expect(m.headline).toMatch(/don't start until it's funded/i);
  });

  it("shows the freelancer the service fee before they commit, and never charges the employer extra", () => {
    const f = contractMoneyTimeline(contract(), "freelancer");
    expect(f.steps.find((s) => s.id === "release")?.detail).toContain("10%");
    const e = contractMoneyTimeline(contract(), "employer");
    expect(e.steps.find((s) => s.id === "release")?.detail).toMatch(/never charged a service fee on top/i);
  });

  it("says no fee is charged when the contract has none", () => {
    const f = contractMoneyTimeline(contract({ feeRate: null }), "freelancer");
    expect(f.steps.find((s) => s.id === "release")?.detail).toMatch(/no service fee/i);
  });

  it("states the auto-release date during review", () => {
    const m = contractMoneyTimeline(
      contract({ status: "SUBMITTED", autoReleaseAt: "2026-12-20T00:00:00Z" }),
      "employer"
    );
    expect(m.steps.find((s) => s.id === "review")?.state).toBe("current");
    expect(m.steps.find((s) => s.id === "review")?.detail).toMatch(/automatically on/i);
  });

  it("keeps money in escrow and blocks the review step during a dispute", () => {
    const m = contractMoneyTimeline(contract({ status: "DISPUTED" }), "freelancer");
    expect(m.headline).toMatch(/stays in escrow/i);
    expect(m.steps.find((s) => s.state === "blocked")).toBeTruthy();
  });

  it("marks every step done when complete", () => {
    const m = contractMoneyTimeline(contract({ status: "COMPLETED" }), "employer");
    expect(m.steps.every((s) => s.state === "done")).toBe(true);
  });

  it("explains cancellation differently for each side", () => {
    const e = contractMoneyTimeline(contract({ status: "CANCELLED" }), "employer");
    const f = contractMoneyTimeline(contract({ status: "CANCELLED" }), "freelancer");
    expect(e.steps[0].detail).toMatch(/escrow/i);
    expect(f.steps[0].detail).toMatch(/already released/i);
  });
});
