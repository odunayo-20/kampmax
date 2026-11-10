// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({
  admin: { role: "ADMIN", permissions: ["accommodation.listings.moderate"] } as {
    role: string;
    permissions?: string[];
  } | null,
  useAdminReports: vi.fn(),
  resolve: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("@/lib/admin/admin-auth-context", () => ({ useAdminSession: () => ({ admin: h.admin }) }));
vi.mock("@/hooks/admin/use-admin-accommodation", () => ({
  useAdminReports: h.useAdminReports,
  useResolveReport: () => h.resolve,
}));

import ReportsPage from "../reports/page";

afterEach(cleanup);

const COUNTS = { OPEN: 4, RESOLVED: 20, DISMISSED: 7 };

const report = (over = {}) => ({
  id: "r1",
  listingId: "l1",
  listingTitle: "Bright room near campus",
  listingModerationStatus: "APPROVED",
  agentId: "a1",
  agentName: "Obi Homes",
  reason: "FAKE_LISTING",
  description: "Photos are from another site",
  status: "OPEN",
  openReportsOnListing: 1,
  reporterId: "u1",
  reporterName: "Chidi O.",
  reviewedAt: null,
  resolution: null,
  createdAt: new Date().toISOString(),
  ...over,
});

const list = (items: unknown[]) => ({
  data: { items, page: 1, pageSize: 15, total: items.length, totalPages: 1, counts: COUNTS },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  h.admin = { role: "ADMIN", permissions: ["accommodation.listings.moderate"] };
  h.useAdminReports.mockReset();
  h.useAdminReports.mockReturnValue(list([report()]));
  h.resolve.mutateAsync.mockReset();
  h.resolve.mutateAsync.mockResolvedValue({ listingSuspended: false });
});

const handleButton = () => screen.getByRole("button", { name: /Handle report on/ });
const note = () => screen.getByLabelText(/What you found and did/);

describe("reports page: the list", () => {
  it("opens on the open reports, with a count on every tab", () => {
    render(<ReportsPage />);
    expect(h.useAdminReports).toHaveBeenCalledWith(expect.objectContaining({ status: "OPEN", page: 1 }));
    const tabs = within(screen.getByRole("tablist", { name: "Report status" }));
    expect(tabs.getByRole("tab", { name: /Open\s*4/ }).getAttribute("aria-selected")).toBe("true");
    expect(tabs.getByRole("tab", { name: /Resolved\s*20/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Dismissed\s*7/ })).toBeTruthy();
  });

  it("shows the listing, its agent, what was reported and who reported it", () => {
    render(<ReportsPage />);
    expect(screen.getByRole("link", { name: "Bright room near campus" }).getAttribute("href")).toBe(
      "/admin/accommodation/listings/l1"
    );
    expect(screen.getByRole("link", { name: "Obi Homes" }).getAttribute("href")).toBe("/admin/accommodation/agents/a1");
    expect(screen.getByText("Fake listing")).toBeTruthy();
    expect(screen.getByText("Photos are from another site")).toBeTruthy();
    expect(screen.getByText("Chidi O.")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
  });

  it("makes a pile-up of open reports on one listing stand out, but not a single report", () => {
    h.useAdminReports.mockReturnValue(list([report({ openReportsOnListing: 3 })]));
    const { unmount } = render(<ReportsPage />);
    expect(screen.getByText("3 open reports")).toBeTruthy();
    unmount();
    h.useAdminReports.mockReturnValue(list([report({ openReportsOnListing: 1 })]));
    render(<ReportsPage />);
    expect(screen.queryByText(/open reports$/)).toBeNull();
  });

  it("asks for the chosen tab from the first page", () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Dismissed/ }));
    expect(h.useAdminReports).toHaveBeenLastCalledWith(expect.objectContaining({ status: "DISMISSED", page: 1 }));
  });

  it("shows what was done, and when, on a handled report, with no Handle button", () => {
    h.useAdminReports.mockReturnValue(
      list([report({ status: "RESOLVED", reviewedAt: "2027-01-15T10:00:00Z", resolution: "Taken down: copied photos" })])
    );
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Resolved/ }));
    expect(screen.getByText("Taken down: copied photos")).toBeTruthy();
    expect(screen.getByText(/2027/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Handle report on/ })).toBeNull();
  });

  it("copes with a listing, agent or reporter that is gone", () => {
    h.useAdminReports.mockReturnValue(
      list([report({ listingTitle: null, agentId: null, agentName: null, reporterName: null, listingModerationStatus: null })])
    );
    render(<ReportsPage />);
    expect(screen.getByRole("link", { name: "Listing" })).toBeTruthy();
    expect(screen.getByText("Someone")).toBeTruthy();
  });

  it("explains an empty queue, and shows an error with a retry", () => {
    h.useAdminReports.mockReturnValue(list([]));
    const { unmount } = render(<ReportsPage />);
    expect(screen.getByText("No open reports")).toBeTruthy();
    unmount();
    const refetch = vi.fn();
    h.useAdminReports.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe("reports page: handling a report", () => {
  it("hides Handle from an admin who may only read", () => {
    h.admin = { role: "ADMIN", permissions: ["accommodation.read"] };
    render(<ReportsPage />);
    expect(screen.getByText("Fake listing")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Handle report on/ })).toBeNull();
  });

  it("opens the dialog for that report and closes it again on Cancel", () => {
    render(<ReportsPage />);
    fireEvent.click(handleButton());
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(h.resolve.mutateAsync).not.toHaveBeenCalled();
  });

  it("closes a report with a note, and says so", async () => {
    render(<ReportsPage />);
    fireEvent.click(handleButton());
    fireEvent.change(note(), { target: { value: "Spoke to the agent; fixed" } });
    fireEvent.click(screen.getByRole("button", { name: "Close report" }));
    await waitFor(() =>
      expect(h.resolve.mutateAsync).toHaveBeenCalledWith({
        id: "r1",
        input: { decision: "RESOLVED", resolution: "Spoke to the agent; fixed", suspendListing: false },
      })
    );
    expect((await screen.findByRole("status")).textContent).toContain("Report closed.");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("takes the listing down when asked, and says it did", async () => {
    h.resolve.mutateAsync.mockResolvedValue({ listingSuspended: true });
    render(<ReportsPage />);
    fireEvent.click(handleButton());
    fireEvent.change(note(), { target: { value: "Confirmed fake" } });
    fireEvent.click(screen.getByLabelText(/Also take the listing down/));
    fireEvent.click(screen.getByRole("button", { name: "Close report" }));
    await waitFor(() =>
      expect(h.resolve.mutateAsync).toHaveBeenCalledWith({
        id: "r1",
        input: { decision: "RESOLVED", resolution: "Confirmed fake", suspendListing: true },
      })
    );
    expect((await screen.findByRole("status")).textContent).toContain("the listing was taken down");
  });

  it("is honest when the listing was already off the site by the time the report was closed", async () => {
    h.resolve.mutateAsync.mockResolvedValue({ listingSuspended: false });
    render(<ReportsPage />);
    fireEvent.click(handleButton());
    fireEvent.change(note(), { target: { value: "Confirmed fake" } });
    fireEvent.click(screen.getByLabelText(/Also take the listing down/));
    fireEvent.click(screen.getByRole("button", { name: "Close report" }));
    expect((await screen.findByRole("status")).textContent).toContain("already off the site");
  });

  it("dismisses a report", async () => {
    render(<ReportsPage />);
    fireEvent.click(handleButton());
    fireEvent.click(screen.getByLabelText(/Nothing wrong/));
    fireEvent.change(note(), { target: { value: "Checked: it is genuine" } });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss report" }));
    await waitFor(() =>
      expect(h.resolve.mutateAsync).toHaveBeenCalledWith({
        id: "r1",
        input: { decision: "DISMISSED", resolution: "Checked: it is genuine", suspendListing: false },
      })
    );
  });

  it("keeps the dialog open, with the note, and shows the backend's reason when it is refused", async () => {
    h.resolve.mutateAsync.mockRejectedValue(new Error("This report has already been handled."));
    render(<ReportsPage />);
    fireEvent.click(handleButton());
    fireEvent.change(note(), { target: { value: "My careful note" } });
    fireEvent.click(screen.getByRole("button", { name: "Close report" }));
    expect((await screen.findByRole("alert")).textContent).toContain("This report has already been handled.");
    expect((note() as HTMLTextAreaElement).value).toBe("My careful note");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("clears an old error and notice when another report is opened", async () => {
    h.resolve.mutateAsync.mockRejectedValueOnce(new Error("Boom"));
    render(<ReportsPage />);
    fireEvent.click(handleButton());
    fireEvent.change(note(), { target: { value: "My careful note" } });
    fireEvent.click(screen.getByRole("button", { name: "Close report" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(handleButton());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
