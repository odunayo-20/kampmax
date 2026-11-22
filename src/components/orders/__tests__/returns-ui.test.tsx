// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { moveReturnApi, answerVendorReturn, moveVendorReturn } = vi.hoisted(() => ({
  moveReturnApi: vi.fn(),
  answerVendorReturn: vi.fn(),
  moveVendorReturn: vi.fn(),
}));
vi.mock("@/services/orders", () => ({ moveReturnApi }));
vi.mock("@/services/vendor-orders-api", () => ({ answerVendorReturn, moveVendorReturn }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { BuyerReturnCard } from "../BuyerReturnCard";
import { VendorReturnPanel } from "@/components/vendor-orders/VendorReturnPanel";
import type { ReturnRequest } from "@/lib/returns";
import type { Order } from "@/types";
import type { VendorOrder } from "@/types/vendor-orders";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const soon = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const request = (over: Partial<ReturnRequest> = {}): ReturnRequest => ({
  id: "r1",
  status: "REQUESTED",
  reason: "Damaged, defective or broken",
  statement: "Cracked",
  items: [{ orderItemId: "i1", productName: "Lamp", quantity: 1 }],
  requestedAmount: 1800,
  offeredAmount: null,
  refundedAmount: null,
  vendorNote: null,
  deadlineAt: soon(40),
  createdAt: new Date().toISOString(),
  resolvedAt: null,
  ...over,
});
const order = (over: Partial<Order> = {}) =>
  ({ id: "KMP-1", backendId: "o-uuid", status: "delivered", settled: false, returnWindowEndsAt: soon(30), returnRequest: null, ...over }) as Order;

describe("BuyerReturnCard", () => {
  it("offers the way in while the window is open, and nothing after", () => {
    const { rerender } = render(<BuyerReturnCard order={order()} onChange={vi.fn()} />);
    expect(screen.getByRole("link", { name: /ask for a refund/i }).getAttribute("href")).toBe("/orders/KMP-1/return");
    rerender(<BuyerReturnCard order={order({ returnWindowEndsAt: soon(-1) })} onChange={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /ask for a refund/i })).toBeNull();
  });

  it("asks before taking an offer, then shows the updated order", async () => {
    const updated = order({ returnRequest: request({ status: "REFUNDED", refundedAmount: 900 }) });
    moveReturnApi.mockResolvedValue({ data: updated, error: null });
    const onChange = vi.fn();
    render(<BuyerReturnCard order={order({ returnRequest: request({ status: "OFFERED", offeredAmount: 900 }) })} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept the offer" }));
    expect(moveReturnApi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Accept offer" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated));
    expect(moveReturnApi).toHaveBeenCalledWith("o-uuid", "accept-offer");
  });

  it("says so when a step fails", async () => {
    moveReturnApi.mockResolvedValue({ data: null, error: { message: "This request has just changed." } });
    render(<BuyerReturnCard order={order({ returnRequest: request() })} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw request" }));
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/just changed/);
  });
});

describe("VendorReturnPanel", () => {
  const wrap = (ui: ReactNode) =>
    render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
  const vendorOrder = (over: Partial<ReturnRequest> = {}) => ({ id: "o-uuid", returnRequest: request(over) }) as VendorOrder;

  it("checks an offer before sending it", async () => {
    answerVendorReturn.mockResolvedValue(vendorOrder({ status: "OFFERED", offeredAmount: 1000 }));
    wrap(<VendorReturnPanel order={vendorOrder()} />);

    fireEvent.click(screen.getByRole("button", { name: "Offer a smaller refund" }));
    fireEvent.change(screen.getByLabelText(/your offer/i), { target: { value: "1800" } });
    fireEvent.click(screen.getByRole("button", { name: "Send offer" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/less than/);
    expect(answerVendorReturn).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/your offer/i), { target: { value: "1,000" } });
    fireEvent.click(screen.getByRole("button", { name: "Send offer" }));
    await waitFor(() => expect(answerVendorReturn).toHaveBeenCalledWith("o-uuid", { action: "offer", amount: 1000 }));
  });

  it("needs a reason to decline", async () => {
    wrap(<VendorReturnPanel order={vendorOrder()} />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/why/);
    expect(answerVendorReturn).not.toHaveBeenCalled();
  });

  it("confirms the items are back before refunding", async () => {
    moveVendorReturn.mockResolvedValue(vendorOrder({ status: "REFUNDED", refundedAmount: 1800 }));
    wrap(<VendorReturnPanel order={vendorOrder({ status: "AWAITING_RETURN" })} />);
    fireEvent.click(screen.getByRole("button", { name: "I have the items back" }));
    expect(moveVendorReturn).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "I have the items back" }).at(-1)!);
    await waitFor(() => expect(moveVendorReturn).toHaveBeenCalledWith("o-uuid", "received"));
  });
});
