// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Opportunity } from "@/types/opportunity";
import type { PostingPricing, RenewalQuote } from "@/services/jobs";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const state = {
  quote: undefined as RenewalQuote | undefined,
  available: 50000 as number | undefined,
  pricing: { hiringEnabled: true } as Partial<PostingPricing>,
};
const mutate = vi.fn();

vi.mock("@/hooks/use-posting-billing", () => ({
  useRenewalQuote: () => ({ data: state.quote, isPending: !state.quote, isError: false }),
  usePostingBillingSummary: () => ({
    data:
      state.available === undefined
        ? undefined
        : { wallet: { availableBalance: state.available } },
  }),
  usePostingPricing: () => ({ data: state.pricing }),
}));
vi.mock("@/hooks/use-jobs", () => ({
  useRenewJob: () => ({ mutate, isPending: false }),
}));

import { RenewJobDialog, deadlinePassed } from "../RenewJobDialog";

afterEach(cleanup);
beforeEach(() => {
  mutate.mockReset();
  state.quote = { amountDue: 7500, currency: "NGN", liveDays: 30 };
  state.available = 50000;
  state.pricing = { hiringEnabled: true };
});

const job = (deadline: string) => ({ id: "job-1", deadline }) as Opportunity;
const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
const past = "2020-01-01";

const open = (deadline: string) => {
  const onClose = vi.fn();
  render(<RenewJobDialog job={job(deadline)} open onClose={onClose} />);
  return { onClose };
};
const confirm = (name: RegExp | string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("deadlinePassed", () => {
  const now = new Date("2026-11-04T12:00:00").getTime();
  it("treats a date as open until the end of that day", () => {
    expect(deadlinePassed("2026-11-04", now)).toBe(false);
    expect(deadlinePassed("2026-11-03", now)).toBe(true);
  });
  it("handles full dates and a missing deadline", () => {
    expect(deadlinePassed("2026-11-03T10:00:00.000Z", now)).toBe(true);
    expect(deadlinePassed("", now)).toBe(false);
    expect(deadlinePassed("not a date", now)).toBe(false);
  });
});

describe("RenewJobDialog", () => {
  it("shows the renewal fee and renews without asking for a deadline while the old one holds", () => {
    open(future);
    expect(screen.getByText(/₦7,500 will be taken from your wallet/)).toBeTruthy();
    expect(screen.queryByLabelText("New application deadline")).toBeNull();
    fireEvent.click(confirm("Pay ₦7,500 & renew"));
    expect(mutate).toHaveBeenCalledWith(
      { id: "job-1", applicationDeadline: undefined },
      expect.any(Object)
    );
  });

  it("asks for a new deadline when the old one has passed, and will not renew without it", () => {
    open(past);
    expect(confirm(/Pay ₦7,500/).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("New application deadline"), {
      target: { value: future },
    });
    expect(confirm(/Pay ₦7,500/).disabled).toBe(false);
    fireEvent.click(confirm(/Pay ₦7,500/));
    expect(mutate).toHaveBeenCalledWith(
      { id: "job-1", applicationDeadline: new Date(`${future}T23:59:59`).toISOString() },
      expect.any(Object)
    );
  });

  it("says renewing is free when the fee is zero", () => {
    state.quote = { amountDue: 0, currency: "NGN", liveDays: 30 };
    open(future);
    expect(screen.getByText(/Renewing is free right now/)).toBeTruthy();
    expect(confirm("Renew").disabled).toBe(false);
  });

  it("blocks a wallet that is short, with the shortfall and a top-up link", () => {
    state.available = 2500;
    open(future);
    expect(screen.getByText(/Your wallet is ₦5,000 short/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Top up your wallet" }).getAttribute("href")).toBe(
      "/employer/billing"
    );
    expect(confirm(/Pay ₦7,500/).disabled).toBe(true);
  });

  it("does not guess a shortfall before the wallet balance has loaded", () => {
    state.available = undefined;
    open(future);
    expect(screen.queryByText(/short/)).toBeNull();
  });

  it("blocks renewing while vacancies and internships are not open yet", () => {
    state.pricing = { hiringEnabled: false };
    open(future);
    expect(screen.getByText(/not open for posting yet/)).toBeTruthy();
    expect(confirm(/Pay ₦7,500/).disabled).toBe(true);
  });

  it("shows the backend's reason when renewing is refused", () => {
    mutate.mockImplementation((_vars, opts) =>
      opts.onError(Object.assign(new Error("Only an expired posting can be renewed"), { status: 400 }))
    );
    open(future);
    fireEvent.click(confirm(/Pay ₦7,500/));
    expect(screen.getByText("Only an expired posting can be renewed")).toBeTruthy();
  });
});
