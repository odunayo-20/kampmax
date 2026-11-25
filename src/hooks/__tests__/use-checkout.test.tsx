import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  replace: vi.fn(),
  clearCart: vi.fn(),
  cancel: vi.fn(),
  placeOrders: vi.fn(),
}));

const items = [
  { id: "line-1", vendorId: "v1", quantity: 1, unitPrice: 200000, product: { id: "p1", title: "Phone", price: 200000 } },
];
const user = { id: "u1" };
const campus = { id: "c1", name: "Rugipo" };
const address = { id: "a1", label: "Block 6", address: "Block 6", contactName: "Ada Obi", contactPhone: "08012345678", isDefault: true };
const noMutation = { mutateAsync: vi.fn() };
const addresses = { data: [address] };

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/lib/cart-context", () => ({ useCart: () => ({ items, clearCart: mocks.clearCart }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ status: "authenticated", user }) }));
vi.mock("@/lib/app-context", () => ({ useApp: () => ({ selectedCampus: campus, setSelectedCampus: vi.fn() }) }));
vi.mock("@/lib/api-client", () => ({ apiClient: { post: mocks.post, get: vi.fn() } }));
vi.mock("@/hooks/use-addresses", () => ({
  useAddresses: () => addresses,
  useCreateAddress: () => noMutation,
  useUpdateAddress: () => noMutation,
  useDeleteAddress: () => noMutation,
}));
vi.mock("@/hooks/use-vendor-cache", () => ({ useEnsureVendors: () => true }));
vi.mock("@/services/wallet", () => ({ fetchMyWalletBalance: async () => ({ balance: 1_000_000 }) }));
vi.mock("@/services/users", () => ({
  getVendorById: () => ({ storeName: "Mecbill" }),
  getCurrentUser: () => ({ id: "u1", name: "Ada Obi", email: "ada@example.com", phone: "08012345678" }),
}));
vi.mock("@/services/orders", () => ({
  checkoutOrdersApi: mocks.placeOrders,
  cancelUnpaidOrders: mocks.cancel,
  fetchDeliveryOffers: async () => ({}),
}));

import { useCheckout } from "../useCheckout";

const apiError = (status: number, message: string) => Object.assign(new Error(message), { status });
const placed = { data: [{ backendId: "order-1" }], error: null };

async function ready() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCheckout(), { wrapper });
  await waitFor(() => expect(result.current.summary).not.toBeNull());
  await waitFor(() => expect(result.current.walletBalance).toBeDefined());
  return result;
}

const submit = (result: Awaited<ReturnType<typeof ready>>) => act(() => result.current.placeOrder());

describe("useCheckout", () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("location", { origin: "https://app.test", assign });
  });

  it("never shows raw server text, and a retry sends a new request", async () => {
    mocks.placeOrders.mockResolvedValue({ data: [], error: apiError(500, "Internal server error") });
    const result = await ready();

    await submit(result);
    expect(result.current.error).toBe("Something went wrong on our end. Please try again.");
    expect(result.current.phase).toBe("failed");
    expect(result.current.isBusy).toBe(false);

    mocks.placeOrders.mockResolvedValue(placed);
    mocks.post.mockResolvedValue({ data: { status: "PENDING", reference: "r", authorizationUrl: "https://pay.test/x" }, error: null });
    await submit(result);
    expect(mocks.placeOrders).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(assign).toHaveBeenCalledWith("https://pay.test/x");
  });

  it("shows the server's reason when it refuses the order", async () => {
    mocks.placeOrders.mockResolvedValue({ data: [], error: apiError(400, "Orders are paused on Rugipo") });
    const result = await ready();
    await submit(result);
    expect(result.current.error).toBe("Orders are paused on Rugipo");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("cancels the order and frees the button when Paystack cannot start", async () => {
    mocks.placeOrders.mockResolvedValue(placed);
    mocks.post.mockResolvedValue({ data: {}, error: apiError(400, "Payment initialization failed") });
    const result = await ready();

    await submit(result);
    expect(mocks.cancel).toHaveBeenCalledWith(["order-1"]);
    expect(result.current.phase).toBe("failed");
    expect(result.current.error).toBe("Payment initialization failed. Your order was not placed and you have not been charged.");
    expect(assign).not.toHaveBeenCalled();
  });

  it("does not promise 'not charged' when a wallet payment's outcome is unknown", async () => {
    mocks.placeOrders.mockResolvedValue(placed);
    mocks.post.mockResolvedValue({ data: {}, error: apiError(500, "Internal server error") });
    const result = await ready();

    act(() => result.current.setPaymentMethod("wallet"));
    await submit(result);
    expect(result.current.error).toContain("Check My Orders before trying again.");
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });

  it("goes to the order after a wallet payment", async () => {
    mocks.placeOrders.mockResolvedValue(placed);
    mocks.post.mockResolvedValue({ data: { status: "SUCCESS", orderId: "order-1" }, error: null });
    const result = await ready();

    act(() => result.current.setPaymentMethod("wallet"));
    await submit(result);
    expect(mocks.clearCart).toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith("/orders/order-1");
    expect(result.current.phase).toBe("leaving");
  });
});
