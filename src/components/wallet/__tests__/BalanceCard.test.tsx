// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BalanceCard } from "../BalanceCard";
import type { Wallet } from "@/types";

afterEach(cleanup);

const wallet = (over: Partial<Wallet> = {}): Wallet => ({
  id: "w1",
  userId: "u1",
  balance: 200,
  pendingAmount: 0,
  currency: "NGN",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  transactions: [],
  ...over,
});

describe("BalanceCard", () => {
  it("shows what is available, and nothing about clearing when nothing is", () => {
    render(<BalanceCard wallet={wallet()} />);
    expect(screen.getByText("₦200")).toBeTruthy();
    expect(screen.queryByText(/clearing/)).toBeNull();
  });

  it("shows earnings that are still clearing, apart from the available balance, and when they arrive", () => {
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString();
    render(<BalanceCard wallet={wallet({ pendingAmount: 300, clearing: [{ amount: 300, releaseAt: soon }] })} />);

    expect(screen.getByText("₦200")).toBeTruthy();
    expect(screen.getByText(/₦300 clearing · ₦300 available on/)).toBeTruthy();
  });

  it("hides the clearing amount along with the balance when the balance is hidden", () => {
    render(<BalanceCard wallet={wallet({ pendingAmount: 300, clearing: [] })} />);
    expect(screen.getByText("₦300 clearing")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.queryByText("₦300 clearing")).toBeNull();
    expect(screen.getByText("•••• clearing")).toBeTruthy();
  });
});
