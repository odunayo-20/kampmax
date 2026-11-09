// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => {
  const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    params: { id: "l1" },
    admin: { role: "ADMIN", permissions: ["accommodation.listings.moderate"] } as {
      role: string;
      permissions?: string[];
    } | null,
    useAdminListings: vi.fn(),
    useAdminListing: vi.fn(),
    approve: mutation(),
    reject: mutation(),
    suspend: mutation(),
    restore: mutation(),
  };
});

vi.mock("next/navigation", () => ({ useParams: () => h.params }));
vi.mock("@/lib/admin/admin-auth-context", () => ({ useAdminSession: () => ({ admin: h.admin }) }));
vi.mock("@/hooks/admin/use-admin-accommodation", () => ({
  useAdminListings: h.useAdminListings,
  useAdminListing: h.useAdminListing,
  useApproveListing: () => h.approve,
  useRejectListing: () => h.reject,
  useSuspendListing: () => h.suspend,
  useRestoreListing: () => h.restore,
}));

import ListingsPage from "../listings/page";
import ListingPage from "../listings/[id]/page";

afterEach(cleanup);

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 15, total: items.length, totalPages: 1 });
const COUNTS = { PENDING_APPROVAL: 3, APPROVED: 12, ADMIN_SUSPENDED: 1, REJECTED: 2, DRAFT: 5 };

const row = (over = {}) => ({
  id: "l1",
  title: "Bright room near campus",
  agentId: "a1",
  agentName: "Obi Homes",
  moderationStatus: "PENDING_APPROVAL",
  publicationStatus: "UNPUBLISHED",
  availabilityStatus: "AVAILABLE",
  submittedAt: new Date().toISOString(),
  expiresAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

describe("listings queue page", () => {
  beforeEach(() => {
    h.useAdminListings.mockReset();
    h.useAdminListings.mockReturnValue({
      data: { ...page([row()]), counts: COUNTS },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("opens on the waiting-for-review queue, with counts on the tabs", () => {
    render(<ListingsPage />);
    expect(h.useAdminListings).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING_APPROVAL", page: 1 }));
    const tabs = within(screen.getByRole("tablist", { name: "Listing status" }));
    expect(tabs.getByRole("tab", { name: /Waiting for review\s*3/ }).getAttribute("aria-selected")).toBe("true");
    expect(tabs.getByRole("tab", { name: /Approved\s*12/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Suspended\s*1/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Rejected\s*2/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Drafts\s*5/ })).toBeTruthy();
  });

  it("lists each listing with its agent and a Review link", () => {
    render(<ListingsPage />);
    expect(screen.getByText("Bright room near campus")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Obi Homes" }).getAttribute("href")).toBe("/admin/accommodation/agents/a1");
    expect(screen.getByRole("link", { name: "Review Bright room near campus" }).getAttribute("href")).toBe(
      "/admin/accommodation/listings/l1"
    );
    expect(screen.getByText("Waiting for review", { selector: "span.rounded-full" })).toBeTruthy();
  });

  it("says Open, not Review, for a listing already decided, and shows when it expires", () => {
    h.useAdminListings.mockReturnValue({
      data: {
        ...page([row({ moderationStatus: "APPROVED", publicationStatus: "ACTIVE", expiresAt: "2027-01-15T00:00:00Z" })]),
        counts: COUNTS,
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<ListingsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Approved/ }));
    expect(screen.getByRole("link", { name: "Open Bright room near campus" })).toBeTruthy();
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.getByText(/2027/)).toBeTruthy();
  });

  it("asks for the chosen status from the first page", () => {
    render(<ListingsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Rejected/ }));
    expect(h.useAdminListings).toHaveBeenLastCalledWith(expect.objectContaining({ status: "REJECTED", page: 1 }));
  });

  it("explains an empty queue", () => {
    h.useAdminListings.mockReturnValue({
      data: { ...page([]), counts: {} },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<ListingsPage />);
    expect(screen.getByText("Nothing waiting for review")).toBeTruthy();
  });

  it("shows an error with a retry", () => {
    const refetch = vi.fn();
    h.useAdminListings.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<ListingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

const detail = (over = {}) => ({
  id: "l1",
  title: "Bright room near campus",
  description: "A clean, quiet room.",
  propertyId: "p1",
  unitId: "u1",
  rentAmount: 50000,
  currency: "NGN",
  paymentFrequency: "ANNUALLY",
  cautionFee: 10000,
  agencyFee: 5000,
  agreementFee: 0,
  otherCharges: 0,
  totalUpfrontCost: 65000,
  moderationStatus: "PENDING_APPROVAL",
  publicationStatus: "UNPUBLISHED",
  availabilityStatus: "AVAILABLE",
  rejectionReason: null,
  submittedAt: "2026-12-01T10:00:00Z",
  approvedAt: null,
  expiresAt: null,
  lastAvailabilityConfirmedAt: null,
  unit: { id: "u1", unitName: "Room 4", unitType: "Single room" },
  property: { id: "p1", title: "Green Court", city: "Ugbokolo", state: "Benue" },
  media: [{ id: "m1", mediaId: "x", url: "https://img.example/1.jpg", caption: "Front" }],
  amenities: [{ id: "am1", name: "Security" }],
  subscription: { id: "s1", status: "PENDING_APPROVAL", amount: 2000, autoRenew: true, endsAt: null },
  agentId: "a1",
  agent: { id: "a1", name: "Obi Homes", fullName: "Ada Obi", status: "APPROVED" },
  location: {
    address: "12 Secret Street",
    neighbourhood: "Behind the market",
    landmark: "Near the church",
    latitude: 7.0123,
    longitude: 8.0456,
  },
  createdAt: "2026-11-30T10:00:00Z",
  updatedAt: "2026-12-01T10:00:00Z",
  ...over,
});

function show(over = {}) {
  h.useAdminListing.mockReturnValue({ data: detail(over), isPending: false, isError: false, refetch: vi.fn() });
}

describe("listing review page", () => {
  beforeEach(() => {
    h.admin = { role: "ADMIN", permissions: ["accommodation.listings.moderate"] };
    for (const m of [h.approve, h.reject, h.suspend, h.restore]) {
      m.mutateAsync.mockReset();
      m.mutateAsync.mockResolvedValue({});
    }
    show();
  });

  it("gives the moderator everything needed to judge it, including the private address", () => {
    render(<ListingPage />);
    expect(screen.getByRole("heading", { name: "Bright room near campus" })).toBeTruthy();
    expect(screen.getByText("12 Secret Street")).toBeTruthy();
    expect(screen.getByText(/The street address is private/)).toBeTruthy();
    expect(screen.getByText("Near the church")).toBeTruthy();
    expect(screen.getByText("A clean, quiet room.")).toBeTruthy();
    expect(screen.getByText("Security")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Front" }).getAttribute("src")).toBe("https://img.example/1.jpg");
    expect(screen.getByRole("link", { name: /Check the map point/ }).getAttribute("href")).toContain("mlat=7.0123&mlon=8.0456");
  });

  it("breaks the cost down and totals it in naira", () => {
    render(<ListingPage />);
    const charges = within(screen.getByRole("region", { name: "Charges" }));
    expect(charges.getByText("Rent")).toBeTruthy();
    expect(charges.getByText("(per year)")).toBeTruthy();
    expect(charges.getByText(/50,000/)).toBeTruthy();
    expect(charges.getByText(/10,000/)).toBeTruthy();
    expect(charges.getByText("Total up front")).toBeTruthy();
    expect(charges.getByText(/65,000/)).toBeTruthy();
  });

  it("links to the agent, and shows the subscription and that the paid month has not started", () => {
    render(<ListingPage />);
    expect(screen.getByRole("link", { name: /agent's application and listing history/ }).getAttribute("href")).toBe(
      "/admin/accommodation/agents/a1"
    );
    expect(screen.getByText("Starts when approved")).toBeTruthy();
    expect(screen.getByText(/Approving puts it on the site and starts the paid month today/)).toBeTruthy();
  });

  it("warns that rejecting a paid first submission refunds the agent", () => {
    render(<ListingPage />);
    expect(screen.getByText(/Rejecting marks the agent's .*2,000.* payment for refund/)).toBeTruthy();
  });

  it("does not mention a refund when nothing was paid", () => {
    show({ subscription: { id: "s1", status: "PENDING_APPROVAL", amount: 0, autoRenew: false, endsAt: null } });
    render(<ListingPage />);
    expect(screen.queryByText(/payment for refund/)).toBeNull();
    expect(screen.getByText("Free")).toBeTruthy();
  });

  it("explains that a re-review keeps the running period", () => {
    show({ subscription: { id: "s1", status: "ACTIVE", amount: 2000, autoRenew: true, endsAt: "2027-01-10T00:00:00Z" } });
    render(<ListingPage />);
    expect(screen.getByText(/The paid period carries on/)).toBeTruthy();
    expect(screen.queryByText(/starts the paid month today/)).toBeNull();
  });

  it("approves in one click", async () => {
    render(<ListingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Approve listing" }));
    await waitFor(() => expect(h.approve.mutateAsync).toHaveBeenCalledWith("l1"));
  });

  it("will not let a listing be approved when its agent is not in good standing, and says why", () => {
    show({ agent: { id: "a1", name: "Obi Homes", fullName: "Ada Obi", status: "SUSPENDED" } });
    render(<ListingPage />);
    expect((screen.getByRole("button", { name: "Approve listing" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/This agent is suspended, so the listing cannot be approved/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Reject" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("rejects only with a reason, and the dialog says a paid first submission is refunded", async () => {
    render(<ListingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = within(screen.getByRole("alertdialog"));
    expect(dialog.getByText(/payment is marked for refund/)).toBeTruthy();
    const confirm = dialog.getByRole("button", { name: "Reject listing" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(dialog.getByLabelText("Reason shown to the agent"), {
      target: { value: "Photos do not show this room" },
    });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(h.reject.mutateAsync).toHaveBeenCalledWith({ id: "l1", reason: "Photos do not show this room" })
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("offers suspend for an approved listing, with a reason", async () => {
    show({ moderationStatus: "APPROVED", publicationStatus: "ACTIVE" });
    render(<ListingPage />);
    expect(screen.queryByRole("button", { name: "Approve listing" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Suspend/ }));
    const dialog = within(screen.getByRole("alertdialog"));
    fireEvent.change(dialog.getByLabelText("Reason shown to the agent"), { target: { value: "Reported as misleading" } });
    fireEvent.click(dialog.getByRole("button", { name: "Suspend listing" }));
    await waitFor(() => expect(h.suspend.mutateAsync).toHaveBeenCalledWith({ id: "l1", reason: "Reported as misleading" }));
  });

  it("offers restore for a suspended listing, and shows why it was taken down", async () => {
    show({ moderationStatus: "ADMIN_SUSPENDED", publicationStatus: "HIDDEN", rejectionReason: "Reported as misleading" });
    render(<ListingPage />);
    expect(screen.getByText(/Reported as misleading/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restore listing" }));
    await waitFor(() => expect(h.restore.mutateAsync).toHaveBeenCalledWith("l1"));
  });

  it("has nothing to decide on a draft or a rejected listing, and shows the rejection reason", () => {
    show({ moderationStatus: "REJECTED", rejectionReason: "Rent does not match the photos" });
    const { unmount } = render(<ListingPage />);
    expect(screen.getByText(/Rent does not match the photos/)).toBeTruthy();
    expect(screen.getByText(/Waiting for the agent to fix it/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve listing" })).toBeNull();
    unmount();
    show({ moderationStatus: "DRAFT" });
    render(<ListingPage />);
    expect(screen.getByText(/This is a draft/)).toBeTruthy();
  });

  it("shows the backend's explanation when a decision is refused", async () => {
    h.approve.mutateAsync.mockRejectedValue(new Error("The agent is not in good standing."));
    render(<ListingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Approve listing" }));
    expect((await screen.findByRole("alert")).textContent).toContain("The agent is not in good standing.");
  });

  it("hides every decision from an admin without the moderate permission, but not the listing", () => {
    h.admin = { role: "ADMIN", permissions: ["accommodation.read"] };
    render(<ListingPage />);
    expect(screen.getByText("12 Secret Street")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve listing" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Decisions" })).toBeNull();
  });

  it("copes with a listing that has no photos, no map point and no agent", () => {
    show({ media: [], location: { address: null, neighbourhood: null, landmark: null, latitude: null, longitude: null }, agent: null });
    render(<ListingPage />);
    expect(screen.getByText("No photos.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Check the map point/ })).toBeNull();
    expect(screen.getByText("Agent not found.")).toBeTruthy();
  });

  it("shows loading and error states, with retry", () => {
    h.useAdminListing.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    const { unmount } = render(<ListingPage />);
    expect(screen.queryByRole("heading", { name: "Bright room near campus" })).toBeNull();
    unmount();
    const refetch = vi.fn();
    h.useAdminListing.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<ListingPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
