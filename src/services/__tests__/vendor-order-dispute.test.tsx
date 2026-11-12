// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mapVendorOrderDetail, type BackendVendorOrderDetail } from "../vendor-orders-api";
import { DisputePanel } from "@/components/vendor-orders/OrderStatusPanels";
import { a11yViolations } from "@/test/axe";

vi.setConfig({ testTimeout: 30_000 });
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api-client", () => ({ apiClient: {} }));

afterEach(cleanup);

const raw = (over: Partial<BackendVendorOrderDetail> = {}): BackendVendorOrderDetail =>
  ({
    id: "o-1",
    orderNumber: "KMP-1001",
    vendorId: "v-1",
    vendorName: "Lamps R Us",
    customerName: "Ada Obi",
    customerPhone: "0801",
    status: "SHIPPED",
    subtotal: 4000,
    deliveryFee: 500,
    totalAmount: 4500,
    platformFee: 200,
    vendorPayout: 4300,
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-02T10:00:00Z",
    notes: null,
    paymentStatus: "SUCCESS",
    items: [],
    address: { address: "Hall 3", city: "Ibadan", campus: null, locationNote: null },
    statusHistory: [],
    settledAt: null,
    dispute: null,
    ...over,
  }) as BackendVendorOrderDetail;

describe("vendor order mapping: disputes", () => {
  it("shows no dispute when there is none", () => {
    expect(mapVendorOrderDetail(raw()).dispute.status).toBe("none");
  });

  it("maps an open dispute, and marks the escrow as on hold", () => {
    const order = mapVendorOrderDetail(
      raw({ dispute: { openedAt: "2026-11-03T09:00:00Z", reason: "Item is damaged", resolvedAt: null, resolution: null } })
    );
    expect(order.dispute).toMatchObject({ status: "opened", reason: "Item is damaged", openedAt: "2026-11-03T09:00:00Z" });
    expect(order.escrow.state).toBe("funds_held");
    expect(order.escrow.note).toMatch(/on hold/i);
  });

  it("an open dispute outranks 'settled' wording: nothing says the money was released", () => {
    const order = mapVendorOrderDetail(
      raw({ dispute: { openedAt: "2026-11-03T09:00:00Z", reason: "x", resolvedAt: null, resolution: null } })
    );
    expect(order.escrow.note).not.toMatch(/released/i);
  });

  it("maps a reviewed dispute with the outcome, and releases the hold wording", () => {
    const order = mapVendorOrderDetail(
      raw({
        status: "DELIVERED",
        settledAt: "2026-11-05T09:00:00Z",
        dispute: {
          openedAt: "2026-11-03T09:00:00Z",
          reason: "Item is damaged",
          resolvedAt: "2026-11-04T09:00:00Z",
          resolution: "No grounds",
        },
      })
    );
    expect(order.dispute.status).toBe("resolved");
    expect(order.dispute.timeline[0]).toMatchObject({ role: "support", detail: "No grounds" });
    expect(order.escrow.state).toBe("released");
  });
});

describe("DisputePanel (vendor view)", () => {
  const open = () =>
    mapVendorOrderDetail(
      raw({ dispute: { openedAt: "2026-11-03T09:00:00Z", reason: "Item is damaged", resolvedAt: null, resolution: null } })
    );

  it("renders nothing without a dispute", () => {
    const { container } = render(<DisputePanel order={mapVendorOrderDetail(raw())} />);
    expect(container.innerHTML).toBe("");
  });

  it("says the payout is on hold and who decides", () => {
    render(<DisputePanel order={open()} />);
    expect(screen.getByRole("status").textContent).toMatch(/payout on hold/i);
    expect(screen.getByRole("status").textContent).toMatch(/Trust & Safety/);
    expect(screen.getByText(/Item is damaged/)).toBeTruthy();
  });

  it("never offers a fake approve-refund or reject action", () => {
    render(<DisputePanel order={open()} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.body.textContent).not.toMatch(/approve refund|reject dispute|respond to dispute/i);
  });

  it("points the vendor at support with the order reference to send evidence", () => {
    render(<DisputePanel order={open()} />);
    expect(screen.getByRole("link", { name: /send it to support/i }).getAttribute("href")).toBe("/vendor/support");
    expect(document.body.textContent).toContain("KMP-1001");
  });

  it("passes the axe checks, open and reviewed", async () => {
    const { container, unmount } = render(<DisputePanel order={open()} />);
    expect(await a11yViolations(container)).toEqual([]);
    unmount();
    const reviewed = mapVendorOrderDetail(
      raw({ dispute: { openedAt: "2026-11-03T09:00:00Z", reason: "x", resolvedAt: "2026-11-04T09:00:00Z", resolution: "Refunded" } })
    );
    const second = render(<DisputePanel order={reviewed} />);
    expect(await a11yViolations(second.container)).toEqual([]);
  });
});
