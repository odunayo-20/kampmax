import { beforeEach, describe, expect, it, vi } from "vitest";

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: { patch } }));

import { createApiOrderManagementService } from "../admin/order-management.api";

describe("admin dispute ruling", () => {
  const service = createApiOrderManagementService();
  beforeEach(() => {
    patch.mockReset();
    patch.mockResolvedValue({ data: { id: "KMP-1" }, error: null });
  });

  it("sends a refund amount for a delivered order or refund request", async () => {
    await service.resolveDispute("KMP-1", "refund", " Half was broken ", 1500);
    expect(patch).toHaveBeenCalledWith("/admin/orders/KMP-1/dispute/resolve", {
      outcome: "refund",
      note: "Half was broken",
      amount: 1500,
    });
  });

  it("leaves the amount to the server when it is blank, and never sends one to dismiss", async () => {
    await service.resolveDispute("KMP-1", "refund", "Upheld");
    await service.resolveDispute("KMP-1", "dismiss", "No grounds", 1500);
    expect(patch.mock.calls[0][1]).toEqual({ outcome: "refund", note: "Upheld" });
    expect(patch.mock.calls[1][1]).toEqual({ outcome: "dismiss", note: "No grounds" });
  });

  it("refuses a zero or unreadable amount before calling the server", async () => {
    await expect(service.resolveDispute("KMP-1", "refund", "Upheld", 0)).rejects.toThrow(/above zero/);
    await expect(service.resolveDispute("KMP-1", "refund", "Upheld", Number.NaN)).rejects.toThrow(/above zero/);
    expect(patch).not.toHaveBeenCalled();
  });
});
