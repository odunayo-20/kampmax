// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => {
  const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    admin: { role: "ADMIN", permissions: ["accommodation.payments.manage"] } as {
      role: string;
      permissions?: string[];
    } | null,
    useAdminPayments: vi.fn(),
    usePaymentReconciliation: vi.fn(),
    refund: mutation(),
    flag: mutation(),
    exportPayments: vi.fn(),
    saveFile: vi.fn(),
  };
});

vi.mock("@/lib/admin/admin-auth-context", () => ({ useAdminSession: () => ({ admin: h.admin }) }));
vi.mock("@/services/admin", () => ({ accommodationService: { exportPayments: h.exportPayments } }));
vi.mock("@/components/admin/accommodation/save-file", () => ({ saveFile: h.saveFile }));
vi.mock("@/hooks/admin/use-admin-accommodation", () => ({
  useAdminPayments: h.useAdminPayments,
  usePaymentReconciliation: h.usePaymentReconciliation,
  useRefundPayment: () => h.refund,
  useFlagPaymentForRefund: () => h.flag,
}));

import PaymentsPage from "../payments/page";

afterEach(cleanup);

const COUNTS = { REFUND_PENDING: 2, SUCCESS: 40, PENDING: 1, FAILED: 5, REFUNDED: 3 };

const payment = (over = {}) => ({
  id: "p1",
  subscriptionId: "s1",
  listingId: "l1",
  agentId: "a1",
  agentName: "Obi Homes",
  listingTitle: "Bright room near campus",
  reference: "ACC-AB12CD",
  gatewayReference: "98765",
  amount: 2000,
  currency: "NGN",
  paymentType: "INITIAL",
  billingCycle: 1,
  status: "REFUND_PENDING",
  paidAt: "2026-12-01T10:00:00Z",
  failureReason: null,
  refundReason: "Listing rejected: photos do not show this room",
  refundedAt: null,
  createdAt: "2026-12-01T09:59:00Z",
  ...over,
});

const list = (items: unknown[]) => ({
  data: { items, page: 1, pageSize: 15, total: items.length, totalPages: 1, counts: COUNTS },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
});

const REC = {
  data: {
    generatedAt: "2026-12-01T12:00:00Z",
    payments: {
      pendingOverTenMinutes: 1,
      oldestPendingSince: new Date(Date.now() - 3_600_000).toISOString(),
      refundsOwed: { count: 2, amount: 4000 },
    },
    subscriptions: { renewalsStuckOverAnHour: 1, renewalsOverdueOverAnHour: 2, pastDue: 3 },
  },
  isError: false,
};

beforeEach(() => {
  h.admin = { role: "ADMIN", permissions: ["accommodation.payments.manage"] };
  h.useAdminPayments.mockReset();
  h.useAdminPayments.mockReturnValue(list([payment()]));
  h.usePaymentReconciliation.mockReset();
  h.usePaymentReconciliation.mockReturnValue(REC);
  for (const m of [h.refund, h.flag]) {
    m.mutateAsync.mockReset();
    m.mutateAsync.mockResolvedValue({});
  }
  h.exportPayments.mockReset();
  h.saveFile.mockReset();
});

describe("payments page: access", () => {
  it("tells an admin without the payments permission, and asks for nothing from the server", () => {
    h.admin = { role: "ADMIN", permissions: ["accommodation.read"] };
    render(<PaymentsPage />);
    expect(screen.getByText("You don't have access to payments")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(h.useAdminPayments).toHaveBeenCalledWith(expect.anything(), false);
    expect(h.usePaymentReconciliation).toHaveBeenCalledWith(false);
  });

  it("opens for an admin who has it, fetching on the refunds tab", () => {
    render(<PaymentsPage />);
    expect(h.useAdminPayments).toHaveBeenCalledWith(
      expect.objectContaining({ status: "REFUND_PENDING", page: 1 }),
      true
    );
  });
});

describe("payments page: reconciliation", () => {
  it("shows what is owed and what may be stuck", () => {
    render(<PaymentsPage />);
    const region = within(screen.getByRole("region", { name: "Reconciliation" }));
    expect(region.getByText("Needs refund")).toBeTruthy();
    expect(region.getByText(/4,000.* owed back/)).toBeTruthy();
    expect(region.getByText("Waiting over 10 minutes")).toBeTruthy();
    expect(region.getByText("Renewals stuck or late")).toBeTruthy();
    // 1 stuck + 2 overdue = 3 renewals, and 3 subscriptions past due: two cards read "3"
    expect(region.getAllByText("3")).toHaveLength(2);
  });

  it("jumps to the refunds tab when the owed-back card is clicked", () => {
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Paid/ }));
    fireEvent.click(within(screen.getByRole("region", { name: "Reconciliation" })).getByRole("button", { name: /Needs refund/ }));
    expect(h.useAdminPayments).toHaveBeenLastCalledWith(expect.objectContaining({ status: "REFUND_PENDING" }), true);
  });

  it("says nothing is stuck when nothing is, and survives the summary failing to load", () => {
    h.usePaymentReconciliation.mockReturnValue({
      data: {
        ...REC.data,
        payments: { pendingOverTenMinutes: 0, oldestPendingSince: null, refundsOwed: { count: 0, amount: 0 } },
        subscriptions: { renewalsStuckOverAnHour: 0, renewalsOverdueOverAnHour: 0, pastDue: 0 },
      },
      isError: false,
    });
    const { unmount } = render(<PaymentsPage />);
    expect(screen.getByText("Nothing is stuck")).toBeTruthy();
    unmount();
    h.usePaymentReconciliation.mockReturnValue({ data: undefined, isError: true });
    render(<PaymentsPage />);
    expect(screen.getByText(/reconciliation summary could not be loaded/)).toBeTruthy();
    expect(screen.getByText("Bright room near campus")).toBeTruthy();
  });
});

describe("payments page: the list", () => {
  it("shows tabs with counts, refunds owed first", () => {
    render(<PaymentsPage />);
    const tabs = within(screen.getByRole("tablist", { name: "Payment status" }));
    expect(tabs.getByRole("tab", { name: /Needs refund\s*2/ }).getAttribute("aria-selected")).toBe("true");
    expect(tabs.getByRole("tab", { name: /Paid\s*40/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Waiting\s*1/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Failed\s*5/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Refunded\s*3/ })).toBeTruthy();
  });

  it("shows the payment with its listing, agent, gateway reference, type, amount and reason", () => {
    render(<PaymentsPage />);
    expect(screen.getByText("ACC-AB12CD")).toBeTruthy();
    expect(screen.getByText("Gateway 98765")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bright room near campus" }).getAttribute("href")).toBe(
      "/admin/accommodation/listings/l1"
    );
    expect(screen.getByRole("link", { name: "Obi Homes" }).getAttribute("href")).toBe("/admin/accommodation/agents/a1");
    expect(screen.getByText("First payment")).toBeTruthy();
    expect(screen.getByText("Month 1")).toBeTruthy();
    expect(screen.getByText(/2,000/)).toBeTruthy();
    expect(screen.getByText("Listing rejected: photos do not show this room")).toBeTruthy();
  });

  it("asks for a tab's payments from the first page", () => {
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Failed/ }));
    expect(h.useAdminPayments).toHaveBeenLastCalledWith(expect.objectContaining({ status: "FAILED", page: 1 }), true);
  });

  it("shows why a charge failed, and hides the gateway line for a free payment", () => {
    h.useAdminPayments.mockReturnValue(
      list([payment({ status: "FAILED", failureReason: "Insufficient funds", gatewayReference: null, refundReason: null })])
    );
    const { unmount } = render(<PaymentsPage />);
    expect(screen.getByText("Insufficient funds")).toBeTruthy();
    expect(screen.queryByText(/Gateway/)).toBeNull();
    unmount();
    h.useAdminPayments.mockReturnValue(list([payment({ amount: 0, gatewayReference: "FREE", status: "SUCCESS" })]));
    render(<PaymentsPage />);
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.queryByText(/Gateway/)).toBeNull();
  });

  it("explains an empty tab, and shows an error with retry", () => {
    h.useAdminPayments.mockReturnValue(list([]));
    const { unmount } = render(<PaymentsPage />);
    expect(screen.getByText("No refunds owed")).toBeTruthy();
    unmount();
    const refetch = vi.fn();
    h.useAdminPayments.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe("payments page: refunds", () => {
  it("asks before sending a refund, says it cannot be undone, then sends it", async () => {
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Refund ACC-AB12CD" }));
    const dialog = within(screen.getByRole("alertdialog"));
    expect(dialog.getByText(/Refund .*2,000.*\?/)).toBeTruthy();
    expect(dialog.getByText(/cannot be undone/)).toBeTruthy();
    expect(h.refund.mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole("button", { name: "Send refund" }));
    await waitFor(() => expect(h.refund.mutateAsync).toHaveBeenCalledWith("p1"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("changes nothing when the admin cancels", () => {
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Refund ACC-AB12CD" }));
    // the dialog has a backdrop and a button both named Cancel; use the visible one
    const cancel = within(screen.getByRole("alertdialog")).getAllByRole("button", { name: "Cancel" }).find((b) => b.textContent === "Cancel");
    fireEvent.click(cancel!);
    expect(h.refund.mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("keeps the dialog open and shows the gateway's refusal, so it can be retried", async () => {
    h.refund.mutateAsync.mockRejectedValue(new Error("The payment gateway did not accept the refund. Try again shortly."));
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Refund ACC-AB12CD" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Send refund" }));
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((a) => a.textContent?.includes("The payment gateway did not accept the refund"))).toBe(true);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("offers no refund for a payment where nothing was charged", () => {
    h.useAdminPayments.mockReturnValue(list([payment({ amount: 0, gatewayReference: "FREE" })]));
    render(<PaymentsPage />);
    expect(screen.queryByRole("button", { name: /^Refund/ })).toBeNull();
    expect(screen.getByText("Nothing was charged")).toBeTruthy();
  });

  it("marks a paid payment as owed back only with a reason", async () => {
    h.useAdminPayments.mockReturnValue(list([payment({ status: "SUCCESS", refundReason: null })]));
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mark ACC-AB12CD for refund" }));
    const dialog = within(screen.getByRole("alertdialog"));
    expect(dialog.getByText(/turns off automatic renewal/)).toBeTruthy();
    const confirm = dialog.getByRole("button", { name: "Mark for refund" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(dialog.getByLabelText(/Why is it owed back/), { target: { value: "Charged twice by mistake" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(h.flag.mutateAsync).toHaveBeenCalledWith({ id: "p1", reason: "Charged twice by mistake" }));
  });

  it("offers nothing for a payment that is still waiting, failed or already refunded", () => {
    for (const status of ["PENDING", "FAILED", "REFUNDED"]) {
      h.useAdminPayments.mockReturnValue(list([payment({ status, refundReason: null })]));
      const { unmount } = render(<PaymentsPage />);
      expect(screen.queryByRole("button", { name: /^Refund|^Mark/ })).toBeNull();
      unmount();
    }
  });

  it("does not offer a refund for a free paid payment either", () => {
    h.useAdminPayments.mockReturnValue(list([payment({ status: "SUCCESS", amount: 0, gatewayReference: "FREE" })]));
    render(<PaymentsPage />);
    expect(screen.queryByRole("button", { name: /^Mark/ })).toBeNull();
  });
});

describe("payments page: CSV export", () => {
  it("downloads the default range with no dates, and says what that means", async () => {
    h.exportPayments.mockResolvedValue({ blob: new Blob(["csv"]), filename: "accommodation-payments.csv" });
    render(<PaymentsPage />);
    expect(screen.getByText(/With no dates, the CSV covers the last 30 days/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Download CSV/ }));
    await waitFor(() => expect(h.exportPayments).toHaveBeenCalledWith({ from: undefined, to: undefined }));
    await waitFor(() => expect(h.saveFile).toHaveBeenCalledTimes(1));
    expect(h.saveFile.mock.calls[0][1]).toBe("accommodation-payments.csv");
  });

  it("sends the chosen days", async () => {
    h.exportPayments.mockResolvedValue({ blob: new Blob(["csv"]), filename: null });
    render(<PaymentsPage />);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("To (included)"), { target: { value: "2026-11-30" } });
    fireEvent.click(screen.getByRole("button", { name: /Download CSV/ }));
    await waitFor(() => expect(h.exportPayments).toHaveBeenCalledWith({ from: "2026-11-01", to: "2026-11-30" }));
  });

  it("will not export a range that ends before it starts", () => {
    render(<PaymentsPage />);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("To (included)"), { target: { value: "2026-11-01" } });
    expect((screen.getByRole("button", { name: /Download CSV/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByRole("form", { name: "Export payments" }));
    expect(h.exportPayments).not.toHaveBeenCalled();
  });

  it("shows the reason when the export is refused, and can be tried again", async () => {
    h.exportPayments.mockRejectedValue(new Error("Choose a range of at most 366 days."));
    render(<PaymentsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Download CSV/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("Choose a range of at most 366 days.");
    await waitFor(() => expect((screen.getByRole("button", { name: /Download CSV/ }) as HTMLButtonElement).disabled).toBe(false));
    expect(h.saveFile).not.toHaveBeenCalled();
  });
});
