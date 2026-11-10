// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const h = vi.hoisted(() => ({
  admin: { role: "ADMIN", permissions: ["accommodation.payments.manage"] } as {
    role: string;
    permissions?: string[];
  } | null,
  useAdminSubscriptions: vi.fn(),
  useSubscriptionPayments: vi.fn(),
}));

vi.mock("@/lib/admin/admin-auth-context", () => ({ useAdminSession: () => ({ admin: h.admin }) }));
vi.mock("@/hooks/admin/use-admin-accommodation", () => ({
  useAdminSubscriptions: h.useAdminSubscriptions,
  useSubscriptionPayments: h.useSubscriptionPayments,
}));

import SubscriptionsPage from "../subscriptions/page";

afterEach(cleanup);

const COUNTS = { PAST_DUE: 2, ACTIVE: 25, SUSPENDED: 1, PENDING: 3, EXPIRED: 9, CANCELLED: 4 };

const sub = (over = {}) => ({
  id: "s1",
  listingId: "l1",
  listingTitle: "Bright room near campus",
  agentId: "a1",
  agentName: "Obi Homes",
  status: "PAST_DUE",
  amount: 2000,
  currency: "NGN",
  durationDays: 30,
  startsAt: "2026-11-01T00:00:00Z",
  endsAt: "2026-12-01T00:00:00Z",
  nextBillingAt: "2026-12-01T00:00:00Z",
  autoRenew: true,
  billingCycle: 2,
  cancelledAt: null,
  lastPaymentAt: "2026-11-01T00:00:00Z",
  lastFailureAt: "2026-12-01T01:00:00Z",
  retryCount: 2,
  nextRetryAt: "2026-12-03T10:00:00Z",
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});

const list = (items: unknown[]) => ({
  data: { items, page: 1, pageSize: 15, total: items.length, totalPages: 1, counts: COUNTS },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  h.admin = { role: "ADMIN", permissions: ["accommodation.payments.manage"] };
  h.useAdminSubscriptions.mockReset();
  h.useAdminSubscriptions.mockReturnValue(list([sub()]));
  h.useSubscriptionPayments.mockReset();
  h.useSubscriptionPayments.mockReturnValue({ data: [], isPending: false, isError: false, refetch: vi.fn() });
});

describe("subscriptions page: access", () => {
  it("tells an admin without the payments permission, and fetches nothing", () => {
    h.admin = { role: "ADMIN", permissions: ["accommodation.read"] };
    render(<SubscriptionsPage />);
    expect(screen.getByText("You don't have access to subscriptions")).toBeTruthy();
    expect(h.useAdminSubscriptions).toHaveBeenCalledWith(expect.anything(), false);
  });

  it("opens on past due, because that is where someone may need to act", () => {
    render(<SubscriptionsPage />);
    expect(h.useAdminSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PAST_DUE", page: 1 }),
      true
    );
    expect(screen.getByRole("tab", { name: /Past due/ }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("subscriptions page: tabs", () => {
  it("shows a count on each tab", () => {
    render(<SubscriptionsPage />);
    expect(screen.getByRole("tab", { name: /Active/ }).textContent).toContain("25");
    expect(screen.getByRole("tab", { name: /Waiting for approval/ }).textContent).toContain("3");
  });

  it("switches status and starts again from page 1", () => {
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Expired/ }));
    expect(h.useAdminSubscriptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "EXPIRED", page: 1 }),
      true
    );
  });

  it("explains an empty tab", () => {
    h.useAdminSubscriptions.mockReturnValue(list([]));
    render(<SubscriptionsPage />);
    expect(screen.getByText("Nothing past due")).toBeTruthy();
  });
});

describe("subscriptions page: rows", () => {
  it("names the listing and the agent, each linking to its page", () => {
    render(<SubscriptionsPage />);
    expect(screen.getByRole("link", { name: "Bright room near campus" }).getAttribute("href")).toBe(
      "/admin/accommodation/listings/l1"
    );
    expect(screen.getByRole("link", { name: "Obi Homes" }).getAttribute("href")).toBe("/admin/accommodation/agents/a1");
  });

  it("shows the price it was sold at, and the month", () => {
    render(<SubscriptionsPage />);
    const row = screen.getByRole("row", { name: /Bright room/ });
    expect(row.textContent).toContain("2,000");
    expect(row.textContent).toContain("per 30 days");
  });

  it("says how a failing renewal is going", () => {
    render(<SubscriptionsPage />);
    expect(screen.getByRole("row", { name: /Bright room/ }).textContent).toContain("2 failed tries of 3");
  });

  it("says a running one renews, or that it will not", () => {
    h.useAdminSubscriptions.mockReturnValue(
      list([
        sub({ id: "s1", status: "ACTIVE", retryCount: 0, nextRetryAt: null }),
        sub({ id: "s2", listingTitle: "Quiet flat", status: "ACTIVE", autoRenew: false, retryCount: 0 }),
      ])
    );
    render(<SubscriptionsPage />);
    expect(screen.getByRole("row", { name: /Bright room/ }).textContent).toContain("Renews");
    expect(screen.getByRole("row", { name: /Quiet flat/ }).textContent).toContain("Will not renew");
  });

  it("calls a zero price free, and an unstarted period not started", () => {
    h.useAdminSubscriptions.mockReturnValue(
      list([sub({ status: "PENDING", amount: 0, startsAt: null, endsAt: null, retryCount: 0 })])
    );
    render(<SubscriptionsPage />);
    const row = screen.getByRole("row", { name: /Bright room/ });
    expect(row.textContent).toContain("Free");
    expect(row.textContent).toContain("Not started");
  });

  it("has no buttons that change anything", () => {
    render(<SubscriptionsPage />);
    const labels = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(labels.some((l) => /refund|cancel|suspend|retry|charge/i.test(l ?? ""))).toBe(false);
  });
});

describe("subscriptions page: billing history", () => {
  it("loads the history only when a row is opened", () => {
    render(<SubscriptionsPage />);
    expect(h.useSubscriptionPayments).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Billing history for Bright room near campus" }));
    expect(h.useSubscriptionPayments).toHaveBeenCalledWith("s1", true);
  });

  it("lists every charge, with why a failed one failed", () => {
    h.useSubscriptionPayments.mockReturnValue({
      data: [
        {
          id: "p1",
          billingCycle: 1,
          paymentType: "INITIAL",
          reference: "ACC-ONE",
          amount: 2000,
          status: "SUCCESS",
          paidAt: "2026-11-01T00:00:00Z",
          createdAt: "2026-11-01T00:00:00Z",
          failureReason: null,
        },
        {
          id: "p2",
          billingCycle: 2,
          paymentType: "RENEWAL",
          reference: "ACC-TWO",
          amount: 2000,
          status: "FAILED",
          paidAt: null,
          createdAt: "2026-12-01T00:00:00Z",
          failureReason: "Insufficient funds",
        },
      ],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Billing history for Bright room near campus" }));
    const history = screen.getByRole("table", { name: "Billing history" });
    expect(within(history).getByText("ACC-ONE")).toBeTruthy();
    expect(within(history).getByText("Insufficient funds")).toBeTruthy();
  });

  it("closes again, and says so when there are no charges", () => {
    render(<SubscriptionsPage />);
    const toggle = screen.getByRole("button", { name: "Billing history for Bright room near campus" });
    fireEvent.click(toggle);
    expect(screen.getByText("No charges yet.")).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByText("No charges yet.")).toBeNull();
  });

  it("offers a retry when the history cannot load", () => {
    const refetch = vi.fn();
    h.useSubscriptionPayments.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<SubscriptionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Billing history for Bright room near campus" }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });
});
