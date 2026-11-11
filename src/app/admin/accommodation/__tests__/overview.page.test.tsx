// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ useAccommodationDashboard: vi.fn() }));
vi.mock("@/hooks/admin/use-admin-accommodation", () => ({
  useAccommodationDashboard: h.useAccommodationDashboard,
}));

import OverviewPage from "../page";

afterEach(cleanup);

const dashboard = (over: Record<string, unknown> = {}) => ({
  range: { from: "2026-11-01", to: "2026-11-30" },
  agents: { total: 30, pending: 4, verified: 22, suspended: 1, newInRange: 6 },
  properties: 40,
  listings: { total: 55, active: 38, pendingApproval: 3, expired: 9, suspended: 2 },
  subscriptions: {
    active: 38,
    pastDue: 2,
    suspended: 1,
    monthlyRecurringRevenue: 76_000,
    averageRevenuePerActiveListing: 2000,
    cancellationRate: 4.5,
  },
  payments: {
    revenueInRange: 152_000,
    paidInRange: 76,
    failedInRange: 5,
    failedPaymentRate: 6.2,
    renewalSuccessRate: 91.3,
    refundsPending: { count: 2, amount: 4000 },
    revenueByMonth: [
      { month: "2026-10", revenue: 70_000 },
      { month: "2026-11", revenue: 82_000 },
    ],
  },
  enquiries: { inRange: 120, answered: 100, averageResponseHours: 5.5 },
  inspections: { requestedInRange: 30, completedInRange: 18, enquiryToInspectionRate: 25, completionRate: 60 },
  reports: { open: 2, newInRange: 3 },
  ...over,
});

const loaded = (data = dashboard()) => ({ data, isPending: false, isError: false, refetch: vi.fn() });

beforeEach(() => {
  h.useAccommodationDashboard.mockReset();
  h.useAccommodationDashboard.mockReturnValue(loaded());
});

describe("overview: range", () => {
  it("opens on the last 30 days, ending today", () => {
    render(<OverviewPage />);
    const range = h.useAccommodationDashboard.mock.calls[0][0] as { from: string; to: string };
    const days = (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000;
    expect(days).toBe(29);
    expect(range.to).toBe(new Date().toISOString().slice(0, 10));
    expect(screen.getByRole("button", { name: "Last 30 days" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("switches to 7 days", () => {
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    const range = h.useAccommodationDashboard.mock.calls.at(-1)?.[0] as { from: string; to: string };
    expect((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000).toBe(6);
  });

  it("takes custom dates and asks for exactly those", () => {
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("To (included)"), { target: { value: "2026-10-31" } });
    expect(h.useAccommodationDashboard).toHaveBeenLastCalledWith({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("does not ask the server for a start date after the end", () => {
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-10" } });
    fireEvent.change(screen.getByLabelText("To (included)"), { target: { value: "2026-11-01" } });
    expect(screen.getByRole("alert").textContent).toContain("start date must be before the end date");
    expect(h.useAccommodationDashboard).toHaveBeenLastCalledWith({});
  });
});

describe("overview: content", () => {
  it("shows the money figures in naira, and rates as percentages", () => {
    render(<OverviewPage />);
    const money = screen.getByRole("region", { name: "Money" });
    expect(money.textContent).toContain("76,000");
    expect(money.textContent).toContain("152,000");
    expect(money.textContent).toContain("6.2%");
    expect(money.textContent).toContain("91.3%");
    expect(money.textContent).toContain("4.5%");
  });

  it("shows a dash, not 0%, when there was nothing to measure", () => {
    h.useAccommodationDashboard.mockReturnValue(
      loaded(
        dashboard({
          subscriptions: {
            active: 0,
            pastDue: 0,
            suspended: 0,
            monthlyRecurringRevenue: 0,
            averageRevenuePerActiveListing: null,
            cancellationRate: null,
          },
          payments: {
            revenueInRange: 0,
            paidInRange: 0,
            failedInRange: 0,
            failedPaymentRate: null,
            renewalSuccessRate: null,
            refundsPending: { count: 0, amount: 0 },
            revenueByMonth: [],
          },
        })
      )
    );
    render(<OverviewPage />);
    const money = screen.getByRole("region", { name: "Money" });
    expect(money.textContent).not.toContain("0%");
    expect(money.textContent).toContain("—");
  });

  it("says there is no revenue to chart rather than drawing an empty chart", () => {
    h.useAccommodationDashboard.mockReturnValue(
      loaded(dashboard({ payments: { ...dashboard().payments, revenueByMonth: [] } }))
    );
    render(<OverviewPage />);
    expect(screen.getByText("No payments yet in this range.")).toBeTruthy();
  });

  it("charts revenue by month", () => {
    render(<OverviewPage />);
    expect(screen.getByText("Revenue by month")).toBeTruthy();
  });

  it("shows the six months up to the end of the range, so one month of sales is not one giant bar", () => {
    h.useAccommodationDashboard.mockReturnValue(
      loaded(
        dashboard({
          range: { from: "2026-11-01", to: "2026-11-30" },
          payments: { ...dashboard().payments, revenueByMonth: [{ month: "2026-11", revenue: 400 }] },
        })
      )
    );
    const { container } = render(<OverviewPage />);
    for (const label of [/Jun 26/, /Jul 26/, /Aug 26/, /Sep\w* 26/, /Oct 26/, /Nov 26/]) {
      expect(container.textContent).toMatch(label);
    }
  });

  it("covers listings, agents and demand", () => {
    render(<OverviewPage />);
    const listings = screen.getByRole("region", { name: "Listings and agents" });
    expect(listings.textContent).toContain("38");
    expect(listings.textContent).toContain("22");
    const demand = screen.getByRole("region", { name: "Demand" });
    expect(demand.textContent).toContain("120");
    expect(demand.textContent).toContain("5.5 h");
  });
});

describe("overview: needs attention", () => {
  it("lists what is waiting, each linking to where it is handled", () => {
    render(<OverviewPage />);
    const box = screen.getByRole("region", { name: "Needs attention" });
    const hrefs = Array.from(box.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/admin/accommodation/agents",
      "/admin/accommodation/listings",
      "/admin/accommodation/payments",
      "/admin/accommodation/reports",
      "/admin/accommodation/subscriptions",
    ]);
    expect(box.textContent).toContain("4,000");
  });

  it("leaves out what has nothing waiting", () => {
    h.useAccommodationDashboard.mockReturnValue(
      loaded(
        dashboard({
          agents: { total: 30, pending: 0, verified: 22, suspended: 1, newInRange: 6 },
          reports: { open: 0, newInRange: 0 },
        })
      )
    );
    render(<OverviewPage />);
    const box = screen.getByRole("region", { name: "Needs attention" });
    expect(box.textContent).not.toContain("Agent applications");
    expect(box.textContent).not.toContain("Open reports");
  });

  it("says so when nothing is waiting", () => {
    h.useAccommodationDashboard.mockReturnValue(
      loaded(
        dashboard({
          agents: { total: 1, pending: 0, verified: 1, suspended: 0, newInRange: 0 },
          listings: { total: 1, active: 1, pendingApproval: 0, expired: 0, suspended: 0 },
          subscriptions: { ...dashboard().subscriptions, pastDue: 0 },
          payments: { ...dashboard().payments, refundsPending: { count: 0, amount: 0 } },
          reports: { open: 0, newInRange: 0 },
        })
      )
    );
    render(<OverviewPage />);
    expect(screen.getByText("Nothing is waiting on you.")).toBeTruthy();
  });
});

describe("overview: loading and failure", () => {
  it("offers a retry when it cannot load", () => {
    const refetch = vi.fn();
    h.useAccommodationDashboard.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows no figures while loading", () => {
    h.useAccommodationDashboard.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    render(<OverviewPage />);
    expect(screen.queryByRole("region", { name: "Money" })).toBeNull();
  });
});
