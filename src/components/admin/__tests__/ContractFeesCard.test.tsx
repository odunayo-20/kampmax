// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  value: { data: undefined, isLoading: false, error: null, refetch: () => {} } as Record<string, unknown>,
}));
vi.mock("@/hooks/admin/use-admin-contract-fees", () => ({ useAdminContractFees: () => state.value }));

import { ContractFeesCard } from "../finance/ContractFeesCard";

afterEach(cleanup);
beforeEach(() => {
  state.value = { data: undefined, isLoading: false, error: null, refetch: () => {} };
});

const report = (extra: Record<string, unknown> = {}) => ({
  current: { rate: 10, minimum: 100 },
  totalCollected: 30000,
  payments: 3,
  thisMonth: 5000,
  recent: [
    {
      id: "t1",
      fee: 5000,
      paid: 50000,
      collectedAt: "2026-11-03T10:00:00.000Z",
      engagementId: "e1",
      milestonePosition: 2,
      jobTitle: "Landing page",
    },
  ],
  ...extra,
});

describe("ContractFeesCard", () => {
  it("shows what has been collected, and the latest fees with what was paid", () => {
    state.value = { ...state.value, data: report() };
    render(<ContractFeesCard />);

    expect(screen.getByText("₦30,000")).toBeTruthy();
    expect(screen.getByText("₦5,000", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("Landing page · payment 2")).toBeTruthy();
    expect(screen.getByText("₦50,000")).toBeTruthy();
  });

  it("says what new contracts charge, and when they charge nothing", () => {
    state.value = { ...state.value, data: report() };
    const { rerender } = render(<ContractFeesCard />);
    expect(screen.getByText("New contracts: 10%, at least ₦100")).toBeTruthy();

    state.value = { ...state.value, data: report({ current: { rate: 0, minimum: 0 } }) };
    rerender(<ContractFeesCard />);
    expect(screen.getByText("No fee on new contracts")).toBeTruthy();
  });

  it("says so, rather than showing an empty table, before anything is collected", () => {
    state.value = { ...state.value, data: report({ totalCollected: 0, payments: 0, thisMonth: 0, recent: [] }) };
    render(<ContractFeesCard />);
    expect(screen.getByText("No fee has been collected yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("gives a generic message and a retry when it cannot load, never the server's text", () => {
    const refetch = vi.fn();
    state.value = { ...state.value, error: new Error("relation wallet_transactions does not exist"), refetch };
    render(<ContractFeesCard />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("could not be completed");
    expect(alert.textContent).not.toContain("wallet_transactions");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
