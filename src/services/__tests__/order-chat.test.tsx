// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { post, push } = vi.hoisted(() => ({ post: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: { post } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { MessageCustomerButton } from "@/components/messages/MessageCustomerButton";
import { mapVendorOrderDetail, type BackendVendorOrderDetail } from "../vendor-orders-api";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const detail = (over: Partial<BackendVendorOrderDetail> = {}): BackendVendorOrderDetail =>
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
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-02T10:00:00Z",
    notes: null,
    paymentStatus: "SUCCESS",
    items: [],
    address: { address: "Hall 3", city: "Ibadan", campus: null, locationNote: null },
    statusHistory: [],
    ...over,
  }) as BackendVendorOrderDetail;

describe("vendor order: who the buyer is", () => {
  it("keeps the buyer's user id so the store can message them", () => {
    expect(mapVendorOrderDetail(detail({ customerId: "buyer-9" })).customer.buyerId).toBe("buyer-9");
  });

  it("leaves it empty (no message button) when an older server leaves it out", () => {
    expect(mapVendorOrderDetail(detail()).customer.buyerId).toBe("");
  });
});

describe("MessageCustomerButton", () => {
  it("opens the store thread with that customer and goes to it", async () => {
    post.mockResolvedValue({ data: { id: "conv-7" }, error: null });
    render(<MessageCustomerButton customerId="buyer-9" />);

    fireEvent.click(screen.getByRole("button", { name: /message customer/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/chat/conv-7"));
    expect(post).toHaveBeenCalledWith("/conversations", { type: "VENDOR", customerId: "buyer-9" });
  });

  it("says so when the chat can't be opened, and stays usable", async () => {
    post.mockResolvedValue({ data: null, error: { message: "Forbidden", status: 403 } });
    render(<MessageCustomerButton customerId="buyer-9" />);

    fireEvent.click(screen.getByRole("button", { name: /message customer/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't open the chat/i);
    expect((screen.getByRole("button", { name: /message customer/i }) as HTMLButtonElement).disabled).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });
});
