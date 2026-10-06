import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: (...a: unknown[]) => post(...a) },
}));

import { submitWithdrawal } from "../wallet";

const payload = {
  amount: 5000,
  destination: { bankCode: "058", accountNumber: "0123456789", accountName: "Chi Okafor" },
};

beforeEach(() => vi.clearAllMocks());

describe("submitWithdrawal", () => {
  it("posts the amount and the real destination", async () => {
    post.mockResolvedValue({
      data: { id: "tx-1", type: "WITHDRAWAL", status: "PENDING", amount: 5000, direction: "DEBIT", createdAt: new Date().toISOString() },
      error: null,
    });
    const tx = await submitWithdrawal(payload);
    expect(post).toHaveBeenCalledWith("/wallet/withdraw", payload);
    expect(tx.id).toBe("tx-1");
  });

  it("throws the server's message instead of pretending it worked", async () => {
    post.mockResolvedValue({ data: null, error: { message: "Insufficient balance", status: 400 } });
    await expect(submitWithdrawal(payload)).rejects.toThrow(/Insufficient balance/);
  });
});
